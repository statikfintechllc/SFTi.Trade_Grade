// ai.js - AI request handling
// Main AI request pipeline, tool calling loop, and quick action commands

function analyzeGradeWithAI(index) {
    const grades = JSON.parse(localStorage.getItem('prepareGrades') || '[]');
    const grade = grades[index];
    if (grade) {
        // Handle both old format (scores at top level) and new format (grade.scores)
        const scores = grade.scores || (grade.grade ? grade.grade.scores : {});
        const total = grade.total || (grade.grade ? grade.grade.total : 0);
        const hasPlan = grade.plan && grade.plan.entry;
        
        // Set the prompt value directly since DOM is already loaded
        const aiPrompt = document.getElementById('aiPrompt');
        if (aiPrompt) {
            let prompt = `Analyze this trade grade for ${grade.ticker}:\nTotal Score: ${total}/100\nPattern: ${scores.pattern || 0}/20\nRisk/Reward: ${scores.risk || 0}/20\nEntry/Exit: ${scores.entry || 0}/10\nPast Performance: ${scores.performance || 0}/10\nTiming: ${scores.time || 0}/20\nCatalyst: ${scores.catalyst || 0}/10\nEnvironment: ${scores.environment || 0}/10`;
            
            if (hasPlan) {
                prompt += `\n\nTrade Plan:\nEntry: $${grade.plan.entry.toFixed(2)}\nStop Loss: $${grade.plan.stopLoss.toFixed(2)} (${grade.plan.stopPercent}%)\nTarget: $${grade.plan.target.toFixed(2)} (${grade.plan.targetPercent}%)\nRisk/Reward Ratio: ${grade.plan.riskReward}:1`;
            }
            
            prompt += '\n\nProvide insights and suggestions for improvement.';
            aiPrompt.value = prompt;
        }
        switchView('ai');
    }
}

