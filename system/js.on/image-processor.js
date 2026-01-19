// Lightweight custom image processor module
// Exports: analyzeImage(fileOrBlobOrDataUrl, options)
// Features: thumbnail generation, dominant colors (kmeans), edge detection, simple chart detection (projection peaks), text region detection (connected components), naive numeric OCR template matching

export async function analyzeImage(input, options = {}) {
    const opts = Object.assign({
        maxThumbnailWidth: 800,
        thumbnailQuality: 0.85,
        samplePixels: 2000,
        kColors: 3,
        detectCharts: true,
        detectText: true,
        numericOCR: true,
        maxImageArea: 4000 * 4000 // safety guard
    }, options || {});

    const blob = await _toBlob(input);
    const img = await _loadImageFromBlob(blob);

    const metadata = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        size: blob.size || 0
    };

    // Safety check: too large images can stall CPU; scale down for processing if very large
    const scale = Math.min(1, Math.max(1, Math.sqrt((opts.maxImageArea) / (metadata.width * metadata.height))));

    // Canvas for processing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Determine processing size
    const procW = Math.max(128, Math.round(img.naturalWidth * Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight))));
    const procH = Math.round(img.naturalHeight * (procW / img.naturalWidth));

    canvas.width = procW;
    canvas.height = procH;
    ctx.drawImage(img, 0, 0, procW, procH);

    // Thumbnail generation (keeping aspect ratio)
    const thumbnail = _createThumbnail(img, opts.maxThumbnailWidth, opts.thumbnailQuality);

    // Dominant colors via k-means on sampled pixels
    const dominantColors = _getDominantColors(ctx, procW, procH, opts.kColors, opts.samplePixels);

    // Edge detection (Sobel) -> compute projection profiles and chart heuristics
    const imageData = ctx.getImageData(0, 0, procW, procH);
    const gray = _toGrayscale(imageData);
    const edgeData = _sobelEdgeMap(gray, procW, procH);
    const projection = _projectionProfile(edgeData, procW, procH);

    const chartDetected = opts.detectCharts ? _detectChartFromProjection(projection, procW, procH) : false;

    // Text region detection (connected components on binary image)
    let textRegions = [];
    if (opts.detectText) {
        const binary = _binarizeImage(gray, procW, procH);
        textRegions = _detectTextRegions(binary, procW, procH);
    }

    // Naive numeric OCR using template matching on detected text regions (best-effort)
    let numericOCR = null;
    if (opts.numericOCR && textRegions.length > 0) {
        try {
            numericOCR = _runNaiveNumericOCR(canvas, textRegions);
        } catch (e) {
            numericOCR = null;
        }
    }

    const analysisSummary = `Detected ${chartDetected ? 'chart-like elements' : 'no chart-like elements'}. ${textRegions.length} text regions found. Top colors: ${dominantColors.join(', ')}${numericOCR && numericOCR.length ? '. Numeric samples: ' + numericOCR.slice(0,3).join(', ') : ''}`;

    return {
        thumbnail,
        metadata,
        dominantColors,
        projectionProfile: projection,
        chartDetected,
        textRegions,
        numericOCR,
        analysisSummary
    };
}

// Helpers
async function _toBlob(input) {
    if (!input) throw new Error('No input');
    if (input instanceof Blob) return input;
    if (input instanceof File) return input;
    if (typeof input === 'string') {
        // data URL or URL
        if (input.startsWith('data:')) {
            // convert dataURL to blob
            const res = await fetch(input);
            return await res.blob();
        } else {
            // remote URL: fetch via fetch (must be proxied by caller if needed)
            const res = await fetch(input);
            return await res.blob();
        }
    }
    // Fallback: try to create blob
    throw new Error('Unsupported input type');
}

function _loadImageFromBlob(blob) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };
        img.src = url;
    });
}

function _createThumbnail(img, maxWidth, quality) {
    const ratio = img.naturalWidth / img.naturalHeight;
    const w = Math.min(maxWidth, img.naturalWidth);
    const h = Math.round(w / ratio);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    try {
        return c.toDataURL('image/webp', quality);
    } catch (e) {
        return c.toDataURL('image/png');
    }
}

