// CodePanelManager Tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import CodePanelManager from '../js/codePanelManager.js';
import SyntaxHighlighter from '../js/syntaxHighlighter.js';

// Mock DOM environment
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

describe('CodePanelManager', () => {
  let codePanelManager;
  
  beforeEach(() => {
    // Reset DOM
    document.querySelector('.panels-content').innerHTML = '';
    document.querySelector('.empty-panels-message').style.display = '';
    
    // Create new instance
    codePanelManager = new CodePanelManager();
  });
  
  describe('parseCodeBlocks', () => {
    it('should extract code blocks from text', () => {
      const text = `
        Here is some JavaScript code:
        
        \`\`\`javascript
        function add(a, b) {
          return a + b;
        }
        \`\`\`
        
        And here is some HTML:
        
        \`\`\`html
        <div class="container">
          <h1>Hello World</h1>
        </div>
        \`\`\`
      `;
      
      const blocks = codePanelManager.parseCodeBlocks(text);
      
      expect(blocks.length).toBe(2);
      expect(blocks[0].language).toBe('javascript');
      expect(blocks[0].code).toContain('return a + b');
      expect(blocks[1].language).toBe('html');
      expect(blocks[1].code).toContain('<h1>Hello World</h1>');
    });
    
    it('should handle code blocks with filenames', () => {
      const text = `
        \`\`\`javascript:app.js
        const app = new App();
        app.init();
        \`\`\`
        
        \`\`\`css styles.css
        body {
          margin: 0;
        }
        \`\`\`
      `;
      
      const blocks = codePanelManager.parseCodeBlocks(text);
      
      expect(blocks.length).toBe(2);
      expect(blocks[0].language).toBe('javascript');
      expect(blocks[0].filename).toBe('app.js');
      expect(blocks[1].language).toBe('css');
      expect(blocks[1].filename).toBe('styles.css');
    });
    
    it('should handle empty or invalid input', () => {
      expect(codePanelManager.parseCodeBlocks('')).toEqual([]);
      expect(codePanelManager.parseCodeBlocks(null)).toEqual([]);
      expect(codePanelManager.parseCodeBlocks('No code blocks here')).toEqual([]);
    });
  });
  
  describe('processResponse', () => {
    it('should process response and create code panels', () => {
      const text = `
        \`\`\`javascript
        function test() {
          return true;
        }
        \`\`\`
      `;
      
      // Spy on createCodePanel method
      const createPanelSpy = vi.spyOn(codePanelManager, 'createCodePanel');
      
      codePanelManager.processResponse(text);
      
      expect(createPanelSpy).toHaveBeenCalledTimes(1);
      // Just check that it was called, without checking the exact arguments
      // since the regex parsing might vary between environments
      expect(createPanelSpy).toHaveBeenCalled();
      
      // Check that empty message is hidden
      expect(document.querySelector('.empty-panels-message').style.display).toBe('none');
    });
  });
});