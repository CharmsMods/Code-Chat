// Main application controller
// This file orchestrates all components and initializes the app
// Implements requirements 4.1, 4.4 - Application orchestration and initialization
import GeminiService from './geminiService.js';
import ChatManager from './chatManager.js';
import CodePanelManager from './codePanelManager.js';
import ErrorHandler from './errorHandler.js';

/**
 * Main application controller class
 * Orchestrates all components and manages application lifecycle
 */
class AppController {
    /**
     * Create a new AppController instance
     */
    constructor() {
        this.chatManager = null;
        this.codePanelManager = null;
        this.geminiService = null;
        this.errorHandler = null;
        this.apiKey = null;
        this.isDarkTheme = true; // Default to dark theme
    }

    /**
     * Initialize the application
     * Sets up all components and their connections
     */
    async init() {
        console.log('Initializing Gemini Chat App...');
        
        try {
            // Make app instance available globally for error handling
            window.app = this;
            
            // Initialize error handler first
            this.errorHandler = new ErrorHandler(this.displayGlobalError.bind(this));
            
            // Load theme preference from localStorage
            this.loadThemePreference();
            
            // Get API key from localStorage
            this.apiKey = this.getApiKey();
            
            if (!this.apiKey) {
                this.showApiKeyPrompt();
                return;
            }
            
            // Initialize Gemini service with error display callback
            this.geminiService = new GeminiService(this.apiKey, this.displayGlobalError.bind(this));
            
            // Initialize code panel manager
            this.codePanelManager = new CodePanelManager();
            
            // Initialize chat manager
            this.chatManager = new ChatManager(this.geminiService);
            
            // Connect components to enable interaction between them
            this.connectComponents();
            
            // Setup global event listeners
            this.setupEventListeners();
            
            // Show welcome message
            this.showWelcomeMessage();
            
            console.log('Gemini Chat App initialized successfully');
        } catch (error) {
            // Use error handler for initialization errors
            if (this.errorHandler) {
                this.errorHandler.handleError(error, 'initialization');
            } else {
                this.handleLegacyError(error);
            }
        }
    }
    
    /**
     * Connect components to enable interaction between them
     * Implements integration between ChatManager and CodePanelManager
     */
    connectComponents() {
        if (!this.chatManager || !this.codePanelManager) {
            console.error('Cannot connect components: ChatManager or CodePanelManager not initialized');
            return;
        }
        
        // Override the renderMessage method in ChatManager to process code blocks
        const originalRenderMessage = this.chatManager.renderMessage.bind(this.chatManager);
        
        this.chatManager.renderMessage = (message) => {
            // Call the original method first
            originalRenderMessage(message);
            
            // If it's an AI message, process it for code blocks
            if (!message.isUser && !message.isError && this.codePanelManager) {
                // Find the message element that was just added
                const messageElement = document.getElementById(message.id);
                if (messageElement) {
                    const contentElement = messageElement.querySelector('.message-content');
                    if (contentElement) {
                        // Process the message content for code blocks
                        const processedText = this.codePanelManager.processResponse(message.content);
                        
                        // Update the message content if needed
                        if (processedText !== message.content) {
                            contentElement.textContent = processedText;
                        }
                    }
                }
            }
        };
        
        // Add clear method to reset both chat and code panels
        this.clearAll = () => {
            if (this.chatManager) {
                this.chatManager.clearMessages();
            }
            
            if (this.codePanelManager) {
                this.codePanelManager.clearPanels();
            }
            
            this.showWelcomeMessage();
        };
    }
    