function _getDominantColors(ctx, w, h, k = 3, sampleCount = 2000) {
    const imageData = ctx.getImageData(0, 0, w, h).data;
    const pixels = [];
    const step = Math.max(1, Math.floor((w * h) / sampleCount));

    for (let i = 0, idx = 0; i < w * h; i += step, idx += 1) {
        const p = i * 4;
        const r = imageData[p];
        const g = imageData[p + 1];
        const b = imageData[p + 2];
        pixels.push([r, g, b]);
    }

    const centers = _kmeans(pixels, k, 8);
    const hexCenters = centers.map(c => _rgbToHex(c[0], c[1], c[2]));
    return hexCenters;
}

// k-means (simple, small k and few iterations)
function _kmeans(data, k = 3, iterations = 5) {
    if (!data || data.length === 0) return [];
    // Random init
    const centers = [];
    const n = data.length;
    for (let i = 0; i < k; i++) {
        centers.push(data[Math.floor(Math.random() * n)].slice());
    }
    const labels = new Array(n);

    for (let iter = 0; iter < iterations; iter++) {
        // assign
        for (let i = 0; i < n; i++) {
            let best = 0;
            let bestDist = Infinity;
            for (let j = 0; j < k; j++) {
                const d = _sqDist(data[i], centers[j]);
                if (d < bestDist) { bestDist = d; best = j; }
            }
            labels[i] = best;
        }
        // update
        const sums = new Array(k).fill(0).map(() => [0,0,0]);
        const counts = new Array(k).fill(0);
        for (let i = 0; i < n; i++) {
            const l = labels[i];
            const p = data[i];
            sums[l][0] += p[0]; sums[l][1] += p[1]; sums[l][2] += p[2];
            counts[l]++;
        }
        for (let j = 0; j < k; j++) {
            if (counts[j] > 0) {
                centers[j][0] = Math.round(sums[j][0] / counts[j]);
                centers[j][1] = Math.round(sums[j][1] / counts[j]);
                centers[j][2] = Math.round(sums[j][2] / counts[j]);
            }
        }
    }
    return centers;
}

function _sqDist(a, b) {
    const dr = a[0] - b[0];
    const dg = a[1] - b[1];
    const db = a[2] - b[2];
    return dr*dr + dg*dg + db*db;
}

function _rgbToHex(r,g,b) {
    return '#' + [r,g,b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function _toGrayscale(imageData) {
    const gray = new Uint8ClampedArray(imageData.width * imageData.height);
    const data = imageData.data;
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        const r = data[i], g = data[i+1], b = data[i+2];
        gray[j] = Math.round(0.299*r + 0.587*g + 0.114*b);
    }
    gray.width = imageData.width;
    gray.height = imageData.height;
    return gray;
}

function _sobelEdgeMap(gray, w, h) {
    const out = new Float32Array(w * h);
    const gx = [-1,0,1,-2,0,2,-1,0,1];
    const gy = [-1,-2,-1,0,0,0,1,2,1];

    for (let y = 1; y < h-1; y++) {
        for (let x = 1; x < w-1; x++) {
            let sx = 0, sy = 0, idx = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++, idx++) {
                    const v = gray[(y+ky)*w + (x+kx)];
                    sx += gx[idx] * v;
                    sy += gy[idx] * v;
                }
            }
            out[y*w + x] = Math.hypot(sx, sy);
        }
    }
    return { data: out, width: w, height: h };
}

function _projectionProfile(edgeMap, w, h) {
    const rowSum = new Float32Array(h);
    const colSum = new Float32Array(w);
    const d = edgeMap.data;
    for (let y=0; y<h; y++) {
        let rs = 0;
        for (let x=0; x<w; x++) {
            const v = d[y*w + x];
            rs += v;
            colSum[x] += v;
        }
        rowSum[y] = rs;
    }
    return { rowSum, colSum, width: w, height: h };
}

