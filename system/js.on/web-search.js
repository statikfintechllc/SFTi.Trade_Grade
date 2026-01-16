// web-search.js - Web search functionality
// Implements web search tools: DuckDuckGo search, URL fetching, content scraping, and citations

// =============================================
// Web Search State Variables
// =============================================

let webSearchEnabled = false;
let currentSearchAbortController = null;

// =============================================
// Web Search Tools Array
// =============================================

const webSearchTools = [
    {
        type: 'function',
        function: {
            name: 'web_search',
            description: 'Search the web for current information, news, stock prices, market data, or any other real-time information. Use this when the user asks about current events, recent news, live prices, or anything that requires up-to-date information.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'The search query to find information on the web'
                    }
                },
                required: ['query']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'fetch_url',
            description: 'Fetch and read the content of a specific URL. Use this to get detailed information from a webpage when you have a specific URL to read.',
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'The full URL to fetch content from (must start with http:// or https://)'
                    }
                },
                required: ['url']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'scrape_url',
            description: 'Crawl and extract content from a URL (or a set of URLs). Parameters: url (string), depth (integer, default 0), maxPages (integer, default 3), selectors (array of css selectors to narrow extraction), followLinks (boolean, default false).',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'The full URL to scrape (must start with http:// or https://)' },
                    depth: { type: 'integer', description: 'How deep to follow links (0 = just the URL)', default: 0 },
                    maxPages: { type: 'integer', description: 'Maximum number of pages to fetch when following links', default: 3 },
                    selectors: { type: 'array', description: 'A list of CSS selectors to extract specific parts of the page' },
                    followLinks: { type: 'boolean', description: 'Whether to follow links from the starting page' }
                },
                required: ['url']
            }
        }
    }
];

// =============================================
// Web Search Implementation Functions
// =============================================
// Note: isValidUrl() is available globally from utils.js
//       This module depends on utils.js being loaded first

/**
 * Performs a web search using DuckDuckGo's HTML interface (CORS-friendly)
 */
async function performWebSearch(query) {
    showChatStatus('searching', `Searching: "${query}"`);
    
    try {
        // Use DuckDuckGo's instant answer API (JSON, more CORS-friendly)
        const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
        
        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Build results from DuckDuckGo instant answers
        const results = [];
        
        // Add abstract if available
        if (data.Abstract) {
            results.push({
                title: data.Heading || 'Summary',
                snippet: data.Abstract,
                url: data.AbstractURL || data.AbstractSource
            });
        }
        
        // Add related topics
        if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            for (const topic of data.RelatedTopics.slice(0, CONFIG.WEB_SEARCH_MAX_RESULTS - 1)) {
                if (topic.Text && topic.FirstURL) {
                    results.push({
                        title: topic.Text.split(' - ')[0] || 'Related',
                        snippet: topic.Text,
                        url: topic.FirstURL
                    });
                } else if (topic.Topics) {
                    // Handle nested topics
                    for (const subtopic of topic.Topics.slice(0, 2)) {
                        if (subtopic.Text && subtopic.FirstURL) {
                            results.push({
                                title: subtopic.Text.split(' - ')[0] || 'Related',
                                snippet: subtopic.Text,
                                url: subtopic.FirstURL
                            });
                        }
                    }
                }
            }
        }
        
        // If no results from instant answers, return a message indicating we need to try fetching directly
        if (results.length === 0) {
            return {
                success: true,
                query: query,
                results: [],
                message: `No instant results found for "${query}". The AI should provide information from its knowledge or suggest specific URLs to fetch.`
            };
        }
        
        return {
            success: true,
            query: query,
            results: results.slice(0, CONFIG.WEB_SEARCH_MAX_RESULTS),
            resultCount: results.length
        };
        
    } catch (error) {
        console.error('Web search error:', error);
        return {
            success: false,
            query: query,
            error: error.message || 'Search failed',
            message: 'Unable to perform web search. Please try again or ask a question that can be answered from AI knowledge.'
        };
    }
}

/**
 * Fetches and parses content from a URL
 */
