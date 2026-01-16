// chat.js - Chat interface and message handling
// Manages chat UI, message rendering, file attachments, code highlighting, chat history persistence

// ============================================================================
// CHAT HISTORY AND USAGE STATS
// ============================================================================

let chatHistory = [];

// Usage Stats tracking
let usageStats = {
    messages: 0,
    searches: 0,
    tokensUsed: 0
};

function updateUsageStats(type, value) {
    if (type === 'message') {
        usageStats.messages++;
        document.getElementById('statMessages').textContent = usageStats.messages;
    } else if (type === 'search') {
        usageStats.searches++;
        document.getElementById('statSearches').textContent = usageStats.searches;
    } else if (type === 'tokens') {
        usageStats.tokensUsed += value;
        // Format large numbers: show "1.2k" for 1200+ tokens for compact display
        const formatted = usageStats.tokensUsed > 1000 
            ? (usageStats.tokensUsed / 1000).toFixed(1) + 'k' 
            : usageStats.tokensUsed.toString();
        document.getElementById('statTokensUsed').textContent = formatted;
    } else if (type === 'model') {
        // Shorten model name for display (max 8 chars to fit stat card width)
        const shortName = value.split('/').pop().split('-')[0].substring(0, 8);
        document.getElementById('statModel').textContent = shortName || '--';
    }
}

// ============================================================================
// CHAT WINDOW MANAGEMENT
// ============================================================================

// Chat window functions
function showChatWindow() {
    const chatWindow = document.getElementById('chatWindow');
    if (chatWindow) {
        chatWindow.style.display = 'flex';
    }
}

function hideChatWindow() {
    const chatWindow = document.getElementById('chatWindow');
    if (chatWindow) {
        chatWindow.style.display = 'none';
    }
}

// Auto-resize textarea as user types
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
}

// Handle Enter key to send message (Shift+Enter for new line)
function handleChatKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        askAI();
    }
}

// ============================================================================
// FILE ATTACHMENT HANDLING
// ============================================================================

// Pending file attachment storage
let pendingFileAttachment = null;

// Handle file upload for chat - full implementation
function handleChatFileUpload(input) {
    const file = input.files[0];
    if (!file) return;
    
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        showToast('File too large. Maximum size is 10MB.', 'error', 'File Error');
        input.value = '';
        return;
    }
    
    // Determine file type and process accordingly
    const fileType = file.type;
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop().toLowerCase();
    
    showToast(`Processing ${fileName}...`, 'info', 'File Upload');
    
    // Handle images - convert to base64 for vision models
    if (fileType.startsWith('image/')) {
        processImageFile(file);
    }
    // Handle text-based files
    else if (['txt', 'md', 'json', 'csv', 'js', 'css', 'html', 'py', 'rb', 'java', 'c', 'cpp', 'h', 'xml', 'yml', 'yaml'].includes(fileExtension)) {
        processTextFile(file);
    }
    // Handle PDF files
    else if (fileExtension === 'pdf') {
        processPdfFile(file);
    }
    // Handle Office documents
    else if (['doc', 'docx', 'xls', 'xlsx'].includes(fileExtension)) {
        processOfficeFile(file);
    }
    else {
        showToast(`Unsupported file type: ${fileExtension}`, 'error', 'File Error');
    }
    
    input.value = '';
}

// Process image files for vision-enabled models
async function processImageFile(file) {
    try {
        // Lazy-load the custom image processor module
        const mod = await import('/system/js.on/image-processor.js');
        showToast('Analyzing image... this may take a moment', 'info', 'Analyzing');

        // Run analysis (thumbnail, colors, edges, text regions, numeric OCR)
        const analysis = await mod.analyzeImage(file, { numericOCR: true, detectCharts: true });

        pendingFileAttachment = {
            type: 'image',
            name: file.name,
            mimeType: file.type,
            size: file.size,
            thumbnail: analysis.thumbnail,
            analysis: analysis,
            // store only thumbnail by default to keep memory small; full data can be included on demand
            data: analysis.thumbnail
        };

        // Show enhanced preview with analysis
        showFilePreview(pendingFileAttachment);
        showToast(`Image analyzed and attached: ${file.name}`, 'success', 'File Attached');
    } catch (error) {
        console.warn('Image analysis failed, falling back to basic preview:', error);
        // Fallback to basic data URL preview
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Data = e.target.result;
            pendingFileAttachment = {
                type: 'image',
                name: file.name,
                mimeType: file.type,
                data: base64Data,
                size: file.size
            };
            showFilePreview(pendingFileAttachment);
            showToast(`Image ready: ${file.name}. Type your message or click send.`, 'success', 'File Attached');
        };
        reader.onerror = function() {
            showToast('Failed to read image file', 'error', 'File Error');
        };
        reader.readAsDataURL(file);
    }
}

// Process text-based files
function processTextFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const textContent = e.target.result;
        pendingFileAttachment = {
            type: 'text',
            name: file.name,
            mimeType: file.type || 'text/plain',
            content: textContent,
            size: file.size
        };
        
        showFilePreview(pendingFileAttachment);
        showToast(`File ready: ${file.name}. Type your message or click send.`, 'success', 'File Attached');
    };
    reader.onerror = function() {
        showToast('Failed to read text file', 'error', 'File Error');
    };
    reader.readAsText(file);
}

