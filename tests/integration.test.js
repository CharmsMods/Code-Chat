// Integration Tests for Gemini Chat App
// Tests the complete user flow: input → API call → response → code parsing
// Implements task 10 - Integrate all components and test end-to-end functionality

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import AppController from '../js/app.js';
import ChatManager from '../js/chatManager.js';
import CodePanelManager from '../js/codePanelManager.js';
import GeminiService from '../js/geminiService.js';
import ErrorHandler from '../js/errorHandler.js';
import SyntaxHighlighter from '../js/syntaxHighlighter.js';

// Mock the GoogleGenerativeAI module
vi.mock('@google/generative-ai', () => {
  const generateContentMock = vi.fn();
  const getGenerativeModelMock = vi.fn(() => ({
    generateContent: generateContentMock
  }));
  
  return {
    GoogleGenerativeAI: vi.fn(() => ({
      getGenerativeModel: getGenerativeModelMock
    }))
  };
});

// Set up JSDOM with full HTML structure
const dom = new JSDOM(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gemini Chat App</title>
</head>
<body>
    <div id="app">
        <header class="app-header">
            <h1 class="app-title">Gemini Chat</h1>
            <div class="app-controls">
                <button id="theme-toggle" class="icon-button" aria-label="Toggle dark/light theme">
                    <span class="visually-hidden">Toggle theme</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="theme-icon"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>
                </button>
            </div>
        </header>

        <main class="main-layout">
            <section id="chat-container" class="chat-section">
                <div class="welcome-message">
                    <h2>Welcome to Gemini Chat</h2>
                    <p>Ask me anything or request code examples.</p>
                </div>
                <div id="messages" class="messages-container" role="log" aria-live="polite" aria-label="Chat messages">
                    <!-- Messages will be dynamically inserted here -->
                </div>
            </section>
            
            <aside id="code-panels-container" class="code-panels-section">
                <div class="panels-header">
                    <h2>Code Panels</h2>
                    <button id="collapse-all" class="text-button" aria-label="Collapse all panels">
                        <span>Collapse All</span>
                    </button>
                </div>
                <div class="panels-content">
                    <!-- Code panels will be dynamically inserted here -->
                    <div class="empty-panels-message">
                        <p>Code snippets from the AI will appear here</p>
                    </div>
                </div>
            </aside>
        </main>
        
        <footer id="input-container" class="input-section">
            <div class="input-wrapper">
                <textarea 
                    id="message-input" 
                    class="message-input"
                    placeholder="Type your message here..." 
                    rows="3"
                    aria-label="Message input"
                    maxlength="4000">
                </textarea>
                <button id="send-button" class="send-button" type="button" aria-label="Send message">
                    <span class="send-icon">→</span>
                </button>
            </div>
            <div class="input-status">
                <span id="char-count" class="char-count">0/4000</span>
                <span id="status-message" class="status-message"></span>
            </div>
        </footer>
    </div>
</body>
</html>
`);

// Set up global variables
global.document = dom.window.document;
global.window = dom.window;
global.HTMLElement = dom.window.HTMLElement;
global.CustomEvent = dom.window.CustomEvent;

// Mock navigator.clipboard
Object.defineProperty(global, 'navigator', {
  value: {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined)
    }
  },
  writable: true
});

// Mock localStorage
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};

// Mock window methods
window.dispatchEvent = vi.fn();
window.addEventListener = vi.fn();
window.removeEventListener = vi.fn();

describe('End-to-End Integration Tests', () => {
  let app;
  let mockGenerateContent;
  
  beforeEach(() => {
    // Reset DOM
    document.getElementById('messages').innerHTML = '';
    document.querySelector('.panels-content').innerHTML = '<div class="empty-panels-message"><p>Code snippets from the AI will appear here</p></div>';
    document.getElementById('message-input').value = '';
    
    // Mock localStorage for API key
    localStorage.getItem.mockImplementation((key) => {
      if (key === 'gemini_api_key') return 'test-api-key';
      if (key === 'gemini_theme') return 'dark';
      return null;
    });
    
    // Get reference to the mocked functions
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    mockGenerateContent = GoogleGenerativeAI().getGenerativeModel().generateContent;
    
    // Create app instance
    app = new AppController();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  it('should initialize all components correctly', async () => {
    await app.init();
    
    expect(app.chatManager).toBeTruthy();
    expect(app.codePanelManager).toBeTruthy();
    expect(app.geminiService).toBeTruthy();
    expect(app.errorHandler).toBeTruthy();
  });
  
  it('should handle the complete user flow: input → API call → response → code parsing', async () => {
    // Mock API response with code blocks
    const mockResponse = `Here's a simple JavaScript function:

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

And here's how you would use it:

\`\`\`javascript
const message = greet('World');
console.log(message); // Outputs: Hello, World!
\`\`\``;

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => mockResponse
      }
    });
    
    // Initialize app
    await app.init();
    
    // Set up user input
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    messageInput.value = 'Show me a simple JavaScript function';
    
    // Spy on methods
    const sendMessageSpy = vi.spyOn(app.chatManager, 'sendMessage');
    const processResponseSpy = vi.spyOn(app.codePanelManager, 'processResponse');
    
    // Send message
    sendButton.click();
    
    // Wait for async operations
    await vi.waitFor(() => {
      expect(sendMessageSpy).toHaveBeenCalledWith('Show me a simple JavaScript function');
      expect(mockGenerateContent).toHaveBeenCalledWith('Show me a simple JavaScript function');
      expect(processResponseSpy).toHaveBeenCalled();
    });
    
    // Check that messages were added to the chat
    const messages = document.querySelectorAll('.message');
    expect(messages.length).toBe(2); // User message and AI response
    
    // Check that code panels were created
    const codePanels = document.querySelectorAll('.code-panel');
    expect(codePanels.length).toBe(2); // Two code blocks in the response
    
    // Check that empty message is hidden
    const emptyMessage = document.querySelector('.empty-panels-message');
    expect(emptyMessage.style.display).toBe('none');
  });
  
  it('should handle clipboard functionality', async () => {
    // Mock API response with code block
    const mockResponse = `\`\`\`javascript
console.log('Hello, World!');
\`\`\``;

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => mockResponse
      }
    });
    
    // Initialize app
    await app.init();
    
    // Send message
    await app.chatManager.sendMessage('Show me a hello world example');
    
    // Wait for code panel to be created
    await vi.waitFor(() => {
      const codePanels = document.querySelectorAll('.code-panel');
      expect(codePanels.length).toBe(1);
    });
    
    // Get copy button
    const copyButton = document.querySelector('.copy-button');
    expect(copyButton).toBeTruthy();
    
    // Spy on clipboard API
    const clipboardSpy = vi.spyOn(navigator.clipboard, 'writeText');
    
    // Click copy button
    copyButton.click();
    
    // Check that clipboard API was called with the correct code
    expect(clipboardSpy).toHaveBeenCalledWith("console.log('Hello, World!');");
  });
  
  it('should handle chat history management and memory limits', async () => {
    // Initialize app
    await app.init();
    
    // Mock API response
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'This is a test response'
      }
    });
    
    // Send multiple messages
    for (let i = 0; i < 10; i++) {
      await app.chatManager.sendMessage(`Test message ${i}`);
    }
    
    // Check that messages were added to the chat
    const messages = document.querySelectorAll('.message');
    expect(messages.length).toBe(20); // 10 user messages + 10 AI responses
    
    // Check that messages array doesn't exceed limit (if implemented)
    expect(app.chatManager.messages.length).toBe(20);
    
    // Test clear functionality
    app.clearAll();
    
    // Check that messages were cleared
    const messagesAfterClear = document.querySelectorAll('.message');
    expect(messagesAfterClear.length).toBe(0);
    expect(app.chatManager.messages.length).toBe(0);
  });
  
  it('should validate responsive design and mobile compatibility', async () => {
    // Initialize app
    await app.init();
    
    // Test desktop layout (width >= 768px)
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    window.dispatchEvent(new Event('resize'));
    
    // Check desktop layout
    expect(app.codePanelManager.isGridLayout).toBe(true);
    expect(document.querySelector('.layout-splitter')).toBeTruthy();
    expect(document.querySelector('.panels-grid')).toBeTruthy();
    
    // Test mobile layout (width < 768px)
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
    window.dispatchEvent(new Event('resize'));
    
    // Check mobile layout
    expect(app.codePanelManager.isGridLayout).toBe(false);
    expect(document.querySelector('.toggle-panels-button')).toBeTruthy();
    expect(document.getElementById('code-panels-container').classList.contains('mobile-hidden')).toBe(true);
    
    // Test toggle panels on mobile
    const toggleButton = document.querySelector('.toggle-panels-button');
    toggleButton.click();
    
    // Check that panels are visible
    expect(document.getElementById('code-panels-container').classList.contains('mobile-visible')).toBe(true);
  });
  
  it('should handle error scenarios gracefully', async () => {
    // Mock API error
    mockGenerateContent.mockRejectedValue(new Error('API error'));
    
    // Initialize app
    await app.init();
    
    // Spy on error display method
    const displayErrorSpy = vi.spyOn(app.chatManager, 'displayError');
    
    // Send message
    await app.chatManager.sendMessage('Trigger error');
    
    // Check that error was displayed
    expect(displayErrorSpy).toHaveBeenCalled();
    
    // Check that error message was added to chat
    const errorMessage = document.querySelector('.error-message');
    expect(errorMessage).toBeTruthy();
  });
  
  it('should handle theme toggling', async () => {
    // Initialize app
    await app.init();
    
    // Get theme toggle button
    const themeToggle = document.getElementById('theme-toggle');
    
    // Check initial theme
    expect(app.isDarkTheme).toBe(true);
    
    // Toggle theme
    themeToggle.click();
    
    // Check that theme was toggled
    expect(app.isDarkTheme).toBe(false);
    expect(document.documentElement.classList.contains('light-theme')).toBe(true);
    expect(document.documentElement.classList.contains('dark-theme')).toBe(false);
    
    // Toggle theme back
    themeToggle.click();
    
    // Check that theme was toggled back
    expect(app.isDarkTheme).toBe(true);
    expect(document.documentElement.classList.contains('dark-theme')).toBe(true);
    expect(document.documentElement.classList.contains('light-theme')).toBe(false);
  });
  
  it('should handle API key management', async () => {
    // Mock localStorage to return null for API key
    localStorage.getItem.mockImplementation((key) => {
      if (key === 'gemini_api_key') return null;
      return null;
    });
    
    // Initialize app
    await app.init();
    
    // Check that API key prompt is shown
    const apiKeyForm = document.querySelector('.api-key-form');
    expect(apiKeyForm).toBeTruthy();
    
    // Set API key
    const apiKeyInput = document.getElementById('api-key-input');
    const saveButton = document.getElementById('save-api-key');
    
    apiKeyInput.value = 'new-api-key';
    saveButton.click();
    
    // Check that API key was saved
    expect(localStorage.setItem).toHaveBeenCalledWith('gemini_api_key', 'new-api-key');
  });
});