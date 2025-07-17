// Chat Manager - Handles message flow and UI updates
// Implements requirements 1.1, 1.2, 1.3
import { ErrorType } from './errorHandler.js';

/**
 * Class representing a message in the chat
 */
class Message {
    /**
     * Create a new message
     * @param {string} content - The message content
     * @param {boolean} isUser - Whether the message is from the user
     * @param {Date} timestamp - When the message was created
     * @param {Object} [options] - Additional message options
     * @param {boolean} [options.isError] - Whether this is an error message
     * @param {Object} [options.errorInfo] - Error information if this is an error message
     */
    constructor(content, isUser, timestamp = new Date(), options = {}) {
        this.content = content;
        this.isUser = isUser;
        this.timestamp = timestamp;
        this.id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.isError = options.isError || false;
        this.errorInfo = options.errorInfo || null;
    }
}

/**
 * ChatManager class for handling message display and user interactions
 * Implements requirements 1.1, 1.2, 1.3
 */
class ChatManager {
    /**
     * Create a new ChatManager
     * @param {GeminiService} geminiService - The Gemini AI service instance
     */
    constructor(geminiService) {
        if (!geminiService) {
            throw new Error('GeminiService is required to initialize ChatManager');
        }
        
        this.geminiService = geminiService;
        this.messages = [];
        this.isProcessing = false;
        
        // DOM elements
        this.messagesContainer = document.getElementById('messages');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.charCount = document.getElementById('char-count');
        this.statusMessage = document.getElementById('status-message');
        
        if (!this.messagesContainer || !this.messageInput || !this.sendButton) {
            throw new Error('Required DOM elements not found');
        }
        
        // Set up error display callback for GeminiService
        this.geminiService.errorHandler.displayCallback = this.displayError.bind(this);
        
        this.setupEventListeners();
    }
    
