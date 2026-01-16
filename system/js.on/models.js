// models.js - AI model selection and management
// Fetches available models, populates model picker, handles model selection

    async function fetchAvailableModels(token) {
        updateModelStatus('loading', 'Loading models...', '#ff9800');
        
        // Update Static Backend with the token
        StaticBackend.setGitHubToken(token);
        
        try {
            // Validate the token first
            const validation = await StaticBackend.validateGitHubToken(token);
            
            if (!validation.valid) {
                console.error('Token validation failed:', validation.error);
                showToast('Invalid GitHub token. Please check your token.', 'error', 'Auth Error');
                updateModelStatus('error', 'Invalid token', '#ff4444');
                clearModelPicker();
                return;
            }
            
            console.log('[Models] Token validated for user:', validation.user.login);
            
            // Get available models from Static Backend
            const models = await StaticBackend.getAvailableModels();
            
            if (models.length === 0) {
                showToast('No models available. Please configure your token.', 'warning', 'No Models');
                updateModelStatus('error', 'No models', '#ff4444');
                clearModelPicker();
                return;
            }
            
            // Show success message with model count
            const azureCount = models.filter(m => m.endpoint === 'azure').length;
            const copilotCount = models.filter(m => m.endpoint === 'copilot').length;
            
            let toastMsg = `${azureCount} Azure model${azureCount !== 1 ? 's' : ''}`;
            if (copilotCount > 0) {
                toastMsg += ` + ${copilotCount} Copilot model${copilotCount !== 1 ? 's' : ''}`;
            }
            
            showToast(toastMsg, 'success', `${models.length} Models Loaded`, 5000);
            updateModelStatus('ready', `${models.length} models ready`, '#00bfa5');
            
            localStorage.setItem('availableModels', JSON.stringify(models));
            populateModelPicker(models);
            
        } catch (error) {
            console.error('Error fetching models:', error);
            
            // Fallback to just Azure models
            const fallbackModels = StaticBackend.ALL_MODELS.azure;
            showToast('Loaded basic models. Some features may be limited.', 'warning', '3 Models Loaded', 5000);
            updateModelStatus('ready', '3 models ready', '#00bfa5');
            
            localStorage.setItem('availableModels', JSON.stringify(fallbackModels));
            populateModelPicker(fallbackModels);
        }
    }

    // Helper function to get model ID for API calls
    function getModelId(model) {
        return model.name || model.id;
    }

    // Helper function to get model display name for UI
    function getModelDisplayName(model) {
        return model.friendly_name || model.display_name || model.name || model.id;
    }

    // Get provider icon SVG based on provider name
    function getProviderIconSVG(provider) {
        const icons = {
            'OpenAI': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.677l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/></svg>',
            'Anthropic': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.304 3.541L12.032 21h-2.98l5.272-17.459h2.98zm-10.608 0L12.032 21h2.98L9.676 3.541H6.696z"/></svg>',
            'Google': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 11v2.4h3.97c-.16 1.03-1.2 3.02-3.97 3.02-2.39 0-4.34-1.98-4.34-4.42s1.95-4.42 4.34-4.42c1.36 0 2.27.58 2.79 1.08l1.9-1.83C15.47 5.69 13.89 5 12 5 8.13 5 5 8.13 5 12s3.13 7 7 7c4.04 0 6.72-2.84 6.72-6.84 0-.46-.05-.81-.11-1.16H12z"/></svg>',
            'Mistral AI': '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="4" height="4"/><rect x="9" y="3" width="4" height="4"/><rect x="15" y="3" width="4" height="4"/><rect x="3" y="9" width="4" height="4"/><rect x="9" y="9" width="4" height="4"/><rect x="15" y="9" width="4" height="4"/><rect x="3" y="15" width="4" height="4"/><rect x="9" y="15" width="4" height="4"/><rect x="15" y="15" width="4" height="4"/></svg>',
            'Meta': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/></svg>',
            'xAI': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932L18.901 1.153zm-1.29 19.476h2.039L6.486 3.255H4.298l13.313 17.374z"/></svg>'
        };
        return icons[provider] || '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>';
    }

    // Get capability icons based on model
    function getModelCapabilities(model) {
        const caps = [];
        // All models have chat
        caps.push({ type: 'chat', title: 'Chat', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>' });
        // GPT models have code capability
        if (model.name.includes('gpt') || model.name.includes('claude') || model.name.includes('codex')) {
            caps.push({ type: 'code', title: 'Code', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>' });
        }
        // GPT-4o and Gemini have vision
        if (model.name.includes('4o') || model.name.includes('gemini')) {
            caps.push({ type: 'vision', title: 'Vision', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>' });
        }
        return caps;
    }

    // Toggle model dropdown
    function toggleModelDropdown(event) {
        event.stopPropagation();
        const trigger = document.getElementById('modelDropdownTrigger');
        const menu = document.getElementById('modelDropdownMenu');
        
        if (trigger.disabled) return;
        
        const isActive = menu.classList.contains('active');
        
        // Close other dropdowns
        document.querySelectorAll('.model-dropdown-menu.active, .chat-history-dropdown.active, .quick-actions-popup.active').forEach(el => {
            el.classList.remove('active');
        });
        document.querySelectorAll('.model-dropdown-trigger.active').forEach(el => {
            el.classList.remove('active');
        });
        
        if (!isActive) {
            trigger.classList.add('active');
            menu.classList.add('active');
        }
        
        // Update fullscreen button visibility
        updateFullscreenBtnVisibility();
    }

    // Select a model from the dropdown
    function selectModel(modelId, modelName) {
        const trigger = document.getElementById('modelDropdownTrigger');
        const menu = document.getElementById('modelDropdownMenu');
        const hiddenSelect = document.getElementById('chatModelSelect');
        
        // Update trigger display
        trigger.querySelector('.model-name').textContent = modelName;
        
        // Update hidden select for form compatibility
        hiddenSelect.value = modelId;
        
        // Update selection state in menu
        menu.querySelectorAll('.model-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.modelId === modelId);
        });
        
        // Close dropdown
        trigger.classList.remove('active');
        menu.classList.remove('active');
        
        // Show fullscreen button again
        updateFullscreenBtnVisibility();
        
        // Save selection
        localStorage.setItem('selectedModel', modelId);
    }

    // Close model dropdown when clicking outside
    document.addEventListener('click', (event) => {
        const wrapper = document.getElementById('modelDropdownWrapper');
        if (wrapper && !wrapper.contains(event.target)) {
            document.getElementById('modelDropdownTrigger')?.classList.remove('active');
            document.getElementById('modelDropdownMenu')?.classList.remove('active');
            // Show fullscreen button when dropdown closes
            updateFullscreenBtnVisibility();
        }
    });

    // Populate model picker dropdown with available models
    function populateModelPicker(models) {
        const trigger = document.getElementById('modelDropdownTrigger');
        const menu = document.getElementById('modelDropdownMenu');
        const hiddenSelect = document.getElementById('chatModelSelect');
        
        if (!trigger || !menu || !hiddenSelect) return;

        // Save currently selected model
        const currentSelection = hiddenSelect.value || localStorage.getItem('selectedModel');
        
        // Clear menu
        menu.innerHTML = '';
        hiddenSelect.innerHTML = '';

        if (!models || models.length === 0) {
            trigger.querySelector('.model-name').textContent = 'No models available';
            trigger.disabled = true;
            return;
        }

        // Enable the dropdown
        trigger.disabled = false;

        // Group models by endpoint
        const azureModels = models.filter(m => m.endpoint === 'azure');
        const copilotModels = models.filter(m => m.endpoint === 'copilot');

        // Azure Models Section
        if (azureModels.length > 0) {
            const azureHeader = document.createElement('div');
            azureHeader.className = 'model-section-header azure';
            azureHeader.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.458 2.003L3.18 6.393v11.194l4.68 2.355V8.708l4.598-2.315v-4.39zm-.916 4.392l-4.6 2.315v9.231l4.6 2.315v-4.39l-2.3-1.157v-2.365l2.3-1.157v-4.39l.916.46v4.39l2.3 1.157v2.365l-2.3 1.157v4.39l4.598-2.315V6.393l-4.598-2.315-.916.317z"/>
                </svg>
                Azure Inference
            `;
            menu.appendChild(azureHeader);

            azureModels.forEach(model => {
                const modelId = getModelId(model);
                const modelName = getModelDisplayName(model);
                const providerClass = model.provider.toLowerCase().replace(/\s+/g, '');
                const caps = getModelCapabilities(model);
                
                const item = document.createElement('button');
                item.className = `model-item ${modelId === currentSelection ? 'selected' : ''}`;
                item.dataset.modelId = modelId;
                item.onclick = () => selectModel(modelId, modelName);
                
                item.innerHTML = `
                    <div class="model-item-icon ${providerClass}">${getProviderIconSVG(model.provider)}</div>
                    <div class="model-item-details">
                        <div class="model-item-name">${modelName}</div>
                        <div class="model-item-caps">
                            ${caps.map(c => `<div class="model-cap-icon ${c.type}" title="${c.title}">${c.svg}</div>`).join('')}
                        </div>
                    </div>
                `;
                menu.appendChild(item);

                // Add to hidden select
                const option = document.createElement('option');
                option.value = modelId;
                option.textContent = modelName;
                hiddenSelect.appendChild(option);
            });
        }

        // Copilot Models Section
        if (copilotModels.length > 0) {
            const copilotHeader = document.createElement('div');
            copilotHeader.className = 'model-section-header copilot';
            copilotHeader.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/>
                </svg>
                GitHub Copilot
            `;
            menu.appendChild(copilotHeader);

            copilotModels.forEach(model => {
                const modelId = getModelId(model);
                const modelName = getModelDisplayName(model);
                const providerClass = model.provider.toLowerCase().replace(/\s+/g, '');
                const caps = getModelCapabilities(model);
                
                const item = document.createElement('button');
                item.className = `model-item ${modelId === currentSelection ? 'selected' : ''}`;
                item.dataset.modelId = modelId;
                item.onclick = () => selectModel(modelId, modelName);
                
                item.innerHTML = `
                    <div class="model-item-icon ${providerClass}">${getProviderIconSVG(model.provider)}</div>
                    <div class="model-item-details">
                        <div class="model-item-name">${modelName}</div>
                        <div class="model-item-caps">
                            ${caps.map(c => `<div class="model-cap-icon ${c.type}" title="${c.title}">${c.svg}</div>`).join('')}
                        </div>
                    </div>
                `;
                menu.appendChild(item);

                // Add to hidden select
                const option = document.createElement('option');
                option.value = modelId;
                option.textContent = modelName;
                hiddenSelect.appendChild(option);
            });
        }

        // Restore previous selection or default to first
        let selectedModel = null;
        if (currentSelection) {
            selectedModel = models.find(m => getModelId(m) === currentSelection);
        }
        if (!selectedModel && models.length > 0) {
            selectedModel = models[0];
        }
        
        if (selectedModel) {
            selectModel(getModelId(selectedModel), getModelDisplayName(selectedModel));
        }
    }

    // Clear model picker when models cannot be fetched
    function clearModelPicker() {
        const trigger = document.getElementById('modelDropdownTrigger');
        const menu = document.getElementById('modelDropdownMenu');
        const hiddenSelect = document.getElementById('chatModelSelect');
        
        if (trigger) {
            trigger.querySelector('.model-name').textContent = 'Unable to load models';
            trigger.disabled = true;
        }
        if (menu) {
            menu.innerHTML = '';
        }
        if (hiddenSelect) {
            hiddenSelect.innerHTML = '';
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Unable to load models';
            option.disabled = true;
            hiddenSelect.appendChild(option);
        }
    }

    // Deprecated: resizeModelSelector no longer needed with custom dropdown
    function resizeModelSelector() {
        // No longer needed - custom dropdown auto-sizes
    }

// Expose all functions globally
window.fetchAvailableModels = fetchAvailableModels;
window.getModelId = getModelId;
window.getModelDisplayName = getModelDisplayName;
window.getProviderIconSVG = getProviderIconSVG;
window.getModelCapabilities = getModelCapabilities;
window.toggleModelDropdown = toggleModelDropdown;
window.selectModel = selectModel;
window.populateModelPicker = populateModelPicker;
window.clearModelPicker = clearModelPicker;
window.resizeModelSelector = resizeModelSelector;