function _detectChartFromProjection(proj, w, h) {
    // Look for strong peaks in row/col projections (axes/gridlines)
    const rowMean = _mean(proj.rowSum);
    const colMean = _mean(proj.colSum);
    const rowPeaks = proj.rowSum.reduce((acc, v) => acc + (v > rowMean*3 ? 1 : 0), 0);
    const colPeaks = proj.colSum.reduce((acc, v) => acc + (v > colMean*3 ? 1 : 0), 0);
    // Heuristic: chart if many peaks in at least one direction
    return (rowPeaks > Math.max(2, h * 0.01) || colPeaks > Math.max(2, w * 0.01));
}

function _mean(arr) {
    let s=0; for (let i=0;i<arr.length;i++) s+=arr[i]; return s/arr.length;
}

function _binarizeImage(gray, w, h) {
    // Otsu-like threshold approximation: use mean brightness as threshold
    const mean = _mean(gray);
    const bin = new Uint8ClampedArray(w*h);
    for (let i=0;i<w*h;i++) bin[i] = gray[i] < mean ? 1 : 0; // foreground = dark
    bin.width = w; bin.height = h;
    return bin;
}

function _detectTextRegions(binary, w, h) {
    // Connected components (4-connected) - find bounding boxes of components
    const visited = new Uint8Array(w*h);
    const boxes = [];
    const dirs = [-1,1,-w,w];
    for (let i=0;i<w*h;i++) {
        if (binary[i] && !visited[i]) {
            // BFS
            const queue = [i];
            visited[i] = 1;
            let minX = w, minY = h, maxX = 0, maxY = 0, count = 0;
            while (queue.length) {
                const idx = queue.shift();
                const y = Math.floor(idx / w);
                const x = idx % w;
                count++;
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
                // neighbors
                const nx = x+1; const px = x-1; const ny = y+1; const py = y-1;
                if (nx < w) { const ni = idx+1; if (binary[ni] && !visited[ni]) { visited[ni]=1; queue.push(ni);} }
                if (px >= 0) { const ni = idx-1; if (binary[ni] && !visited[ni]) { visited[ni]=1; queue.push(ni);} }
                if (ny < h) { const ni = idx+w; if (binary[ni] && !visited[ni]) { visited[ni]=1; queue.push(ni);} }
                if (py >= 0) { const ni = idx-w; if (binary[ni] && !visited[ni]) { visited[ni]=1; queue.push(ni);} }
            }
            const boxW = maxX - minX + 1;
            const boxH = maxY - minY + 1;
            const area = boxW * boxH;
            // heuristics to filter tiny specks
            if (area > 30 && boxH < h * 0.8) {
                boxes.push({ x: minX, y: minY, w: boxW, h: boxH, area, ratio: boxW/boxH });
            }
        }
    }
    return boxes;
}