// Process PDF files - extract basic info
function processPdfFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        // For now, we'll send the PDF as base64 for models that support it
        // or inform user that PDF text extraction is limited
        const base64Data = e.target.result;
        pendingFileAttachment = {
            type: 'pdf',
            name: file.name,
            mimeType: 'application/pdf',
            data: base64Data,
            size: file.size
        };
        
        showFilePreview(pendingFileAttachment);
        showToast(`PDF ready: ${file.name}. Note: PDF support varies by model.`, 'success', 'File Attached');
    };
    reader.onerror = function() {
        showToast('Failed to read PDF file', 'error', 'File Error');
    };
    reader.readAsDataURL(file);
}

// Process Office documents - limited support
function processOfficeFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Data = e.target.result;
        pendingFileAttachment = {
            type: 'document',
            name: file.name,
            mimeType: file.type,
            data: base64Data,
            size: file.size
        };
        
        showFilePreview(pendingFileAttachment);
        showToast(`Document ready: ${file.name}. Note: Full parsing coming soon.`, 'success', 'File Attached');
    };
    reader.onerror = function() {
        showToast('Failed to read document', 'error', 'File Error');
    };
    reader.readAsDataURL(file);
}

// ============================================================================
// FILE PREVIEW AND DISPLAY
// ============================================================================

// Show file preview in the chat area (supports fullscreen input area too)
function showFilePreview(attachment) {
    // Remove any existing preview
    clearFilePreview();

    const previewDiv = document.createElement('div');
    previewDiv.id = 'fileAttachmentPreview';
    previewDiv.className = 'file-attachment-preview';

    // Build basic preview HTML
    let previewInner = `
        <div class="file-preview-content">
            ${attachment.type === 'image' 
                ? `<img src="${attachment.thumbnail || attachment.data}" alt="${attachment.name}" class="file-preview-image">`
                : `<div class="file-preview-icon">${getFileIcon(attachment.type)}</div>`
            }
            <div class="file-preview-info">
                <span class="file-preview-name">${attachment.name}</span>
                <span class="file-preview-size">${formatFileSize(attachment.size)}</span>
            </div>
            <div style="flex:1 1 auto"></div>
            <button class="file-preview-remove" onclick="clearFilePreview()" title="Remove attachment">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `;

    // Add analysis section if available
    if (attachment.analysis) {
        const a = attachment.analysis;
        const colorsHtml = (a.dominantColors || []).map(c => `<span class="color-swatch" style="background:${c}" title="${c}"></span>`).join('');
        previewInner += `
            <div class="file-analysis">
                <div class="analysis-summary">${escapeHtml(a.analysisSummary || '')}</div>
                <div class="analysis-meta">
                    <div class="analysis-colors">${colorsHtml}</div>
                    <div class="analysis-details">
                        <span>${a.chartDetected ? 'Chart-like features detected' : 'No chart-like features'}</span>
                        <span> · </span>
                        <span>${(a.textRegions || []).length} text regions</span>
                        ${a.numericOCR && a.numericOCR.length ? `<span> · Numeric samples: ${a.numericOCR.slice(0,3).join(', ')}</span>` : ''}
                    </div>
                </div>
                <div class="analysis-actions">
                    ${a.numericOCR && a.numericOCR.length ? `<button class="small-btn" onclick="insertOcrText()">Insert OCR text</button>` : ''}
                    <button class="small-btn" onclick="reAnalyzeImage()">Re-run analysis</button>
                    <button class="small-btn" onclick="viewFullAttachment()">View</button>
                </div>
            </div>
        `;
    }

    previewDiv.innerHTML = previewInner;

    // Choose insertion point: fullscreen input area preferred if active
    const fullscreenModal = document.getElementById('fullscreenChatModal');
    let target = null;
    if (fullscreenModal && fullscreenModal.classList.contains('active')) {
        target = document.getElementById('fullscreenChatInputArea');
    }
    if (!target) target = document.querySelector('.chat-input-bar') || document.querySelector('.chat-input-wrapper') || document.body;

    if (target) {
        // insert at top
        target.insertBefore(previewDiv, target.firstChild);
    }

    // Small helper functions bound to global so buttons can call them
    window.insertOcrText = function() {
        const aiPrompt = document.getElementById('aiPrompt');
        if (!aiPrompt || !attachment.analysis || !attachment.analysis.numericOCR) return;
        const text = (attachment.analysis.numericOCR || []).slice(0,3).join(' ');
        aiPrompt.value = (aiPrompt.value ? aiPrompt.value + '\n' : '') + text;
        aiPrompt.focus();
        autoResizeTextarea(aiPrompt);
    };

    window.reAnalyzeImage = async function() {
        if (!attachment || !attachment.name) return;
        showToast('Re-analyzing image...', 'info', 'Analyzing');
        try {
            const mod = await import('/system/js.on/image-processor.js');
            const res = await mod.analyzeImage(attachment.data || attachment.thumbnail, { numericOCR: true, detectCharts: true });
            attachment.analysis = res;
            // Update preview
            showFilePreview(attachment);
            showToast('Re-analysis complete', 'success', 'Analyzed');
        } catch (e) {
            showToast('Re-analysis failed', 'error', 'Error');
        }
    };

    window.viewFullAttachment = function() {
        // open full size data in new tab if available
        const url = attachment.data || attachment.thumbnail;
        if (url) window.open(url, '_blank');
    };
}

// Clear file preview and pending attachment
function clearFilePreview() {
    pendingFileAttachment = null;
    const preview = document.getElementById('fileAttachmentPreview');
    if (preview) {
        preview.remove();
    }
}