async function askAI() {
    const token = localStorage.getItem('githubToken');
    const prompt = document.getElementById('aiPrompt').value.trim();
    
    if (!token) {
        showToast('Please enter and save your GitHub token first', 'warning', 'Token Required');
        return;
    }
    
    if (!prompt) {
        showToast('Please enter a question or prompt', 'warning', 'Missing Prompt');
        return;
    }

    // Show chat window if not visible
    showChatWindow();
    
    // Build message with file attachment if present
    let messageContent = prompt;
    let hasAttachment = false;
    let attachmentPreview = '';
    
    if (pendingFileAttachment) {
        const built = buildMessageWithAttachment(prompt);
        if (typeof built === 'object' && built.multimodal) {
            // For multimodal messages, we'll handle this specially in the API call
            messageContent = built;
            hasAttachment = true;
            attachmentPreview = `📎 ${pendingFileAttachment.name}\n\n${prompt}`;
        } else {
            messageContent = built;
            hasAttachment = true;
            attachmentPreview = `📎 ${pendingFileAttachment.name}\n\n${prompt}`;
        }
        // Capture and clear the attachment after use
        const attachedFile = pendingFileAttachment;
        clearFilePreview();

        // Add user message to chat with attachment card visible
        addChatMessage('user', hasAttachment ? attachmentPreview : prompt, { attachments: hasAttachment ? [attachedFile] : undefined });
    } else {
        // No attachment - just add the message
        addChatMessage('user', prompt);
    }
    
    // Clear input and reset height
    const textarea = document.getElementById('aiPrompt');
    textarea.value = '';
    textarea.style.height = 'auto';
    
    // Disable send button and show loading
    const sendBtn = document.getElementById('chatSendBtn');
    setSendButtonLoading(sendBtn);
    
    // Show initial status
    if (webSearchEnabled) {
        showChatStatus('processing', 'Analyzing your request...');
    }
    
    // Add loading indicator - ensure unique ID or remove existing
    const container = document.getElementById('chatMessagesContainer');
    let loadingDiv = document.getElementById('loading-message');
    if (loadingDiv) {
        loadingDiv.remove();
    }
    
    loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-message assistant';
    loadingDiv.id = 'loading-message';
    loadingDiv.innerHTML = `
        <div class="chat-avatar">${getCopilotSvg()}</div>
        <div class="chat-bubble">
            <span style="opacity: 0.7;">${webSearchEnabled ? 'Searching...' : 'Thinking...'}</span>
        </div>
    `;
    container.appendChild(loadingDiv);
    container.scrollTop = container.scrollHeight;

    try {
        const modelSelectElement = document.getElementById('chatModelSelect');
        
        if (!modelSelectElement) {
            showToast('Model selector not found. Please refresh the page.', 'error', 'UI Error');
            if (loadingDiv && loadingDiv.parentNode) {
                loadingDiv.remove();
            }
            restoreSendButton(sendBtn);
            hideChatStatus();
            return;
        }
        
        const selectedModel = modelSelectElement.value;
        
        if (!selectedModel) {
            showToast('No AI model selected. Please save your GitHub token first to load available models.', 'warning', 'No Model Available');
            if (loadingDiv && loadingDiv.parentNode) {
                loadingDiv.remove();
            }
            restoreSendButton(sendBtn);
            hideChatStatus();
            return;
        }
        
        // Build system prompt
        const systemPrompt = webSearchEnabled 
            ? `You are an expert trading analyst with deep knowledge of technical analysis, fundamental analysis, and market dynamics. You have access to web search tools to find current information.

Your expertise includes:
- Technical patterns (breakouts, reversals, support/resistance)
- Risk management and position sizing
- Entry/exit timing and strategy development
- Market psychology and sentiment analysis
- Current market conditions and sector rotation
- Real-time news impact on stock movements

IMPORTANT: You have web search capabilities enabled. When the user asks about:
- Current stock prices or market data
- Recent news or events
- Live market conditions
- Any time-sensitive information

Use the web_search tool to find current information. Use fetch_url if you need to read a specific webpage in detail. When you need structured extraction or to fetch multiple related pages, use the new scrape_url tool and pass options (depth, maxPages, selectors, followLinks) so you can control how the scrape behaves and extract only the parts you need.

When analyzing trades:
1. Be specific and actionable - provide exact levels, percentages, and concrete steps
2. Consider current market environment and sentiment
3. Reference relevant technical indicators and patterns
4. Suggest specific risk management rules
5. Provide both bullish and bearish scenarios
6. Keep responses detailed but organized with clear sections

Format your responses with:
- Key findings at the top
- Detailed analysis in the middle
- Actionable recommendations at the bottom
- Use bullet points for clarity
- Include specific price levels and percentages

Be direct, professional, and avoid generic advice. Treat this as real money at stake. When using web search results, cite your sources.`
            : `You are an expert trading analyst with deep knowledge of technical analysis, fundamental analysis, and market dynamics. 

Your expertise includes:
- Technical patterns (breakouts, reversals, support/resistance)
- Risk management and position sizing
- Entry/exit timing and strategy development
- Market psychology and sentiment analysis
- Current market conditions and sector rotation
- Real-time news impact on stock movements

When analyzing trades:
1. Be specific and actionable - provide exact levels, percentages, and concrete steps
2. Consider current market environment and sentiment
3. Reference relevant technical indicators and patterns
4. Suggest specific risk management rules
5. Provide both bullish and bearish scenarios
6. Keep responses detailed but organized with clear sections

Format your responses with:
- Key findings at the top
- Detailed analysis in the middle
- Actionable recommendations at the bottom
- Use bullet points for clarity
- Include specific price levels and percentages

Be direct, professional, and avoid generic advice. Treat this as real money at stake.`;

        // Build initial messages - handle multimodal content for vision models
        let userMessageContent;
        if (typeof messageContent === 'object' && messageContent.multimodal) {
            // Multimodal message with image
            userMessageContent = messageContent.content;
        } else {
            // Regular text message
            userMessageContent = typeof messageContent === 'string' ? messageContent : prompt;
        }
        
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessageContent }
        ];
        
        // Tool calling loop
        let iteration = 0;
        let allToolResults = [];
        let finalResponse = null;
        
        while (iteration < CONFIG.WEB_SEARCH_MAX_ITERATIONS) {
            iteration++;
            
            // Build request body
            const requestBody = {
                model: selectedModel,
                messages: messages,
                max_tokens: CONFIG.AI_MAX_TOKENS,
                temperature: CONFIG.AI_TEMPERATURE
            };
            
            // Only include tools if web search is enabled
            if (webSearchEnabled) {
                requestBody.tools = webSearchTools;
                requestBody.tool_choice = 'auto';
            }
            
            // Make API call through StaticBackend
            // Automatically routes to correct endpoint based on model
            let data;
            try {
                // Use StaticBackend for intelligent routing
                data = await StaticBackend.chatCompletion(selectedModel, messages, {
                    max_tokens: CONFIG.AI_MAX_TOKENS,
                    temperature: CONFIG.AI_TEMPERATURE,
                    tools: webSearchEnabled ? webSearchTools : undefined,
                    tool_choice: webSearchEnabled ? 'auto' : undefined
                });
            } catch (backendError) {
                // Fallback to direct Azure call if StaticBackend fails
                console.warn('[StaticBackend] Falling back to direct API:', backendError.message);
                const response = await fetch(CONFIG.API_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error(`API Error: ${response.status} - ${errorData}`);
                }

                data = await response.json();
            }
            
            const responseMessage = data.choices[0].message;
            
            // Add response to messages for context
            messages.push(responseMessage);
            
            // Check if the model wants to call tools
            if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                // Process each tool call
                for (const toolCall of responseMessage.tool_calls) {
                    // Update loading indicator with current action
                    const funcName = toolCall.function.name;
                    if (loadingDiv) {
                        const bubble = loadingDiv.querySelector('.chat-bubble span');
                        if (bubble) {
                            bubble.textContent = funcName === 'web_search' ? 'Searching the web...' : 'Reading webpage...';
                        }
                    }
                    
                    // Execute the tool
                    const toolResult = await executeToolCall(toolCall);
                    allToolResults.push(toolResult);
                    
                    // Add tool result to messages
                    messages.push(toolResult);
                }
                
                // Update status
                showChatStatus('processing', 'Processing results...');
                
            } else {
                // No more tool calls, we have the final response
                finalResponse = responseMessage.content;
                break;
            }
        }
        
        // If we hit max iterations without a final response, use the last content
        if (!finalResponse && messages.length > 0) {
            const lastAssistantMsg = messages.filter(m => m.role === 'assistant' && m.content).pop();
            finalResponse = lastAssistantMsg?.content || 'I was unable to complete the request. Please try again.';
        }

        // Remove loading indicator
        if (loadingDiv && loadingDiv.parentNode) {
            loadingDiv.remove();
        }
        
        // Hide status indicator
        hideChatStatus();
        
        // Update usage stats
        updateUsageStats('message', 1);
        updateUsageStats('model', selectedModel);
        if (allToolResults.length > 0) {
            updateUsageStats('search', allToolResults.length);
        }
        // Estimate tokens used (~4 chars per token is a rough approximation for English text)
        const estimatedTokens = Math.round((prompt.length + (finalResponse?.length || 0)) / 4);
        updateUsageStats('tokens', estimatedTokens);
        
        // Format citations if we have tool results
        const citations = formatCitations(allToolResults);
        
        // Add AI response to chat (with citations if available)
        if (citations.length > 0) {
            addChatMessage('assistant', finalResponse, { citations });
        } else {
            addChatMessage('assistant', finalResponse);
        }
        
        // Auto-save chat after response
        if (!currentChatId) currentChatId = generateChatId();
        saveCurrentChat();
        
    } catch (error) {
        console.error('AI request failed:', error);
        
        // Remove loading indicator
        const loadingMsg = document.getElementById('loading-message');
        if (loadingMsg && loadingMsg.parentNode) {
            loadingMsg.remove();
        }
        
        // Hide status indicator
        hideChatStatus();
        
        // Sanitize error message
        const safeErrorMessage = String(error && error.message ? error.message : 'Unknown error')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        
        addChatMessage('assistant', 'An error occurred while contacting the AI service. Make sure your GitHub token has access to GitHub Models and try again.\n\nError: ' + safeErrorMessage);
    } finally {
        // Re-enable send button
        restoreSendButton(sendBtn);
        hideChatStatus();
    }
}