// Very naive digit template matching for numeric OCR in charts (best-effort for axis labels/numbers)
function _runNaiveNumericOCR(canvas, textRegions) {
    // Prepare templates (digits 0-9) drawn into a small canvas
    const tplSize = 32;
    const tplCanvas = document.createElement('canvas'); tplCanvas.width = tplSize; tplCanvas.height = tplSize; const tctx = tplCanvas.getContext('2d');
    const templates = [];
    tctx.fillStyle = '#fff'; tctx.fillRect(0,0,tplSize,tplSize);
    tctx.fillStyle = '#000'; tctx.textBaseline = 'middle'; tctx.textAlign = 'center'; tctx.font = '20px sans-serif';
    for (let d=0; d<=9; d++) {
        tctx.clearRect(0,0,tplSize,tplSize);
        tctx.fillStyle = '#fff'; tctx.fillRect(0,0,tplSize,tplSize);
        tctx.fillStyle = '#000'; tctx.fillText(String(d), tplSize/2, tplSize/2+1);
        const id = tctx.getImageData(0,0,tplSize,tplSize);
        const g = new Uint8ClampedArray(tplSize*tplSize);
        for (let i=0,j=0;i<id.data.length;i+=4,j++) g[j] = id.data[i] < 128 ? 1:0;
        templates.push(g);
    }

    const results = [];
    const pctx = document.createElement('canvas').getContext('2d');

    for (const r of textRegions.slice(0,6)) {
        const pw = Math.max(12, Math.min(200, r.w));
        const ph = Math.max(12, Math.min(80, r.h));
        pctx.canvas.width = pw; pctx.canvas.height = ph;
        // draw the region from original canvas scaled into pctx
        pctx.drawImage(canvas, r.x, r.y, r.w, r.h, 0, 0, pw, ph);
        const id = pctx.getImageData(0,0,pw,ph);
        const g = new Uint8ClampedArray(pw*ph);
        for (let i=0,j=0;i<id.data.length;i+=4,j++) g[j] = id.data[i] < 128 ? 1:0;
        // attempt to find sequences of digits by sliding templates across the region horizontally
        let candidateNumbers = [];
        for (let shiftX = 0; shiftX < pw - tplSize; shiftX += Math.max(1, Math.floor(tplSize/2))) {
            // extract window
            const window = _resizeBinary(g, pw, ph, tplSize, tplSize, shiftX, 0);
            // compare with each template
            let bestDigit = -1; let bestScore = Infinity;
            for (let d=0; d<=9; d++) {
                const tpl = templates[d];
                let s = 0;
                for (let i=0;i<tpl.length;i++) {
                    s += Math.abs(window[i] - tpl[i]);
                }
                if (s < bestScore) { bestScore = s; bestDigit = d; }
            }
            // threshold for a digit match
            if (bestScore < tplSize*6) {
                candidateNumbers.push({x: shiftX, digit: bestDigit, score: bestScore});
            }
        }
        // cluster candidate digits by proximity and output simple sequences
        candidateNumbers.sort((a,b)=>a.x-b.x);
        let seq = '';
        let lastX = -999;
        for (const c of candidateNumbers) {
            if (c.x - lastX > tplSize*0.8) {
                seq += String(c.digit);
                lastX = c.x;
            }
        }
        if (seq.length > 0) results.push(seq);
    }

    return results;
}

function _resizeBinary(source, sw, sh, tw, th, sx=0, sy=0) {
    // nearest-neighbor resize a binary image region from source (sw x sh) to (tw x th)
    const out = new Uint8ClampedArray(tw*th);
    for (let y=0;y<th;y++) {
        for (let x=0;x<tw;x++) {
            const srcX = Math.floor(sx + x * (sw / tw));
            const srcY = Math.floor(sy + y * (sh / th));
            out[y*tw + x] = source[srcY*sw + srcX] ? 1:0;
        }
    }
    return out;
}

// Simple export for in-page debugging: draw edges to a canvas and return dataURL (not used by default)
export function drawEdgesToDataURL(edgeMap) {
    const w = edgeMap.width; const h = edgeMap.height; const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d'); const id = ctx.createImageData(w,h);
    const d = id.data; for (let i=0;i<w*h;i++) { const v = Math.min(255, Math.round(edgeMap.data[i])); d[i*4+0]=v; d[i*4+1]=v; d[i*4+2]=v; d[i*4+3]=255; }
    ctx.putImageData(id,0,0); try { return c.toDataURL('image/png'); } catch(e) { return null; }
}

// ============================================================================
// ENHANCED OUTPUTS FOR VISION APIS AND COST OPTIMIZATION
// ============================================================================

/**
 * Generate structured metadata (JSON) for vision APIs
 * Extracts trading-specific information: price levels, patterns, key levels
 * @param {Object} analysisResult - Result from analyzeImage()
 * @param {Object} options - Additional options for metadata extraction
 * @returns {Object} Structured metadata with trading context
 */
export function generateMetadata(analysisResult, options = {}) {
    const metadata = {
        version: '1.0',
        timestamp: Date.now(),
        
        // Basic image info
        dimensions: {
            width: analysisResult.metadata.width,
            height: analysisResult.metadata.height
        },
        
        // Chart detection
        isChart: analysisResult.chartDetected,
        confidence: analysisResult.chartDetected ? 0.7 : 0.3,
        
        // Visual features
        colors: {
            dominant: analysisResult.dominantColors || [],
            scheme: _inferColorScheme(analysisResult.dominantColors)
        },
        
        // Text and numeric data
        textRegions: (analysisResult.textRegions || []).map(region => ({
            x: region.x,
            y: region.y,
            width: region.w,
            height: region.h,
            confidence: 0.6
        })),
        
        // Numeric values detected (potential prices, volumes)
        numericValues: analysisResult.numericOCR || [],
        
        // Trading pattern hints (basic heuristics)
        patternHints: _detectPatternHints(analysisResult),
        
        // Key levels (if chart detected)
        keyLevels: analysisResult.chartDetected ? _extractKeyLevels(analysisResult) : []
    };
    
    return metadata;
}

