// Clipboard Functionality Tests
// Tests clipboard functionality across different browser environments
// Implements task 10 - Verify clipboard functionality across different browsers

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import CodePanelManager from '../js/codePanelManager.js';

// Set up JSDOM
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<body>
  <div id="code-panels-container">
    <div class="panels-content"></div>
    <div class="empty-panels-message"></div>
    <button id="collapse-all"></button>
  </div>
</body>
</html>
`);

// Set up global variables
global.document = dom.window.document;
global.window = dom.window;
global.HTMLElement = dom.window.HTMLElement;

// Mock SyntaxHighlighter
vi.mock('../js/syntaxHighlighter.js', () => {
  return {
    default: class MockSyntaxHighlighter {
      highlight(code, language) {
        return `<pre><code class="language-${language || 'text'}">${code}</code></pre>`;
      }
      
      detectLanguage(code) {
        if (code.includes('function')) return 'javascript';
        if (code.includes('<div>')) return 'html';
        if (code.includes('{') && code.includes('}') && code.includes(':')) return 'css';
        if (code.includes('def ') && code.includes(':')) return 'python';
        return null;
      }
    }
  };
});

describe('Clipboard Functionality', () => {
  let codePanelManager;
  
  beforeEach(() => {
    // Reset DOM
    document.querySelector('.panels-content').innerHTML = '';
    document.querySelector('.empty-panels-message').style.display = '';
    
    // Create new instance
    codePanelManager = new CodePanelManager();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Modern browsers with Clipboard API', () => {
    beforeEach(() => {
      // Mock Clipboard API
      Object.defineProperty(global, 'navigator', {
        value: {
          clipboard: {
            writeText: vi.fn().mockResolvedValue(undefined)
          }
        },
        writable: true
      });
      
      // Ensure secure context
      Object.defineProperty(window, 'isSecureContext', { value: true });
    });
    
    it('should use Clipboard API when available', async () => {
      // Create a code panel
      const panel = codePanelManager.createCodePanel('console.log("test")', 'javascript', 'test.js');
      
      // Get copy button
      const copyButton = panel.querySelector('.copy-button');
      
      // Click copy button
      copyButton.click();
      
      // Check that Clipboard API was used
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('console.log("test")');
    });
    
    it('should show success feedback after copying', async () => {
      // Create a code panel
      const panel = codePanelManager.createCodePanel('console.log("test")', 'javascript', 'test.js');
      
      // Get copy button
      const copyButton = panel.querySelector('.copy-button');
      const originalHTML = copyButton.innerHTML;
      
      // Mock timer functions
      vi.useFakeTimers();
      
      // Click copy button
      copyButton.click();
      
      // Check that success feedback is shown
      expect(copyButton.classList.contains('success')).toBe(true);
      
      // Fast-forward timers
      vi.advanceTimersByTime(2000);
      
      // Check that button is reset
      expect(copyButton.classList.contains('success')).toBe(false);
      
      // Restore real timers
      vi.useRealTimers();
    });
    
    it('should handle Clipboard API errors', async () => {
      // Mock Clipboard API to reject
      Object.defineProperty(global, 'navigator', {
        value: {
          clipboard: {
            writeText: vi.fn().mockRejectedValue(new Error('Permission denied'))
          }
        },
        writable: true
      });
      
      // Create a code panel
      const panel = codePanelManager.createCodePanel('console.log("test")', 'javascript', 'test.js');
      
      // Get copy button
      const copyButton = panel.querySelector('.copy-button');
      
      // Click copy button
      copyButton.click();
      
      // Wait for promise rejection to be handled
      await vi.waitFor(() => {
        expect(copyButton.classList.contains('error')).toBe(true);
      });
    });
  });
  
  describe('Legacy browsers without Clipboard API', () => {
    beforeEach(() => {
      // Mock non-secure context or no Clipboard API
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true
      });
      
      Object.defineProperty(window, 'isSecureContext', { value: false });
      
      // Mock document.execCommand
      document.execCommand = vi.fn().mockReturnValue(true);
    });
    
    it('should fall back to execCommand in older browsers', () => {
      // Create a code panel
      const panel = codePanelManager.createCodePanel('console.log("test")', 'javascript', 'test.js');
      
      // Get copy button
      const copyButton = panel.querySelector('.copy-button');
      
      // Click copy button
      copyButton.click();
      
      // Check that execCommand was used
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });
    
    it('should handle execCommand failures', () => {
      // Mock execCommand to fail
      document.execCommand = vi.fn().mockReturnValue(false);
      
      // Create a code panel
      const panel = codePanelManager.createCodePanel('console.log("test")', 'javascript', 'test.js');
      
      // Get copy button
      const copyButton = panel.querySelector('.copy-button');
      
      // Click copy button
      copyButton.click();
      
      // Check that error feedback is shown
      expect(copyButton.classList.contains('error')).toBe(true);
    });
    
    it('should handle execCommand exceptions', () => {
      // Mock execCommand to throw
      document.execCommand = vi.fn().mockImplementation(() => {
        throw new Error('Not supported');
      });
      
      // Create a code panel
      const panel = codePanelManager.createCodePanel('console.log("test")', 'javascript', 'test.js');
      
      // Get copy button
      const copyButton = panel.querySelector('.copy-button');
      
      // Click copy button
      copyButton.click();
      
      // Check that error feedback is shown
      expect(copyButton.classList.contains('error')).toBe(true);
    });
  });
  
  describe('Mobile browsers', () => {
    beforeEach(() => {
      // Set window width to mobile
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      
      // Mock touch events
      window.TouchEvent = dom.window.Event;
      
      // Mock Clipboard API
      Object.defineProperty(global, 'navigator', {
        value: {
          clipboard: {
            writeText: vi.fn().mockResolvedValue(undefined)
          }
        },
        writable: true
      });
    });
    
    it('should handle touch events on mobile', () => {
      // Create new instance for mobile
      const mobilePanelManager = new CodePanelManager();
      
      // Create a code panel
      const panel = mobilePanelManager.createCodePanel('console.log("test")', 'javascript', 'test.js');
      
      // Get copy button
      const copyButton = panel.querySelector('.copy-button');
      
      // Create touch event
      const touchEvent = new window.TouchEvent('touchend');
      
      // Dispatch touch event
      copyButton.dispatchEvent(touchEvent);
      
      // Check that Clipboard API was used
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('console.log("test")');
    });
  });
});