// Get file icon based on type
function getFileIcon(type) {
    const icons = {
        'text': '📄',
        'pdf': '📑',
        'document': '📋',
        'image': '🖼️'
    };
    return icons[type] || '📎';
}

// Format file size for display
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ============================================================================
// MESSAGE BUILDING AND FORMATTING
// ============================================================================

// Build message content with attachment
function buildMessageWithAttachment(userMessage) {
    if (!pendingFileAttachment) {
        return userMessage;
    }
    
    const attachment = pendingFileAttachment;
    let content = [];
    
    // For images, use multimodal format if model supports it
    if (attachment.type === 'image') {
        // Check if current model supports vision
        const currentModel = document.getElementById('chatModelSelect')?.value || '';
        const supportsVision = CONFIG.VISION_MODELS.some(v => currentModel.toLowerCase().includes(v));
        
        if (supportsVision) {
            // Build multimodal message including structured analysis when available
            const imageUrl = attachment.data || attachment.thumbnail || '';
            return {
                multimodal: true,
                content: [
                    {
                        type: 'image_url',
                        image_url: {
                            url: imageUrl,
                            detail: 'auto'
                        }
                    },
                    {
                        type: 'attachment_analysis',
                        analysis: attachment.analysis || {}
                    },
                    {
                        type: 'text',
                        text: userMessage || `Please analyze this image: ${attachment.name}`
                    }
                ]
            };
        } else {
            // For non-vision models, describe the attachment with analysis summary if present
            const analysisSummary = attachment.analysis ? `\nAnalysis: ${attachment.analysis.analysisSummary || ''}` : '';
            return `[Image attached: ${attachment.name} (${formatFileSize(attachment.size)})]${analysisSummary} - Note: Current model may not support image analysis.\n\n${userMessage}`;
        }
    }
    
    // For text files, include the content
    if (attachment.type === 'text') {
        const fileContent = attachment.content.length > CONFIG.MAX_TEXT_FILE_CONTENT 
            ? attachment.content.substring(0, CONFIG.MAX_TEXT_FILE_CONTENT) + '\n\n... [truncated, file too large]'
            : attachment.content;
        return `Here is the content of ${attachment.name}:\n\n\`\`\`\n${fileContent}\n\`\`\`\n\n${userMessage}`;
    }
    
    // For PDFs and other documents, note the attachment
    if (attachment.type === 'pdf' || attachment.type === 'document') {
        return `[${attachment.name} attached - ${formatFileSize(attachment.size)}]\n\nNote: This file has been attached. Full content extraction for ${attachment.type} files is limited in this version.\n\n${userMessage}`;
    }
    
    return userMessage;
}

function highlightCode(code, lang) {
    if (!lang) return code;
    
    const langLower = lang.toLowerCase();
    
    // Keywords by language
    const keywords = {
        javascript: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|try|catch|throw|new|this|typeof|instanceof|null|undefined|true|false)\b/g,
        js: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|try|catch|throw|new|this|typeof|instanceof|null|undefined|true|false)\b/g,
        python: /\b(def|class|if|elif|else|for|while|return|import|from|as|try|except|finally|with|lambda|True|False|None|and|or|not|in|is|self)\b/g,
        py: /\b(def|class|if|elif|else|for|while|return|import|from|as|try|except|finally|with|lambda|True|False|None|and|or|not|in|is|self)\b/g,
        html: /\b(html|head|body|div|span|p|a|img|script|style|link|meta|title|h[1-6]|ul|ol|li|table|tr|td|th|form|input|button|select|option)\b/g,
        css: /\b(color|background|margin|padding|border|font|width|height|display|position|flex|grid|transform|transition|animation)\b/g,
        ruby: /\b(def|class|module|if|elsif|else|unless|case|when|while|until|for|do|end|return|yield|begin|rescue|ensure|raise|nil|true|false|self|require|include)\b/g,
        sql: /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TABLE|INDEX|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|NULL|AS|ORDER|BY|GROUP|HAVING|LIMIT)\b/gi,
        json: /("[\w]+")(?=\s*:)/g,
        bash: /\b(if|then|else|fi|for|while|do|done|case|esac|function|return|echo|exit|cd|ls|mkdir|rm|cp|mv|cat|grep|sed|awk)\b/g,
        sh: /\b(if|then|else|fi|for|while|do|done|case|esac|function|return|echo|exit|cd|ls|mkdir|rm|cp|mv|cat|grep|sed|awk)\b/g
    };
    
    let highlighted = code;
    
    // Highlight strings (must do first to avoid conflicts)
    highlighted = highlighted.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, '<span class="string">$&</span>');
    
    // Highlight comments
    highlighted = highlighted.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/|#.*$)/gm, '<span class="comment">$&</span>');
    
    // Highlight numbers
    highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
    
    // Highlight keywords based on language
    if (keywords[langLower]) {
        highlighted = highlighted.replace(keywords[langLower], '<span class="keyword">$&</span>');
    }
    
    // Highlight function calls
    highlighted = highlighted.replace(/\b([a-zA-Z_]\w*)\s*\(/g, '<span class="function">$1</span>(');
    
    return highlighted;
}