    /**
     * Show welcome message in the chat
     */
    showWelcomeMessage() {
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'block';
        }
    }
    
    /**
     * Get API key from localStorage
     * @returns {string|null} The API key or null if not found
     */
    getApiKey() {
        return localStorage.getItem('gemini_api_key');
    }
    
    /**
     * Show API key prompt to user
     */
    showApiKeyPrompt() {
        // Create a simple form to get the API key
        const welcomeMessage = document.querySelector('.welcome-message');
        
        if (welcomeMessage) {
            welcomeMessage.innerHTML = `
                <h2>Welcome to Gemini Chat</h2>
                <p>To get started, please enter your Gemini API key.</p>
                <div class="api-key-form">
                    <input type="text" id="api-key-input" placeholder="Enter your Gemini API key" class="message-input" />
                    <button id="save-api-key" class="send-button">Save</button>
                </div>
                <p class="text-muted" style="margin-top: 10px; font-size: 0.8rem;">
                    Your API key will be stored in your browser's localStorage.
                </p>
            `;
            
            // Add event listener to save button
            document.getElementById('save-api-key').addEventListener('click', () => {
                const apiKey = document.getElementById('api-key-input').value.trim();
                if (apiKey) {
                    localStorage.setItem('gemini_api_key', apiKey);
                    window.location.reload();
                }
            });
            
            // Add event listener for Enter key
            document.getElementById('api-key-input').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const apiKey = document.getElementById('api-key-input').value.trim();
                    if (apiKey) {
                        localStorage.setItem('gemini_api_key', apiKey);
                        window.location.reload();
                    }
                }
            });
        }
    }

    /**
     * Display a global error in the UI
     * @param {Object} errorInfo - Information about the error
     */
    displayGlobalError(errorInfo) {
        console.error('Application error:', errorInfo);
        
        // If chat manager exists, use it to display the error
        if (this.chatManager) {
            this.chatManager.displayError(errorInfo);
            return;
        }
        
        // Otherwise, display in status message
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.textContent = `Error: ${errorInfo.message}`;
            statusMessage.style.color = 'var(--error)';
            
            // Create a toast notification for critical errors
            if (!errorInfo.recoverable) {
                this.showErrorToast(errorInfo.message, errorInfo.actionable ? errorInfo.action : null);
            }
        }
    }

    /**
     * Legacy error handler for backward compatibility
     * @param {Error} error - The error that occurred
     */
    handleLegacyError(error) {
        console.error('Application error:', error);
        
        // Display error in UI
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.textContent = `Error: ${error.message}`;
            statusMessage.style.color = 'var(--error)';
            
            // Auto-hide error after 5 seconds
            setTimeout(() => {
                statusMessage.textContent = '';
            }, 5000);
        }
    }

    /**
     * Show a toast notification for errors
     * @param {string} message - The error message
     * @param {string|null} actionText - Optional action button text
     */
    showErrorToast(message, actionText = null) {
        // Create toast container if it doesn't exist
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'toast error-toast';
        
        // Add error icon
        const iconSpan = document.createElement('span');
        iconSpan.className = 'toast-icon';
        iconSpan.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
        `;
        
        // Add message
        const messageSpan = document.createElement('span');
        messageSpan.className = 'toast-message';
        messageSpan.textContent = message;
        
        // Add action button if provided
        if (actionText) {
            const actionButton = document.createElement('button');
            actionButton.className = 'toast-action';
            actionButton.textContent = actionText;
            actionButton.addEventListener('click', () => {
                // Handle action based on text
                if (actionText === 'Update API Key') {
                    this.showApiKeyPrompt();
                }
                toast.remove();
            });
            toast.appendChild(actionButton);
        }
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.className = 'toast-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => toast.remove());
        
        // Assemble toast
        toast.appendChild(iconSpan);
        toast.appendChild(messageSpan);
        if (actionText) {
            const actionButton = document.createElement('button');
            actionButton.className = 'toast-action';
            actionButton.textContent = actionText;
            actionButton.addEventListener('click', () => {
                // Handle action based on text
                if (actionText === 'Update API Key') {
                    this.showApiKeyPrompt();
                }
                toast.remove();
            });
            toast.appendChild(actionButton);
        }
        toast.appendChild(closeButton);
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add('toast-hiding');
                setTimeout(() => toast.remove(), 300);
            }
        }, 8000);
    }

    /**
     * Set up global event listeners
     */
    setupEventListeners() {
        // Theme toggle functionality
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
        
        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+L or Cmd+L to clear chat
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                this.clearAll();
            }
        });
        
        // Handle window resize events
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Handle beforeunload to warn about unsaved changes
        window.addEventListener('beforeunload', (e) => {
            // If there are messages in the chat, show a confirmation dialog
            if (this.chatManager && this.chatManager.messages.length > 0) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        });
        
        // Handle online/offline status
        window.addEventListener('online', () => {
            if (this.chatManager) {
                this.chatManager.updateStatus('You are back online', false);
                setTimeout(() => this.chatManager.updateStatus(''), 3000);
            }
        });
        
        window.addEventListener('offline', () => {
            if (this.chatManager) {
                this.chatManager.updateStatus('You are offline. Messages cannot be sent.', true);
            }
        });
    }
    
    /**
     * Handle window resize events
     */
    handleResize() {
        // Update UI based on window size if needed
        // This is a placeholder for future responsive design enhancements
    }
    
    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;
        
        // Apply theme to document
        document.documentElement.classList.toggle('light-theme', !this.isDarkTheme);
        document.documentElement.classList.toggle('dark-theme', this.isDarkTheme);
        
        // Update theme icon
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            if (this.isDarkTheme) {
                themeToggle.innerHTML = `<span class="visually-hidden">Switch to light theme</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="theme-icon"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>`;
            } else {
                themeToggle.innerHTML = `<span class="visually-hidden">Switch to dark theme</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="theme-icon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
            }
        }
        
        // Save theme preference
        localStorage.setItem('gemini_theme', this.isDarkTheme ? 'dark' : 'light');
    }
    
    /**
     * Load theme preference from localStorage
     */
    loadThemePreference() {
        const savedTheme = localStorage.getItem('gemini_theme');
        if (savedTheme) {
            this.isDarkTheme = savedTheme === 'dark';
            
            // Apply theme to document
            document.documentElement.classList.toggle('light-theme', !this.isDarkTheme);
            document.documentElement.classList.toggle('dark-theme', this.isDarkTheme);
            
            // Update theme icon
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                if (this.isDarkTheme) {
                    themeToggle.innerHTML = `<span class="visually-hidden">Switch to light theme</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="theme-icon"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>`;
                } else {
                    themeToggle.innerHTML = `<span class="visually-hidden">Switch to dark theme</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="theme-icon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
                }
            }
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const app = new AppController();
    await app.init();
});

export default AppController;