function reviewGrades() {
    const grades = JSON.parse(localStorage.getItem('prepareGrades') || '[]');
    if (grades.length === 0) {
        showToast('No grades to review. Save some grades first!', 'info', 'No Grades');
        return;
    }
    
    const summary = grades.slice(0, CONFIG.MAX_GRADES_FOR_REVIEW).map(g => `${g.ticker}: ${g.total}/100`).join(', ');
    document.getElementById('aiPrompt').value = `Review my recent trades and provide insights:\n${summary}\n\nAnalyze patterns, identify strengths/weaknesses, and suggest improvements.`;
    
    // Auto-trigger the send
    askAI();
}

function findPatterns() {
    const grades = JSON.parse(localStorage.getItem('prepareGrades') || '[]');
    if (grades.length < 2) {
        showToast('Need at least 2 grades to find patterns. Keep grading!', 'info', 'More Data Needed');
        return;
    }
    
    const data = grades.slice(0, CONFIG.MAX_GRADES_FOR_PATTERNS).map(g => ({
        ticker: g.ticker,
        total: g.total,
        pattern: g.scores.pattern,
        risk: g.scores.risk,
        catalyst: g.scores.catalyst
    }));
    
    document.getElementById('aiPrompt').value = `Find patterns in my trading grades:\n${JSON.stringify(data, null, 2)}\n\nIdentify what makes my high-scoring trades different from low-scoring ones.`;
    
    // Auto-trigger the send
    askAI();
}

function getSentiment() {
    document.getElementById('aiPrompt').value = `What is the current market sentiment? Consider:\n- Major indices (SPY, QQQ, DIA)\n- VIX levels\n- Sector rotation\n- Recent market news\n\nProvide a brief actionable summary for day trading.`;
    
    // Auto-trigger the send
    askAI();
}

// Expose all functions globally
window.analyzeGradeWithAI = analyzeGradeWithAI;
window.askAI = askAI;
window.reviewGrades = reviewGrades;
window.findPatterns = findPatterns;
window.getSentiment = getSentiment;