// Format text to HTML with markdown-like features
function formatMessageText(text) {
    // Escape HTML first
    let formatted = text.replace(/&/g, '&amp;')
                       .replace(/</g, '&lt;')
                       .replace(/>/g, '&gt;');
    
    // Format code blocks (```...```) with syntax highlighting
    formatted = formatted.replace(/```([a-zA-Z0-9+-]*)\n?([\s\S]*?)```/g, function(match, lang, code) {
        const langLabel = lang || 'code';
        const highlightedCode = highlightCode(code.trim(), lang);
        const codeId = 'code-' + Math.random().toString(36).substr(2, 9);
        return `<div class="code-block-wrapper">
            <div class="code-block-header">
                <span class="code-lang-label">${langLabel}</span>
                <button class="code-copy-btn" onclick="copyCodeBlock('${codeId}')">Copy</button>
            </div>
            <pre><code id="${codeId}" class="language-${lang}">${highlightedCode}</code></pre>
        </div>`;
    });
    
    // Format inline code (`...`)
    formatted = formatted.replace(/`([^`]*)`/g, '<code>$1</code>');
    
    // Format bold (**...** or __...__)
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    
    // Format bullet points (- ... or * ...)
    const lines = formatted.split('\n');
    let inList = false;
    let listType = '';
    const processedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/^[\-\*]\s+/)) {
            if (!inList) {
                processedLines.push('<ul>');
                inList = true;
                listType = 'ul';
            }
            processedLines.push('<li>' + line.replace(/^[\-\*]\s+/, '') + '</li>');
        } else if (line.match(/^\d+\.\s+/)) {
            if (!inList) {
                processedLines.push('<ol>');
                inList = true;
                listType = 'ol';
            } else if (listType === 'ul') {
                processedLines.push('</ul>');
                processedLines.push('<ol>');
                listType = 'ol';
            }
            processedLines.push('<li>' + line.replace(/^\d+\.\s+/, '') + '</li>');
        } else {
            if (inList) {
                processedLines.push(listType === 'ol' ? '</ol>' : '</ul>');
                inList = false;
                listType = '';
            }
            if (line.trim()) {
                processedLines.push('<p>' + line + '</p>');
            } else if (i > 0 && processedLines.length > 0 && processedLines[processedLines.length - 1] !== '<br>') {
                processedLines.push('<br>');
            }
        }
    }
    
    if (inList) {
        processedLines.push(listType === 'ol' ? '</ol>' : '</ul>');
    }
    
    return processedLines.join('\n');
}

function copyCodeBlock(codeId) {
    const codeElement = document.getElementById(codeId);
    if (codeElement) {
        // Get text content (without HTML tags)
        const code = codeElement.textContent;
        navigator.clipboard.writeText(code).then(() => {
            showToast('Code copied to clipboard!', 'success', 'Copied');
        }).catch(err => {
            console.error('Failed to copy:', err);
            showToast('Failed to copy code', 'error', 'Error');
        });
    }
}

// ============================================================================
// MESSAGE RENDERING
// ============================================================================

// Render messages into a given container from chatHistory
function renderChatMessages(container, messages) {
    if (!container) return;
    container.innerHTML = '';
    if (!messages || messages.length === 0) {
        container.innerHTML = `
            <div class="chat-empty-state">
                <div class="chat-empty-icon">💬</div>
                <div class="chat-empty-text">Start a conversation</div>
                <div class="chat-empty-subtext">Ask about trades, patterns, or market sentiment</div>
            </div>
        `;
        return;
    }

    messages.forEach(msg => {
        if (!msg || !msg.role) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${msg.role}`;

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'chat-avatar';

        if (msg.role === 'user') {
            const avatarUrl = getUserAvatarUrl();
            if (avatarUrl) {
                const img = document.createElement('img');
                img.src = avatarUrl;
                img.alt = 'User';
                img.onerror = function() { this.parentElement.textContent = 'U'; };
                avatarDiv.appendChild(img);
            } else {
                avatarDiv.textContent = 'U';
            }
        } else {
            avatarDiv.innerHTML = getCopilotSvg();
        }

        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'chat-bubble';

        if (msg.role === 'user') {
            bubbleDiv.textContent = msg.content;
        } else {
            // Preserve citations HTML if present, otherwise format message text
            if (msg.citations && Array.isArray(msg.citations) && msg.citations.length > 0) {
                const formatted = formatMessageText(msg.content || '');
                bubbleDiv.innerHTML = addCitationsToMessage(formatted, msg.citations);
            } else if (msg.html === true) {
                bubbleDiv.innerHTML = msg.content || '';
            } else {
                bubbleDiv.innerHTML = formatMessageText(msg.content || '');
            }
        }

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(bubbleDiv);

        // Render attachments if present
        if (msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0) {
            const attachmentsContainer = document.createElement('div');
            attachmentsContainer.className = 'message-attachments';

            msg.attachments.forEach(att => {
                const card = document.createElement('div');
                card.className = 'attachment-card';

                if (att.type === 'image') {
                    const img = document.createElement('img');
                    img.className = 'attachment-thumbnail';
                    img.src = att.thumbnail || att.data || '';
                    img.alt = att.name;
                    card.appendChild(img);
                } else {
                    const icon = document.createElement('div');
                    icon.className = 'attachment-icon';
                    icon.textContent = getFileIcon(att.type);
                    card.appendChild(icon);
                }

                const info = document.createElement('div');
                info.className = 'attachment-info';
                info.innerHTML = `<div class="attachment-name">${escapeHtml(att.name)}</div><div class="attachment-size">${formatFileSize(att.size)}</div>`;
                card.appendChild(info);

                if (att.analysis) {
                    const summary = document.createElement('div');
                    summary.className = 'attachment-analysis';
                    summary.textContent = att.analysis.analysisSummary || '';
                    card.appendChild(summary);
                }

                const actions = document.createElement('div');
                actions.className = 'attachment-actions';

                const viewBtn = document.createElement('button');
                viewBtn.className = 'small-btn';
                viewBtn.textContent = 'View';
                viewBtn.onclick = () => { window.open(att.data || att.thumbnail || att.url, '_blank'); };
                actions.appendChild(viewBtn);

                const insertOCRBtn = document.createElement('button');
                insertOCRBtn.className = 'small-btn';
                insertOCRBtn.textContent = 'Insert OCR';
                insertOCRBtn.onclick = () => {
                    if (att.analysis && att.analysis.numericOCR && att.analysis.numericOCR.length) {
                        const aiPrompt = document.getElementById('aiPrompt');
                        aiPrompt.value = (aiPrompt.value ? aiPrompt.value + '\n' : '') + att.analysis.numericOCR.join('\n');
                        aiPrompt.focus();
                        autoResizeTextarea(aiPrompt);
                    }
                };
                actions.appendChild(insertOCRBtn);

                card.appendChild(actions);
                attachmentsContainer.appendChild(card);
            });

            messageDiv.appendChild(attachmentsContainer);
        }

        container.appendChild(messageDiv);
    });

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// Add a message to the chat (stores to chatHistory and re-renders)
function addChatMessage(role, content, options = {}) {
    const message = { role, content };
    if (options.citations) message.citations = options.citations;
    if (options.html) message.html = true;
    if (options.attachments) message.attachments = options.attachments;

    // Add to chat history and render
    chatHistory.push(message);
    const container = document.getElementById('chatMessagesContainer');
    renderChatMessages(container, chatHistory);
}