    /**
     * Set up event listeners for user input and error handling
     */
    setupEventListeners() {
        // Send message on button click
        this.sendButton.addEventListener('click', () => this.handleSubmit());
        
        // Send message on Enter (but allow Shift+Enter for new lines)
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSubmit();
            }
        });
        
        // Update character count as user types
        this.messageInput.addEventListener('input', () => {
            const length = this.messageInput.value.length;
            this.charCount.textContent = `${length}/4000`;
            
            // Disable send button if input is empty or too long
            this.sendButton.disabled = length === 0 || length > 4000;
            
            // Visual feedback for character limit
            if (length > 3900) {
                this.charCount.style.color = 'var(--warning)';
            } else if (length > 4000) {
                this.charCount.style.color = 'var(--error)';
            } else {
                this.charCount.style.color = 'var(--text-muted)';
            }
        });
        
        // Listen for retry events from GeminiService
        window.addEventListener('gemini-retry', (event) => {
            const { errorInfo, retryCount, maxRetries, percentage } = event.detail;
            this.updateStatus(`Retrying (${retryCount}/${maxRetries})... ${errorInfo.message}`, true, percentage);
        });
    }
    
    /**
     * Handle form submission when user sends a message
     */
    handleSubmit() {
        const content = this.messageInput.value.trim();
        
        if (content && !this.isProcessing) {
            this.sendMessage(content);
            this.messageInput.value = '';
            this.charCount.textContent = '0/4000';
            this.sendButton.disabled = true;
        }
    }
    
    /**
     * Add a message to the chat
     * @param {string} content - The message content
     * @param {boolean} isUser - Whether the message is from the user
     * @param {Object} [options] - Additional message options
     * @returns {Message} The created message object
     */
    addMessage(content, isUser, options = {}) {
        const message = new Message(content, isUser, new Date(), options);
        this.messages.push(message);
        
        // Render the message in the UI
        this.renderMessage(message);
        
        // Auto-scroll to the latest message
        this.scrollToBottom();
        
        return message;
    }
    
    /**
     * Send a user message and get AI response
     * Implements requirements 1.1, 1.2, 1.3
     * @param {string} message - The message to send
     */
    async sendMessage(message) {
        if (!message || this.isProcessing) return;
        
        try {
            this.isProcessing = true;
            this.updateStatus('Sending...', false);
            
            // Add user message to chat
            this.addMessage(message, true);
            
            // Get response from Gemini AI
            this.updateStatus('Waiting for response...', false);
            const response = await this.geminiService.generateResponse(message);
            
            // Add AI response to chat
            this.addMessage(response, false);
            
            this.updateStatus('', false);
        } catch (error) {
            console.error('Error sending message:', error);
            
            // Display error message in chat
            const errorInfo = error.errorInfo || this.geminiService.errorHandler.categorizeError(error);
            this.displayError(errorInfo);
            
            // Update status
            this.updateStatus(`Error: ${errorInfo.message}`, true);
        } finally {
            this.isProcessing = false;
        }
    }
    
    /**
     * Display an error in the chat
     * Implements requirement 1.4 - displaying appropriate error messages
     * @param {Object} errorInfo - Information about the error
     */
    displayError(errorInfo) {
        // Create error message content with action button if applicable
        let errorContent = `Error: ${errorInfo.message}`;
        
        // Add error message to chat
        this.addMessage(errorContent, false, { 
            isError: true,
            errorInfo: errorInfo
        });
        
        // If the error is actionable, add action button
        if (errorInfo.actionable) {
            const messageElement = this.messagesContainer.lastElementChild;
            if (messageElement) {
                const actionButton = document.createElement('button');
                actionButton.className = 'error-action-button';
                actionButton.textContent = errorInfo.action;
                actionButton.addEventListener('click', () => this.handleErrorAction(errorInfo));
                
                messageElement.appendChild(actionButton);
            }
        }
    }
    
    /**
     * Handle error action button clicks
     * @param {Object} errorInfo - Information about the error
     */
    handleErrorAction(errorInfo) {
        switch (errorInfo.type) {
            case ErrorType.API_KEY:
            case ErrorType.PERMISSION:
                // Show API key update dialog
                if (window.app) {
                    window.app.showApiKeyPrompt();
                }
                break;
                
            case ErrorType.CONTENT_FILTER:
                // Focus on input to modify prompt
                this.messageInput.focus();
                break;
                
            case ErrorType.VALIDATION:
                // Focus on input to edit message
                this.messageInput.focus();
                break;
                
            default:
                console.warn('No action defined for error type:', errorInfo.type);
        }
    }
    
    /**
     * Update the status message
     * @param {string} message - The status message
     * @param {boolean} isError - Whether this is an error message
     * @param {number} [progress] - Optional progress percentage (0-100)
     */
    updateStatus(message, isError = false, progress = null) {
        if (!this.statusMessage) return;
        
        // Clear existing content
        this.statusMessage.innerHTML = '';
        
        // Add progress bar if progress is provided
        if (progress !== null) {
            const progressBar = document.createElement('div');
            progressBar.className = 'status-progress-bar';
            
            const progressFill = document.createElement('div');
            progressFill.className = 'status-progress-fill';
            progressFill.style.width = `${progress}%`;
            
            progressBar.appendChild(progressFill);
            this.statusMessage.appendChild(progressBar);
        }
        
        // Add status text
        const statusText = document.createElement('span');
        statusText.textContent = message;
        this.statusMessage.appendChild(statusText);
        
        // Set color based on error state
        this.statusMessage.style.color = isError ? 'var(--error)' : 'var(--text-muted)';
    }
    
    /**
     * Render a message in the chat UI
     * Implements requirement 1.2 - proper alignment of messages
     * @param {Message} message - The message to render
     */
    renderMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.isUser ? 'user-message' : 'ai-message'}`;
        if (message.isError) {
            messageElement.className += ' error-message';
        }
        messageElement.id = message.id;
        
        // Create message content
        const contentElement = document.createElement('div');
        contentElement.className = 'message-content';
        
        // Use textContent for user messages (simple text)
        // Use innerHTML for AI messages (may contain markdown/formatting)
        if (message.isUser) {
            contentElement.textContent = message.content;
        } else {
            // For now, just use text content for AI messages too
            // Code parsing will be handled by CodePanelManager in task 5
            contentElement.textContent = message.content;
        }
        
        // Add timestamp
        const timestampElement = document.createElement('div');
        timestampElement.className = 'message-timestamp';
        timestampElement.textContent = this.formatTimestamp(message.timestamp);
        
        // Assemble message
        messageElement.appendChild(contentElement);
        messageElement.appendChild(timestampElement);
        
        // Add to messages container
        this.messagesContainer.appendChild(messageElement);
    }
    
    /**
     * Format a timestamp for display
     * @param {Date} date - The date to format
     * @returns {string} Formatted time string (e.g., "2:45 PM")
     */
    formatTimestamp(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    /**
     * Scroll the messages container to the bottom
     * Implements requirement 1.3 - scrollable message history with auto-scroll
     */
    scrollToBottom() {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }
    
    /**
     * Clear all messages from the chat
     */
    clearMessages() {
        this.messages = [];
        if (this.messagesContainer) {
            this.messagesContainer.innerHTML = '';
        }
    }
}

export default ChatManager;