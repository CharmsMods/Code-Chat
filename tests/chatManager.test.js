// Unit tests for ChatManager
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import ChatManager from '../js/chatManager.js';

// Set up JSDOM
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<body>
    <div id="messages" class="messages-container"></div>
    <textarea id="message-input"></textarea>
    <button id="send-button"></button>
    <span id="char-count">0/4000</span>
    <span id="status-message"></span>
</body>
</html>
`);

// Set up global variables
global.document = dom.window.document;
global.window = dom.window;
global.HTMLElement = dom.window.HTMLElement;

// Mock GeminiService
class MockGeminiService {
    async generateResponse(prompt) {
        return `Mock response to: ${prompt}`;
    }
}

describe('ChatManager', () => {
    let chatManager;
    let mockGeminiService;
    
    beforeEach(() => {
        // Clear DOM
        document.getElementById('messages').innerHTML = '';
        document.getElementById('message-input').value = '';
        document.getElementById('char-count').textContent = '0/4000';
        document.getElementById('status-message').textContent = '';
        
        // Create fresh instances
        mockGeminiService = new MockGeminiService();
        chatManager = new ChatManager(mockGeminiService);
    });
    
    it('should initialize correctly', () => {
        expect(chatManager.geminiService).toBe(mockGeminiService);
        expect(chatManager.messages).toEqual([]);
        expect(chatManager.isProcessing).toBe(false);
    });
    
    it('should throw error if initialized without GeminiService', () => {
        expect(() => new ChatManager()).toThrow('GeminiService is required');
    });
    
    it('should add user message correctly', () => {
        const message = chatManager.addMessage('Hello, world!', true);
        
        expect(message.content).toBe('Hello, world!');
        expect(message.isUser).toBe(true);
        expect(chatManager.messages.length).toBe(1);
        
        // Check DOM update
        const messageElements = document.querySelectorAll('.message');
        expect(messageElements.length).toBe(1);
        expect(messageElements[0].classList.contains('user-message')).toBe(true);
        expect(messageElements[0].querySelector('.message-content').textContent).toBe('Hello, world!');
    });
    
    it('should add AI message correctly', () => {
        const message = chatManager.addMessage('AI response', false);
        
        expect(message.content).toBe('AI response');
        expect(message.isUser).toBe(false);
        expect(chatManager.messages.length).toBe(1);
        
        // Check DOM update
        const messageElements = document.querySelectorAll('.message');
        expect(messageElements.length).toBe(1);
        expect(messageElements[0].classList.contains('ai-message')).toBe(true);
        expect(messageElements[0].querySelector('.message-content').textContent).toBe('AI response');
    });
    
    it('should send message and get AI response', async () => {
        // Spy on addMessage method
        const addMessageSpy = vi.spyOn(chatManager, 'addMessage');
        
        await chatManager.sendMessage('Hello AI');
        
        // Should call addMessage twice (user message and AI response)
        expect(addMessageSpy).toHaveBeenCalledTimes(2);
        expect(addMessageSpy).toHaveBeenNthCalledWith(1, 'Hello AI', true);
        expect(addMessageSpy).toHaveBeenNthCalledWith(2, 'Mock response to: Hello AI', false);
        
        // Check messages array
        expect(chatManager.messages.length).toBe(2);
        expect(chatManager.messages[0].content).toBe('Hello AI');
        expect(chatManager.messages[0].isUser).toBe(true);
        expect(chatManager.messages[1].content).toBe('Mock response to: Hello AI');
        expect(chatManager.messages[1].isUser).toBe(false);
    });
    
    it('should handle API errors', async () => {
        // Override mock to throw error
        mockGeminiService.generateResponse = vi.fn().mockRejectedValue(new Error('API error'));
        
        // Spy on updateStatus method
        const updateStatusSpy = vi.spyOn(chatManager, 'updateStatus');
        
        await chatManager.sendMessage('Trigger error');
        
        // Should call updateStatus with error message
        expect(updateStatusSpy).toHaveBeenCalledWith('Error: API error', true);
        
        // Should still add user message but not AI message
        expect(chatManager.messages.length).toBe(1);
        expect(chatManager.messages[0].content).toBe('Trigger error');
        expect(chatManager.messages[0].isUser).toBe(true);
    });
    
    it('should handle form submission', () => {
        // Set up input value
        const input = document.getElementById('message-input');
        input.value = 'Test message';
        
        // Spy on sendMessage method
        const sendMessageSpy = vi.spyOn(chatManager, 'sendMessage');
        
        // Trigger submit
        chatManager.handleSubmit();
        
        // Should call sendMessage and clear input
        expect(sendMessageSpy).toHaveBeenCalledWith('Test message');
        expect(input.value).toBe('');
    });
    
    it('should not submit empty messages', () => {
        // Set up empty input value
        const input = document.getElementById('message-input');
        input.value = '   ';
        
        // Spy on sendMessage method
        const sendMessageSpy = vi.spyOn(chatManager, 'sendMessage');
        
        // Trigger submit
        chatManager.handleSubmit();
        
        // Should not call sendMessage
        expect(sendMessageSpy).not.toHaveBeenCalled();
    });
    
    it('should clear messages', () => {
        // Add some messages
        chatManager.addMessage('Message 1', true);
        chatManager.addMessage('Message 2', false);
        
        expect(chatManager.messages.length).toBe(2);
        expect(document.querySelectorAll('.message').length).toBe(2);
        
        // Clear messages
        chatManager.clearMessages();
        
        expect(chatManager.messages.length).toBe(0);
        expect(document.querySelectorAll('.message').length).toBe(0);
    });
    
    it('should format timestamp correctly', () => {
        // Mock Date.prototype.toLocaleTimeString
        const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;
        Date.prototype.toLocaleTimeString = vi.fn().mockReturnValue('2:30 PM');
        
        const date = new Date(2023, 0, 1, 14, 30); // Jan 1, 2023, 2:30 PM
        const formatted = chatManager.formatTimestamp(date);
        
        expect(formatted).toBe('2:30 PM');
        
        // Restore original method
        Date.prototype.toLocaleTimeString = originalToLocaleTimeString;
    });
});