// ============================================================================
// SEND BUTTON STATE MANAGEMENT
// ============================================================================

// Helper function to restore send button to normal state
function restoreSendButton(sendBtn) {
    if (!sendBtn) return;
    sendBtn.disabled = false;
    sendBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
    `;
}

// Helper function to set send button to loading state
function setSendButtonLoading(sendBtn) {
    if (!sendBtn) return;
    sendBtn.disabled = true;
    sendBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
        </svg>
    `;
}

// ============================================================================
// WEB SEARCH AND FILE UPLOAD CONTROLS
// ============================================================================

// Web Search Toggle and Status Functions
// =============================================

function toggleWebSearch(event) {
    // Prevent default behavior and stop propagation to avoid keyboard/focus glitches
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    webSearchEnabled = !webSearchEnabled;
    const toggle = document.getElementById('webSearchToggle');
    if (toggle) {
        if (webSearchEnabled) {
            toggle.classList.add('active');
        } else {
            toggle.classList.remove('active');
        }
        // Immediately blur to remove focus state and prevent highlight sticking
        toggle.blur();
    }
    // Placeholder always stays the same - "Review the Markets..."
}

// Trigger file upload with proper focus handling
function triggerFileUpload(event) {
    // Stop propagation - same pattern as toggleQuickActionsPopup (More button)
    if (event) {
        event.stopPropagation();
    }
    
    const fileInput = document.getElementById('chatFileInput');
    
    // Trigger the file input click
    fileInput.click();
}

// ============================================================================
// FULLSCREEN CHAT MODE
// ============================================================================

// Fullscreen chat state
let isFullscreenChat = false;
let originalChatInputParent = null;
let originalChatInputNextSibling = null;
let originalChatModelBarParent = null;
let originalChatModelBarNextSibling = null;

function handleFullscreenKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
        if (isFullscreenChat) toggleFullscreenChat();
    }
}

function pullUpInputHandler() {
    const modal = document.getElementById('fullscreenChatModal');
    if (modal) modal.classList.add('input-pulled-up');
}
function pullDownInputHandler() {
    const modal = document.getElementById('fullscreenChatModal');
    if (modal) modal.classList.remove('input-pulled-up');
}