/**
 * Generate rich natural language description for text-only models
 * Creates detailed description that allows visualization without seeing the image
 * @param {Object} analysisResult - Result from analyzeImage()
 * @param {Object} options - Options for description generation
 * @returns {String} Detailed natural language description
 */
export function generateDescription(analysisResult, options = {}) {
    const parts = [];
    
    // Image type
    if (analysisResult.chartDetected) {
        parts.push('This appears to be a financial chart or trading diagram.');
    } else {
        parts.push('This is an image that may contain financial information.');
    }
    
    // Dimensions and layout
    const aspect = analysisResult.metadata.width / analysisResult.metadata.height;
    if (aspect > 1.5) {
        parts.push('The image is in landscape orientation, typical of trading platforms.');
    } else if (aspect < 0.75) {
        parts.push('The image is in portrait orientation.');
    }
    
    // Colors and theme
    const colors = analysisResult.dominantColors || [];
    if (colors.length > 0) {
        const scheme = _inferColorScheme(colors);
        parts.push(`The color scheme is ${scheme}, with dominant colors: ${colors.slice(0, 3).join(', ')}.`);
    }
    
    // Chart-specific description
    if (analysisResult.chartDetected) {
        const projection = analysisResult.projectionProfile || {};
        
        // Horizontal structure
        if (projection.horizontal && projection.horizontal.peaks) {
            const numPeaks = projection.horizontal.peaks;
            if (numPeaks > 5) {
                parts.push(`The chart shows multiple horizontal elements, suggesting price levels or candlesticks (${numPeaks} distinct horizontal features).`);
            }
        }
        
        // Vertical structure
        if (projection.vertical && projection.vertical.peaks) {
            const numPeaks = projection.vertical.peaks;
            if (numPeaks > 3) {
                parts.push(`There are ${numPeaks} vertical structural elements, likely representing time intervals or volume bars.`);
            }
        }
    }
    
    // Text regions
    const textRegions = analysisResult.textRegions || [];
    if (textRegions.length > 0) {
        parts.push(`${textRegions.length} text regions are present, likely containing labels, prices, or timestamps.`);
        
        // Spatial distribution
        const topRegions = textRegions.filter(r => r.y < analysisResult.metadata.height * 0.3).length;
        const bottomRegions = textRegions.filter(r => r.y > analysisResult.metadata.height * 0.7).length;
        
        if (topRegions > textRegions.length * 0.6) {
            parts.push('Most text is concentrated at the top, typical of chart titles and timeframes.');
        }
        if (bottomRegions > textRegions.length * 0.6) {
            parts.push('Text appears primarily at the bottom, suggesting date/time labels.');
        }
    }
    
    // Numeric values
    const nums = analysisResult.numericOCR || [];
    if (nums.length > 0) {
        parts.push(`Detected numeric values: ${nums.slice(0, 5).join(', ')}${nums.length > 5 ? '...' : ''}.`);
        
        // Infer price range if possible
        const values = nums.map(n => parseFloat(n)).filter(n => !isNaN(n) && n > 0);
        if (values.length >= 2) {
            const min = Math.min(...values);
            const max = Math.max(...values);
            if (max < 10000 && min > 0.01) {
                parts.push(`Price range appears to be between ${min.toFixed(2)} and ${max.toFixed(2)}.`);
            }
        }
    }
    
    // Pattern hints
    const patterns = _detectPatternHints(analysisResult);
    if (patterns.length > 0) {
        parts.push(`Potential trading patterns: ${patterns.join(', ')}.`);
    }
    
    // Summary
    parts.push('This description provides spatial and structural context for analysis without viewing the actual image.');
    
    return parts.join(' ');
}