async function fetchUrlContent(url) {
    showChatStatus('crawling', `Fetching: ${new URL(url).hostname}`);
    
    if (!isValidUrl(url)) {
        return {
            success: false,
            url: url,
            error: 'Invalid URL format'
        };
    }
    
    try {
        // Use CORS proxy for fetching
        const proxyUrl = CONFIG.CORS_PROXY + encodeURIComponent(url);
        
        const response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
        }
        
        const html = await response.text();
        
        // Parse and extract main content
        const content = extractMainContent(html, url);
        
        return {
            success: true,
            url: url,
            title: content.title,
            content: content.text,
            wordCount: content.wordCount
        };
        
    } catch (error) {
        console.error('URL fetch error:', error);
        return {
            success: false,
            url: url,
            error: error.message || 'Failed to fetch URL'
        };
    }
}

/**
 * Extracts main content from HTML
 */
function extractMainContent(html, sourceUrl) {
    // Create a temporary DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Get title
    const title = doc.querySelector('title')?.textContent || 
                 doc.querySelector('h1')?.textContent || 
                 'Untitled';
    
    // Remove script, style, nav, footer, header, aside elements
    const elementsToRemove = doc.querySelectorAll('script, style, nav, footer, header, aside, iframe, noscript, .ads, .advertisement, .sidebar, .menu, .navigation');
    elementsToRemove.forEach(el => el.remove());
    
    // Try to find main content areas with heuristics
    let mainContent = doc.querySelector('main, article, [role="main"], .content, .post, .article-content, #content, #main');

    if (!mainContent) {
        // Fallback: choose the node with the highest text density (text length weighted by inverse link density)
        const candidates = Array.from(doc.querySelectorAll('article, main, section, div'));
        let bestNode = null;
        let bestScore = 0;

        for (const node of candidates) {
            const t = (node.textContent || '').trim();
            const textLen = t.length;
            if (textLen < 200) continue; // skip very small nodes

            const linkTextLen = Array.from(node.querySelectorAll('a')).reduce((acc, a) => acc + ((a.textContent || '').length), 0);
            const linkDensity = linkTextLen / Math.max(1, textLen);
            const score = textLen * (1 - linkDensity);

            if (score > bestScore) {
                bestScore = score;
                bestNode = node;
            }
        }

        mainContent = bestNode || doc.body;
    }

    // Extract text content
    let text = mainContent?.textContent || '';

    // Try to extract a short readable snippet from first paragraphs
    let snippet = '';
    try {
        const paragraphs = Array.from(mainContent.querySelectorAll('p')).map(p => (p.textContent || '').trim()).filter(Boolean);
        if (paragraphs.length > 0) {
            snippet = paragraphs.slice(0, 3).join('\n\n');
        } else {
            snippet = text.substring(0, 500);
        }
    } catch (e) {
        snippet = text.substring(0, 500);
    }

    // Clean up the text
    text = text
        .replace(/\s+/g, ' ')           // Normalize whitespace
        .replace(/\n\s*\n/g, '\n\n')    // Normalize line breaks
        .trim();

    // Truncate if too long (keep first 4000 chars to stay within token limits)
    const maxLength = 4000;
    if (text.length > maxLength) {
        text = text.substring(0, maxLength) + '...[content truncated]';
    }

    // Meta description and JSON-LD
    const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const jsonLd = Array.from(doc.querySelectorAll('script[type="application/ld+json"]')).map(s => s.textContent).join('\n').trim();

    return {
        title: title.trim(),
        text: text,
        snippet: snippet.trim(),
        metaDescription,
        jsonLd,
        wordCount: text.split(/\s+/).length
    };
}

/**
 * Advanced scraping utility - fetches a URL, extracts main content, and optionally follows links up to a limited depth/maxPages.
 * options: { depth: 0, maxPages: 3, selectors: [], followLinks: false }
 */