// Toggle fullscreen chat modal
function toggleFullscreenChat() {
    const modal = document.getElementById('fullscreenChatModal');
    const fullscreenBtn = document.getElementById('fullscreenChatBtn');
    const messagesContainer = document.getElementById('chatMessagesContainer');
    const fullscreenBody = document.getElementById('fullscreenChatBody');
    const fullscreenInputArea = document.getElementById('fullscreenChatInputArea');
    const chatInputBar = document.querySelector('.chat-input-bar');

    if (!modal) return;

    isFullscreenChat = !isFullscreenChat;

    if (isFullscreenChat) {
        // Enter fullscreen
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        // Render messages into fullscreen modal using renderer
        if (fullscreenBody) {
            renderChatMessages(fullscreenBody, chatHistory);
        }

        // Move input controls into fullscreen input area (preserve event listeners)
        if (chatInputBar && fullscreenInputArea) {
            if (!originalChatInputParent) {
                originalChatInputParent = chatInputBar.parentNode;
                originalChatInputNextSibling = chatInputBar.nextSibling;
            }
            fullscreenInputArea.appendChild(chatInputBar);
        }

        // Focus the prompt
        const aiPrompt = document.getElementById('aiPrompt');
        setTimeout(() => { if (aiPrompt) aiPrompt.focus(); }, 50);

        // Adjust for virtual keyboard on mobile (visualViewport)
        if (window.visualViewport) {
            const onViewportChange = () => {
                const kbHeight = Math.max(0, window.innerHeight - window.visualViewport.height);
                const fullscreenBodyEl = document.getElementById('fullscreenChatBody');
                const inputAreaEl = document.getElementById('fullscreenChatInputArea');
                if (fullscreenBodyEl && inputAreaEl) {
                    fullscreenBodyEl.style.paddingBottom = (kbHeight + inputAreaEl.offsetHeight + 16) + 'px';
                }
            };
            // store handler so we can remove it later
            window.visualViewport._fullscreenChatHandler = onViewportChange;
            window.visualViewport.addEventListener('resize', onViewportChange);
            window.visualViewport.addEventListener('scroll', onViewportChange);
            onViewportChange();
        }

        // Keyboard handler and focus behavior
        document.addEventListener('keydown', handleFullscreenKeydown);
        if (aiPrompt) {
            aiPrompt.addEventListener('focus', pullUpInputHandler);
            aiPrompt.addEventListener('blur', pullDownInputHandler);
        }
    } else {
        // Exit fullscreen
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';

        // Re-render messages in main chat container
        if (messagesContainer) {
            renderChatMessages(messagesContainer, chatHistory);
        }

        // Move input back to its original location
        const currentInputBar = document.querySelector('.chat-input-bar');
        if (currentInputBar && originalChatInputParent) {
            originalChatInputParent.insertBefore(currentInputBar, originalChatInputNextSibling);
        }
        originalChatInputParent = null;
        originalChatInputNextSibling = null;

        // Remove handlers and any pulled-up state
        document.removeEventListener('keydown', handleFullscreenKeydown);
        const aiPrompt = document.getElementById('aiPrompt');
        if (aiPrompt) {
            aiPrompt.removeEventListener('focus', pullUpInputHandler);
            aiPrompt.removeEventListener('blur', pullDownInputHandler);
        }

        // Remove visualViewport handlers if present
        if (window.visualViewport && window.visualViewport._fullscreenChatHandler) {
            window.visualViewport.removeEventListener('resize', window.visualViewport._fullscreenChatHandler);
            window.visualViewport.removeEventListener('scroll', window.visualViewport._fullscreenChatHandler);
            delete window.visualViewport._fullscreenChatHandler;
            const fullscreenBodyEl = document.getElementById('fullscreenChatBody');
            if (fullscreenBodyEl) fullscreenBodyEl.style.paddingBottom = '';
        }

        modal.classList.remove('input-pulled-up');
    }
}

// Hide fullscreen button when model dropdown is open
function updateFullscreenBtnVisibility() {
    const fullscreenBtn = document.getElementById('fullscreenChatBtn');
    const modelDropdownMenu = document.getElementById('modelDropdownMenu');
    
    if (fullscreenBtn && modelDropdownMenu) {
        if (modelDropdownMenu.classList.contains('active')) {
            fullscreenBtn.classList.add('hidden');
        } else {
            fullscreenBtn.classList.remove('hidden');
        }
    }
}

// ============================================================================
// ATTACHMENT TEST HARNESS
// ============================================================================

// Floating widget to run scraper-based image analysis tests
function _createAttachmentTestWidget() {
    if (document.getElementById('attachmentTestWidget')) return;
    const widget = document.createElement('div');
    widget.id = 'attachmentTestWidget';
    widget.className = 'attachment-test-widget';
    widget.title = 'Run Attachment Scraper Tests';
    widget.innerHTML = `<button id="runAttachmentTestsBtn" class="small-btn">Run Attachment Tests</button>
        <div id="attachmentTestOutput" class="attachment-test-output" style="display:none;"></div>`;
    document.body.appendChild(widget);

    document.getElementById('runAttachmentTestsBtn').addEventListener('click', async () => {
        const out = document.getElementById('attachmentTestOutput');
        out.style.display = 'block';
        out.textContent = '';
        await runAttachmentScraperTests(out);
    });
    // Auto-run tests once (user asked to run tests immediately)
    setTimeout(() => {
        try { document.getElementById('runAttachmentTestsBtn').click(); } catch(e) { /* ignore */ }
    }, 800);
}