/**
 * Generate perceptual fingerprint (hash) for visual similarity detection
 * Uses difference hash (dHash) algorithm for fast comparison
 * @param {Object} analysisResult - Result from analyzeImage()
 * @returns {String} 64-character hex hash representing image structure
 */
export function generateFingerprint(analysisResult) {
    // Use projection profiles as a structural fingerprint
    const projection = analysisResult.projectionProfile || {};
    
    // Combine horizontal and vertical profiles
    const hProfile = projection.horizontal?.profile || [];
    const vProfile = projection.vertical?.profile || [];
    
    // Create a simple hash from profile peaks and dominant colors
    const features = [
        projection.horizontal?.peaks || 0,
        projection.vertical?.peaks || 0,
        analysisResult.chartDetected ? 1 : 0,
        (analysisResult.textRegions || []).length,
        ...analysisResult.dominantColors.slice(0, 3)
    ];
    
    // Simple hash function
    let hash = 0;
    const str = features.join('|');
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to hex and pad
    const hexHash = Math.abs(hash).toString(16).padStart(16, '0');
    
    // Add metadata hash for more uniqueness
    const metaStr = `${analysisResult.metadata.width}x${analysisResult.metadata.height}`;
    let metaHash = 0;
    for (let i = 0; i < metaStr.length; i++) {
        metaHash = ((metaHash << 5) - metaHash) + metaStr.charCodeAt(i);
        metaHash = metaHash & metaHash;
    }
    const hexMeta = Math.abs(metaHash).toString(16).padStart(16, '0');
    
    return `${hexHash}${hexMeta}`;
}

/**
 * Compare two fingerprints to detect if chart has changed significantly
 * @param {String} hash1 - First fingerprint
 * @param {String} hash2 - Second fingerprint
 * @returns {Number} Similarity score between 0 (different) and 1 (identical)
 */
export function compareFingerprints(hash1, hash2) {
    if (!hash1 || !hash2 || hash1.length !== hash2.length) {
        return 0;
    }
    
    let matchingChars = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] === hash2[i]) {
            matchingChars++;
        }
    }
    
    return matchingChars / hash1.length;
}

// ============================================================================
// HELPER FUNCTIONS FOR ENHANCED OUTPUTS
// ============================================================================

function _inferColorScheme(colors) {
    if (!colors || colors.length === 0) return 'unknown';
    
    // Simple heuristic: check if colors are mostly dark or light
    const luminance = colors.map(c => {
        // Extract RGB from hex color
        const r = parseInt(c.slice(1, 3), 16);
        const g = parseInt(c.slice(3, 5), 16);
        const b = parseInt(c.slice(5, 7), 16);
        return (0.299 * r + 0.587 * g + 0.114 * b);
    });
    
    const avgLum = luminance.reduce((a, b) => a + b, 0) / luminance.length;
    
    if (avgLum < 50) return 'dark theme';
    if (avgLum > 200) return 'light theme';
    return 'mixed theme';
}

function _detectPatternHints(analysisResult) {
    const patterns = [];
    
    // Basic heuristics based on projection profiles
    const projection = analysisResult.projectionProfile || {};
    
    if (projection.horizontal?.peaks > 10) {
        patterns.push('candlestick pattern');
    }
    
    if (projection.vertical?.peaks > 5 && projection.vertical?.peaks < 15) {
        patterns.push('support/resistance levels');
    }
    
    if (analysisResult.chartDetected) {
        patterns.push('trend chart');
    }
    
    return patterns;
}

function _extractKeyLevels(analysisResult) {
    // Extract potential price levels from text regions and numeric values
    const levels = [];
    const nums = analysisResult.numericOCR || [];
    
    for (const num of nums) {
        const value = parseFloat(num);
        if (!isNaN(value) && value > 0 && value < 100000) {
            levels.push({
                value: value,
                type: 'price',
                confidence: 0.5
            });
        }
    }
    
    return levels.slice(0, 10); // Limit to top 10 levels
}