async function scrapeUrl(startUrl, options = {}) {
    const opts = Object.assign({ depth: 0, maxPages: 3, selectors: [], followLinks: false }, options || {});
    if (!isValidUrl(startUrl)) {
        return { success: false, url: startUrl, error: 'Invalid URL format' };
    }

    showChatStatus('crawling', `Scraping: ${new URL(startUrl).hostname}`);

    const visited = new Set();
    const pages = [];
    const queue = [{ url: startUrl, depth: 0 }];

    while (queue.length > 0 && pages.length < opts.maxPages) {
        const item = queue.shift();
        const url = item.url;
        if (!isValidUrl(url) || visited.has(url)) continue;
        visited.add(url);

        try {
            const proxyUrl = CONFIG.CORS_PROXY + encodeURIComponent(url);
            const response = await fetch(proxyUrl, { method: 'GET', headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' } });
            if (!response.ok) {
                pages.push({ success: false, url, error: `HTTP ${response.status}` });
                continue;
            }

            const html = await response.text();
            const content = extractMainContent(html, url);

            // Collect selector-specific extracts
            const selectorsExtract = [];
            if (opts.selectors && opts.selectors.length > 0) {
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    for (const sel of opts.selectors) {
                        const el = doc.querySelector(sel);
                        if (el) selectorsExtract.push({ selector: sel, html: el.innerHTML, text: (el.textContent || '').trim() });
                    }
                } catch (e) {
                    // ignore selector failures
                }
            }

            pages.push({ success: true, url, title: content.title, content: content.text, wordCount: content.wordCount, selectors: selectorsExtract });

            // Optionally follow links for further scraping
            if (opts.followLinks && item.depth < opts.depth) {
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const anchors = Array.from(doc.querySelectorAll('a[href]'))
                        .map(a => a.href)
                        .filter(h => h && isValidUrl(h) && !visited.has(h));

                    // Enqueue up to remaining slots
                    for (const href of anchors) {
                        if (queue.length + pages.length >= opts.maxPages) break;
                        queue.push({ url: href, depth: item.depth + 1 });
                    }
                } catch (e) {
                    // ignore link parsing errors
                }
            }

        } catch (error) {
            pages.push({ success: false, url, error: error.message || 'Fetch error' });
        }
    }

    return { success: true, url: startUrl, pages, resultCount: pages.length };
}

/**
 * Executes a tool call and returns the result
 */
async function executeToolCall(toolCall) {
    const functionName = toolCall.function.name;
    let args;
    
    try {
        args = JSON.parse(toolCall.function.arguments);
    } catch (e) {
        return {
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify({ error: 'Invalid function arguments' })
        };
    }
    
    let result;
    
    switch (functionName) {
        case 'web_search':
            result = await performWebSearch(args.query);
            break;
        case 'fetch_url':
            result = await fetchUrlContent(args.url);
            break;
        case 'scrape_url':
            result = await scrapeUrl(args.url, args);
            break;
        default:
            result = { error: `Unknown function: ${functionName}` };
    }
    
    return {
        tool_call_id: toolCall.id,
        role: 'tool',
        name: functionName,
        content: JSON.stringify(result)
    };
}

/**
 * Formats citations from tool results
 */
function formatCitations(toolResults) {
    const citations = [];
    
    for (const result of toolResults) {
        try {
            const data = JSON.parse(result.content);
            
            if (result.name === 'web_search' && data.results) {
                for (const item of data.results) {
                    if (item.url && !citations.some(c => c.url === item.url)) {
                        citations.push({
                            title: item.title || new URL(item.url).hostname,
                            url: item.url
                        });
                    }
                }
            } else if (result.name === 'fetch_url' && data.url) {
                if (!citations.some(c => c.url === data.url)) {
                    citations.push({
                        title: data.title || new URL(data.url).hostname,
                        url: data.url
                    });
                }
            } else if (result.name === 'scrape_url') {
                // scrape_url returns pages[] - include each page as a citation
                if (data.pages && Array.isArray(data.pages)) {
                    for (const p of data.pages) {
                        if (p && p.url && !citations.some(c => c.url === p.url)) {
                            citations.push({ title: p.title || new URL(p.url).hostname, url: p.url });
                        }
                    }
                }
            }
        } catch (e) {
            // Skip invalid results
        }
    }
    
    return citations;
}

/**
 * Adds citations section to message content
 */
function addCitationsToMessage(content, citations) {
    if (!citations || citations.length === 0) return content;
    
    let citationsHtml = '\n\n<div class="chat-citations-section">';
    citationsHtml += '<div class="chat-citations-label">Sources</div>';
    citationsHtml += '<div class="chat-citations-list">';
    
    for (const citation of citations) {
        const safeTitle = escapeHtml(citation.title);
        const safeUrl = encodeURI(citation.url);
        citationsHtml += `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="chat-citation">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            ${safeTitle}
        </a>`;
    }
    
    citationsHtml += '</div></div>';
    
    return content + citationsHtml;
}