async function runAttachmentScraperTests(outputEl) {
    outputEl = outputEl || document.getElementById('attachmentTestOutput') || { textContent: '' };
    function log(msg) { console.log('[AttachmentTest]', msg); outputEl.textContent += msg + '\n'; outputEl.scrollTop = outputEl.scrollHeight; }

    const samplePages = [
        'https://en.wikipedia.org/wiki/Apple_Inc.',
        'https://en.wikipedia.org/wiki/Stock_market'
    ];

    let total = 0, analyzed = 0, charts = 0;

    for (const page of samplePages) {
        log(`Fetching page: ${page}`);
        try {
            const prox = CONFIG.CORS_PROXY + encodeURIComponent(page);
            const res = await fetch(prox);
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const imgs = Array.from(doc.querySelectorAll('img'))
                .map(img => img.getAttribute('src') || img.getAttribute('data-src'))
                .filter(Boolean)
                .map(src => {
                    try { return new URL(src, page).toString(); } catch(e) { return null; }
                })
                .filter(Boolean);

            log(`Found ${imgs.length} images on page.`);

            for (let i=0;i<Math.min(4, imgs.length); i++) {
                const imgUrl = imgs[i];
                total++;
                log(`Fetching image ${i+1}: ${imgUrl}`);
                try {
                    const proxImg = CONFIG.CORS_PROXY + encodeURIComponent(imgUrl);
                    const imRes = await fetch(proxImg);
                    const blob = await imRes.blob();
                    // analyze using our module
                    const mod = await import('/system/js.on/image-processor.js');
                    const analysis = await mod.analyzeImage(blob, { numericOCR: true, detectCharts: true });
                    analyzed++;
                    if (analysis.chartDetected) charts++;
                    log(`Analyzed: chartDetected=${analysis.chartDetected}, textRegions=${(analysis.textRegions||[]).length}, colors=${(analysis.dominantColors||[]).join(', ')}`);

                    // Add result to chat as an assistant message (non-API) for quick inspection
                    const contentHtml = `<div style="font-size:13px;">Analyzed <a href='${escapeHtml(imgUrl)}' target='_blank' rel='noopener noreferrer'>image</a>: <br/>Chart: ${analysis.chartDetected} · Text regions: ${(analysis.textRegions||[]).length} · Colors: ${(analysis.dominantColors||[]).slice(0,3).join(', ')}</div>`;
                    addChatMessage('assistant', contentHtml, { html: true });

                } catch (e) {
                    log(`Image fetch/analysis failed: ${e.message}`);
                }
            }

        } catch (e) {
            log(`Page fetch failed: ${e.message}`);
        }
    }

    log(`Tests complete. Pages: ${samplePages.length}, Images: ${total}, Analyzed: ${analyzed}, Charts found: ${charts}`);
}

// Create widget on load - DISABLED for production (developer feature only)
// window.addEventListener('load', () => setTimeout(_createAttachmentTestWidget, 500));

// Test widget styles
const testWidgetStyle = document.createElement('style');
testWidgetStyle.innerHTML = `
    .attachment-test-widget { position: fixed; right: 12px; bottom: 84px; z-index: 99999; display:flex; flex-direction:column; gap:6px; align-items:flex-end; }
    .attachment-test-widget .attachment-test-output { width: 420px; height: 300px; background: rgba(0,0,0,0.7); color: #fff; border: 1px solid rgba(255,255,255,0.06); padding: 8px; overflow:auto; border-radius: 8px; font-family: monospace; font-size: 12px; }
    #runAttachmentTestsBtn { padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); color: #fff; }
`;
document.head.appendChild(testWidgetStyle);

// ============================================================================
// CHAT STATUS INDICATORS
// ============================================================================

function showChatStatus(statusType, message) {
    const statusIndicator = document.getElementById('chatStatusIndicator');
    if (!statusIndicator) return;
    
    // Remove all status classes
    statusIndicator.classList.remove('status-searching', 'status-crawling', 'status-processing', 'status-complete');
    
    // Add the appropriate status class
    statusIndicator.classList.add(`status-${statusType}`);
    
    // Update the status text
    const statusText = statusIndicator.querySelector('.status-text');
    if (statusText) {
        statusText.textContent = message;
    }
    
    // Show the indicator
    statusIndicator.style.display = 'flex';
}

function hideChatStatus() {
    const statusIndicator = document.getElementById('chatStatusIndicator');
    if (statusIndicator) {
        statusIndicator.style.display = 'none';
    }
}

// ============================================================================
// CHAT HISTORY MANAGEMENT
// ============================================================================

function clearChat() {
    const container = document.getElementById('chatMessagesContainer');
    if (container) {
        container.innerHTML = `
            <div class="chat-empty-state">
                <div class="chat-empty-icon">💬</div>
                <div class="chat-empty-text">Start a conversation</div>
                <div class="chat-empty-subtext">Ask about trades, patterns, or market sentiment</div>
            </div>
        `;
    }
    chatHistory = [];
}

// Chat History Management
let allChats = JSON.parse(localStorage.getItem('chatSessions') || '[]');
let currentChatId = null;

function generateChatId() {
    return 'chat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function startNewChat() {
    // Save current chat first if it has messages
    if (chatHistory.length > 0 && currentChatId) {
        saveCurrentChat();
    }
    
    // Create new chat
    currentChatId = generateChatId();
    clearChat();
    
    // Reset stats for new conversation
    usageStats.messages = 0;
    document.getElementById('statMessages').textContent = '0';
    
    showToast('New conversation started', 'success', 'New Chat');
    hideChatHistoryDropdown();
}

function saveCurrentChat() {
    if (!currentChatId || chatHistory.length === 0) return;
    
    // Generate title from first user message
    const firstUserMsg = chatHistory.find(m => m.role === 'user');
    const title = firstUserMsg 
        ? firstUserMsg.content.substring(0, 40) + (firstUserMsg.content.length > 40 ? '...' : '')
        : 'New Chat';
    
    const chatData = {
        id: currentChatId,
        title: title,
        messages: chatHistory,
        timestamp: Date.now()
    };
    
    // Update or add to allChats
    const existingIndex = allChats.findIndex(c => c.id === currentChatId);
    if (existingIndex >= 0) {
        allChats[existingIndex] = chatData;
    } else {
        allChats.unshift(chatData); // Add to beginning
    }
    
    // Keep only last 20 chats
    if (allChats.length > 20) {
        allChats = allChats.slice(0, 20);
    }
    
    localStorage.setItem('chatSessions', JSON.stringify(allChats));
}

