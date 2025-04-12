class ConstructionAIAssistant {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';
        
        // Add conversation history
        this.conversationHistory = [];
        
        // Initialize DOM elements
        this.elements = {
            container: document.getElementById('ai-assistant-container'),
            button: document.getElementById('ai-assistant-btn'),
            chatContainer: document.getElementById('ai-chat-container'),
            closeButton: document.getElementById('close-chat'),
            messages: document.getElementById('chat-messages'),
            input: document.getElementById('user-input'),
            sendButton: document.getElementById('send-btn'),
            voiceButton: document.getElementById('voice-btn')
        };
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Add welcome message
        this.addMessage('Hello! I\'m your construction cost optimization assistant. Ask me how to save money or time on your project!', 'ai');
        
        // Check available models
        this.checkAvailableModels();
    }

    initEventListeners() {
        this.elements.button.addEventListener('click', () => this.toggleChat());
        this.elements.closeButton.addEventListener('click', () => this.hideChat());
        
        this.elements.sendButton.addEventListener('click', () => this.handleSend());
        this.elements.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSend();
        });
        
        // Fix: Call handleVoiceInput directly with proper binding
        this.elements.voiceButton.addEventListener('click', () => this.handleVoiceInput());
    }

    toggleChat() {
        this.elements.chatContainer.classList.toggle('visible');
        if (this.elements.chatContainer.classList.contains('visible')) {
            this.elements.input.focus();
        }
    }

    hideChat() {
        this.elements.chatContainer.classList.remove('visible');
    }

    handleVoiceInput() {
        if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
            alert('Speech recognition is not supported in your browser. Please use Chrome.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        // Modified settings for better speech detection
        recognition.lang = 'en-US';  // Changed to more common English
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        
        let listening = true;
        let speechTimer;
        
        // Visual feedback
        this.elements.voiceButton.classList.add('recording');
        this.elements.voiceButton.innerHTML = '🎤 Listening...';
        
        recognition.onstart = () => {
            // Reset after 10 seconds if no speech detected
            speechTimer = setTimeout(() => {
                if (listening) {
                    recognition.stop();
                }
            }, 10000);
        };

        recognition.onresult = (event) => {
            clearTimeout(speechTimer);
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
            
            this.elements.input.value = transcript;
            
            if (event.results[0].isFinal) {
                listening = false;
                setTimeout(() => {
                    recognition.stop();
                    this.handleSend();
                }, 1000);
            }
        };

        recognition.onend = () => {
            clearTimeout(speechTimer);
            this.elements.voiceButton.classList.remove('recording');
            this.elements.voiceButton.innerHTML = '🎤';
            listening = false;
        };

        recognition.onerror = (event) => {
            clearTimeout(speechTimer);
            console.error('Speech recognition error:', event.error);
            this.elements.voiceButton.classList.remove('recording');
            this.elements.voiceButton.innerHTML = '🎤';
            listening = false;
            
            if (event.error === 'no-speech') {
                alert('Please speak louder and ensure your microphone is properly connected.');
            }
        };

        try {
            recognition.start();
        } catch (error) {
            console.error('Speech recognition start error:', error);
            alert('Failed to start speech recognition. Please try again.');
        }
    }

    async handleSend() {
        const message = this.elements.input.value.trim();
        if (!message) return;
        
        this.addMessage(message, 'user');
        this.elements.input.value = '';
        
        const typingIndicator = this.showTypingIndicator();
        
        try {
            const response = await this.getAIResponse(message);
            this.elements.messages.removeChild(typingIndicator);
            this.addMessage(response, 'ai');
        } catch (error) {
            console.error('Error:', error);
            this.elements.messages.removeChild(typingIndicator);
            this.addMessage("Sorry, I encountered an error. Please try again later.", 'ai');
        }
    }

    async checkAvailableModels() {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${this.apiKey}`);
            const data = await response.json();
            
            const availableModels = data.models || [];
            const flashModel = availableModels.find(model => model.name.includes('gemini-1.5-flash'));
            
            if (flashModel) {
                // Fix the URL construction by removing the extra 'models/' prefix
                const modelName = flashModel.name.replace('models/', '');
                this.GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent`;
                console.log('Selected Model:', modelName);
            }
        } catch (error) {
            console.error('Error fetching models:', error);
        }
    }

    async getAIResponse(message) {
        try {
            // Add user message to history
            this.conversationHistory.push({ role: 'user', content: message });
            
            const conversationContext = this.conversationHistory
                .slice(-5)
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n');

            const systemPrompt = `You are a construction cost optimization assistant for Indian projects. Consider this conversation history for context:

${conversationContext}

If the query is about materials or budgets:
1. List materials with current market prices in Indian Rupees (₹)
2. Format material names as: • **Material Name**: (link): price range
3. Keep the response concise and formatted as a bullet point list
4. For prices, use ranges if exact prices aren't available

Example format:
• **Aluminum Window**: (https://example.com/product): ₹1,500 - ₹3,000 per sq ft`;

            const response = await fetch(`${this.GEMINI_API_URL}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': window.location.origin
                },
                mode: 'cors',
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `${systemPrompt}\n\nUser Query: ${message}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 250,
                        topP: 0.8,
                        topK: 40
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const data = await response.json();
            let aiResponse = data.candidates[0].content.parts[0].text;
            
            // Add AI response to history
            this.conversationHistory.push({ role: 'assistant', content: aiResponse });
            
            return aiResponse;
        } catch (error) {
            console.error('AI Response Error:', error);
            return 'Sorry, I encountered an error. Please try again later.';
        }
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        // Format bullet points and links
        let formattedText = text
            .replace(
                /• \*\*(.*?)\*\*: \((.*?)\): (.*?)(?=(?:\n|$))/g,
                '• <div class="product-container"><span class="product-title">$1</span><a href="$2" target="_blank" class="product-link">View on Store</a><span class="price-info">$3</span></div>'
            )
            .replace(/(Note:.*?)(?=(?:\n|$))/g, '<div class="note-box">$1</div>');
        
        // Add custom CSS for styling
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .product-container {
                display: flex;
                flex-direction: column;
                gap: 6px;
                padding: 10px;
                margin: 6px 0;
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
            }
            .product-title {
                font-weight: 600;
                color: #1e293b;
                font-size: 0.9em;
                padding-bottom: 4px;
                border-bottom: 1px solid #e2e8f0;
            }
            .product-title::before,
            .product-title::after {
                content: '';
                display: none;
            }
            .product-link {
                align-self: flex-start;
                background: #3b82f6;
                color: white;
                font-size: 0.85em;
                padding: 4px 12px;
                border-radius: 4px;
                transition: all 0.2s ease;
            }
            .product-link:hover {
                background: #2563eb;
                transform: translateY(-1px);
            }
            .price-info {
                color: #64748b;
                font-size: 0.85em;
                background: #f8fafc;
                padding: 4px 8px;
                border-radius: 4px;
            }
            .note-box {
                margin-top: 8px;
                padding: 8px 10px;
                background: #f8fafc;
                border-left: 3px solid #3b82f6;
                color: #475569;
                font-size: 0.85em;
                border-radius: 4px;
            }
            .message.ai-message {
                line-height: 1.4;
                padding: 10px;
            }
            .recording {
                background: #ef4444 !important;
                animation: pulse 1.5s infinite;
            }
            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        `;
        
        // Sanitize and set the content
        const sanitizedText = DOMPurify.sanitize(formattedText, {
            ALLOWED_TAGS: ['a', 'div', 'span'],
            ALLOWED_ATTR: ['href', 'target', 'class']
        });
        
        messageDiv.innerHTML = sanitizedText;
        document.head.appendChild(styleElement);
        this.elements.messages.appendChild(messageDiv);
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
        return messageDiv;
    }
    
    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai-message typing-indicator';
        typingDiv.innerHTML = `
            <p>AI is thinking...</p>
            <div class="typing-dots">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        `;
        this.elements.messages.appendChild(typingDiv);
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
        return typingDiv;
    }
}

// Initialize function to be called from HTML
window.initAIAssistant = function(apiKey) {
    new ConstructionAIAssistant(apiKey);
};