function loadChat(chatId) {
    // Save current chat first
    if (chatHistory.length > 0 && currentChatId) {
        saveCurrentChat();
    }
    
    // Reload allChats from localStorage to ensure latest data
    allChats = JSON.parse(localStorage.getItem('chatSessions') || '[]');
    
    const chat = allChats.find(c => c.id === chatId);
    if (!chat) {
        showToast('Chat not found', 'error', 'Error');
        return;
    }
    
    currentChatId = chatId;
    chatHistory = [...(chat.messages || [])]; // Create a copy to avoid reference issues
    
    // Render the chat
    const container = document.getElementById('chatMessagesContainer');
    renderChatMessages(container, chatHistory);
    hideChatHistoryDropdown();
}

function deleteChat(chatId, event) {
    event.stopPropagation();
    
    allChats = allChats.filter(c => c.id !== chatId);
    localStorage.setItem('chatSessions', JSON.stringify(allChats));
    
    // If deleting current chat, start new one
    if (chatId === currentChatId) {
        startNewChat();
    }
    
    renderChatHistoryList();
    showToast('Chat deleted', 'info', 'Deleted');
}

function toggleChatHistoryDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('chatHistoryDropdown');
    dropdown.classList.toggle('active');
    
    if (dropdown.classList.contains('active')) {
        renderChatHistoryList();
        document.addEventListener('click', closeChatHistoryOnOutsideClick);
    } else {
        document.removeEventListener('click', closeChatHistoryOnOutsideClick);
    }
}

function hideChatHistoryDropdown() {
    const dropdown = document.getElementById('chatHistoryDropdown');
    if (dropdown) {
        dropdown.classList.remove('active');
    }
    document.removeEventListener('click', closeChatHistoryOnOutsideClick);
}

function closeChatHistoryOnOutsideClick(event) {
    const dropdown = document.getElementById('chatHistoryDropdown');
    const btn = event.target.closest('.chat-history-btn');
    if (!dropdown.contains(event.target) && !btn) {
        hideChatHistoryDropdown();
    }
}

function renderChatHistoryList() {
    const list = document.getElementById('chatHistoryList');
    if (!list) return;
    
    if (allChats.length === 0) {
        list.innerHTML = '<div class="chat-history-empty">No chat history yet</div>';
        return;
    }
    
    list.innerHTML = allChats.map(chat => {
        const date = new Date(chat.timestamp);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isActive = chat.id === currentChatId ? 'background: rgba(204, 0, 0, 0.1);' : '';
        
        return `
            <div class="chat-history-item" style="${isActive}" onclick="loadChat('${chat.id}')">
                <div class="chat-history-item-content">
                    <div class="chat-history-item-title">${escapeHtml(chat.title)}</div>
                    <div class="chat-history-item-date">${dateStr}</div>
                </div>
                <button class="chat-history-item-delete" onclick="deleteChat('${chat.id}', event)" title="Delete chat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `;
    }).join('');
}

// Expose all functions and variables globally
window.chatHistory = chatHistory;
window.usageStats = usageStats;
window.updateUsageStats = updateUsageStats;
window.showChatWindow = showChatWindow;
window.hideChatWindow = hideChatWindow;
window.autoResizeTextarea = autoResizeTextarea;
window.handleChatKeyPress = handleChatKeyPress;
window.pendingFileAttachment = pendingFileAttachment;
window.handleChatFileUpload = handleChatFileUpload;
window.processImageFile = processImageFile;
window.processTextFile = processTextFile;
window.processPdfFile = processPdfFile;
window.processOfficeFile = processOfficeFile;
window.showFilePreview = showFilePreview;
window.clearFilePreview = clearFilePreview;
window.getFileIcon = getFileIcon;
window.formatFileSize = formatFileSize;
window.buildMessageWithAttachment = buildMessageWithAttachment;
window.highlightCode = highlightCode;
window.formatMessageText = formatMessageText;
window.copyCodeBlock = copyCodeBlock;
window.renderChatMessages = renderChatMessages;
window.addChatMessage = addChatMessage;
window.restoreSendButton = restoreSendButton;
window.setSendButtonLoading = setSendButtonLoading;
window.toggleWebSearch = toggleWebSearch;
window.triggerFileUpload = triggerFileUpload;
window.isFullscreenChat = isFullscreenChat;
window.originalChatInputParent = originalChatInputParent;
window.originalChatInputNextSibling = originalChatInputNextSibling;
window.handleFullscreenKeydown = handleFullscreenKeydown;
window.pullUpInputHandler = pullUpInputHandler;
window.pullDownInputHandler = pullDownInputHandler;
window.toggleFullscreenChat = toggleFullscreenChat;
window.updateFullscreenBtnVisibility = updateFullscreenBtnVisibility;
window._createAttachmentTestWidget = _createAttachmentTestWidget;
window.runAttachmentScraperTests = runAttachmentScraperTests;
window.showChatStatus = showChatStatus;
window.hideChatStatus = hideChatStatus;
window.clearChat = clearChat;
window.allChats = allChats;
window.currentChatId = currentChatId;
window.generateChatId = generateChatId;
window.startNewChat = startNewChat;
window.saveCurrentChat = saveCurrentChat;
window.loadChat = loadChat;
window.deleteChat = deleteChat;
window.toggleChatHistoryDropdown = toggleChatHistoryDropdown;
window.hideChatHistoryDropdown = hideChatHistoryDropdown;
window.closeChatHistoryOnOutsideClick = closeChatHistoryOnOutsideClick;
window.renderChatHistoryList = renderChatHistoryList;
