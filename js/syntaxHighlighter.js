// Syntax Highlighter - Handles code syntax highlighting
// Implements requirement 2.3 - Apply syntax highlighting appropriate to the detected language

/**
 * Class for handling syntax highlighting of code blocks
 */
class SyntaxHighlighter {
    /**
     * Create a new SyntaxHighlighter instance
     */
    constructor() {
        // Define language patterns for common languages
        this.languagePatterns = {
            javascript: {
                keywords: [
                    'const', 'let', 'var', 'function', 'class', 'extends', 'return', 'if', 'else', 
                    'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'new', 
                    'try', 'catch', 'finally', 'throw', 'async', 'await', 'import', 'export', 'from',
                    'static', 'get', 'set', 'null', 'undefined', 'true', 'false', 'this', 'super'
                ],
                operators: ['=>', '===', '!==', '==', '!=', '>=', '<=', '>', '<', '+', '-', '*', '/', '%', '&&', '||', '!', '??', '?.'],
                punctuation: [';', ',', '.', ':', '{', '}', '(', ')', '[', ']'],
                strings: [
                    { pattern: /"(?:\\.|[^"\\])*"/, className: 'string' },
                    { pattern: /'(?:\\.|[^'\\])*'/, className: 'string' },
                    { pattern: /`(?:\\.|[^`\\])*`/, className: 'string template' }
                ],
                comments: [
                    { pattern: /\/\/.*/, className: 'comment' },
                    { pattern: /\/\*[\s\S]*?\*\//, className: 'comment block' }
                ],
                numbers: /\b-?\d+(\.\d+)?\b/
            },
            html: {
                tags: [
                    { pattern: /(<\/?)([\w-]+)/, className: 'tag' },
                    { pattern: /([\w-]+)(=)/, className: 'attribute' }
                ],
                strings: [
                    { pattern: /"(?:\\.|[^"\\])*"/, className: 'string' },
                    { pattern: /'(?:\\.|[^'\\])*'/, className: 'string' }
                ],
                comments: [
                    { pattern: /<!--[\s\S]*?-->/, className: 'comment' }
                ],
                doctype: { pattern: /<!DOCTYPE[\s\S]*?>/, className: 'doctype' }
            },
            css: {
                selectors: { pattern: /[^{}\s][^{}]*(?=\s*\{)/, className: 'selector' },
                properties: { pattern: /[\w-]+(?=\s*:)/, className: 'property' },
                values: { pattern: /:[^;]+/, className: 'value' },
                punctuation: [';', '{', '}', ':', ','],
                comments: [
                    { pattern: /\/\*[\s\S]*?\*\//, className: 'comment' }
                ],
                atrules: { pattern: /@[\w-]+/, className: 'at-rule' }
            },
            python: {
                keywords: [
                    'def', 'class', 'from', 'import', 'as', 'return', 'if', 'elif', 'else', 'for', 
                    'while', 'try', 'except', 'finally', 'with', 'pass', 'break', 'continue', 'and', 
                    'or', 'not', 'is', 'in', 'lambda', 'None', 'True', 'False', 'self', 'async', 'await'
                ],
                operators: ['==', '!=', '>=', '<=', '>', '<', '+', '-', '*', '/', '%', '**', '//'],
                punctuation: [':', ',', '.', ';', '(', ')', '[', ']', '{', '}'],
                strings: [
                    { pattern: /"(?:\\.|[^"\\])*"/, className: 'string' },
                    { pattern: /'(?:\\.|[^'\\])*'/, className: 'string' },
                    { pattern: /"""[\s\S]*?"""/, className: 'string multiline' },
                    { pattern: /'''[\s\S]*?'''/, className: 'string multiline' }
                ],
                comments: [
                    { pattern: /#.*/, className: 'comment' }
                ],
                numbers: /\b-?\d+(\.\d+)?\b/,
                decorators: { pattern: /@[\w.]+/, className: 'decorator' }
            }
        };
        
        // Define language aliases
        this.languageAliases = {
            'js': 'javascript',
            'py': 'python',
            'ts': 'javascript', // TypeScript - simplified as JavaScript for now
            'jsx': 'javascript',
            'tsx': 'javascript',
            'json': 'javascript',
            'scss': 'css',
            'less': 'css',
            'xml': 'html',
            'svg': 'html'
        };
    }

    /**
     * Apply syntax highlighting to code based on language
     * @param {string} code - The code to highlight
     * @param {string} language - The programming language
     * @returns {string} HTML with syntax highlighting
     */
    highlight(code, language) {
        if (!code) {
            if (code === '') {
                return `<pre><code class="language-${language || 'text'}"></code></pre>`;
            }
            return '';
        }
        
        // Escape HTML first to prevent XSS
        const escapedCode = this.escapeHtml(code);
        
        // If no language specified or not supported, try to detect it
        if (!language) {
            const detectedLang = this.detectLanguage(code);
            language = detectedLang || 'text';
        }
        
        // Normalize language name (handle aliases)
        language = this.normalizeLanguageName(language);
        
        // If language is not supported, return escaped code
        if (language === 'text' || !this.languagePatterns[language]) {
            return `<pre><code class="language-${language}">${escapedCode}</code></pre>`;
        }
        
        // Apply highlighting based on language
        let highlightedCode = escapedCode;
        
        switch (language) {
            case 'javascript':
                highlightedCode = this.highlightJavaScript(escapedCode);
                break;
            case 'html':
                highlightedCode = this.highlightHtml(escapedCode);
                break;
            case 'css':
                highlightedCode = this.highlightCss(escapedCode);
                break;
            case 'python':
                highlightedCode = this.highlightPython(escapedCode);
                break;
            default:
                // No highlighting for unsupported languages
                break;
        }
        
        return `<pre><code class="language-${language}">${highlightedCode}</code></pre>`;
    }

    /**
     * Highlight JavaScript code
     * @param {string} code - The escaped code to highlight
     * @returns {string} Highlighted HTML
     */
    highlightJavaScript(code) {
        const patterns = this.languagePatterns.javascript;
        let result = code;
        
        // Create a simple tokenizer for JavaScript
        // This is a simplified approach - in a real-world scenario, we would use a proper tokenizer
        
        // First, let's create a temporary representation to avoid HTML conflicts
        result = result.replace(/&lt;/g, '{{LT}}');
        result = result.replace(/&gt;/g, '{{GT}}');
        result = result.replace(/&amp;/g, '{{AMP}}');
        result = result.replace(/&quot;/g, '{{QUOT}}');
        result = result.replace(/&apos;/g, '{{APOS}}');
        
        // Highlight keywords
        patterns.keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'g');
            result = result.replace(regex, `<span class="keyword">${keyword}</span>`);
        });
        
        // Highlight strings
        result = result.replace(/"([^"]*)"/g, '<span class="string">"$1"</span>');
        result = result.replace(/'([^']*)'/g, '<span class="string">\'$1\'</span>');
        
        // Highlight comments
        result = result.replace(/\/\/(.*)$/gm, '<span class="comment">//$1</span>');
        
        // Highlight numbers
        result = result.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="number">$1</span>');
        
        // Restore HTML entities
        result = result.replace(/{{LT}}/g, '&lt;');
        result = result.replace(/{{GT}}/g, '&gt;');
        result = result.replace(/{{AMP}}/g, '&amp;');
        result = result.replace(/{{QUOT}}/g, '&quot;');
        result = result.replace(/{{APOS}}/g, '&apos;');
        
        return result;
    }

    /**
     * Highlight HTML code
     * @param {string} code - The escaped code to highlight
     * @returns {string} Highlighted HTML
     */
    highlightHtml(code) {
        const patterns = this.languagePatterns.html;
        let result = code;
        
        // Highlight doctype
        result = this.replaceWithSpan(result, patterns.doctype.pattern, patterns.doctype.className);
        
        // Highlight comments
        patterns.comments.forEach(pattern => {
            result = this.replaceWithSpan(result, pattern.pattern, `comment ${pattern.className || ''}`);
        });
        
        // Highlight strings
        patterns.strings.forEach(pattern => {
            result = this.replaceWithSpan(result, pattern.pattern, `string ${pattern.className || ''}`);
        });
        
        // Highlight tags and attributes
        result = result.replace(/(&lt;\/?)([a-zA-Z0-9-]+)/g, 
            '$1<span class="tag">$2</span>');
        
        result = result.replace(/([a-zA-Z0-9-]+)(=)(&quot;|&apos;)/g, 
            '<span class="attribute">$1</span>$2$3');
        
        return result;
    }

    /**
     * Highlight CSS code
     * @param {string} code - The escaped code to highlight
     * @returns {string} Highlighted HTML
     */
    highlightCss(code) {
        const patterns = this.languagePatterns.css;
        let result = code;
        
        // Highlight comments
        patterns.comments.forEach(pattern => {
            result = this.replaceWithSpan(result, pattern.pattern, `comment ${pattern.className || ''}`);
        });
        
        // Highlight at-rules
        result = this.replaceWithSpan(result, patterns.atrules.pattern, patterns.atrules.className);
        
        // Highlight selectors
        result = result.replace(/([^{}\s][^{}]*?)({)/g, 
            '<span class="selector">$1</span>$2');
        
        // Highlight properties
        result = result.replace(/([\s{;])([\w-]+)(\s*:)/g, 
            '$1<span class="property">$2</span>$3');
        
        // Highlight values
        result = result.replace(/(:)([^;{}]+)(;|(?=\}))/g, 
            '$1<span class="value">$2</span>$3');
        
        return result;
    }

    /**
     * Highlight Python code
     * @param {string} code - The escaped code to highlight
     * @returns {string} Highlighted HTML
     */
    highlightPython(code) {
        const patterns = this.languagePatterns.python;
        let result = code;
        
        // Create a simple tokenizer for Python
        // This is a simplified approach - in a real-world scenario, we would use a proper tokenizer
        
        // First, let's create a temporary representation to avoid HTML conflicts
        result = result.replace(/&lt;/g, '{{LT}}');
        result = result.replace(/&gt;/g, '{{GT}}');
        result = result.replace(/&amp;/g, '{{AMP}}');
        result = result.replace(/&quot;/g, '{{QUOT}}');
        result = result.replace(/&apos;/g, '{{APOS}}');
        
        // Highlight keywords
        patterns.keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'g');
            result = result.replace(regex, `<span class="keyword">${keyword}</span>`);
        });
        
        // Highlight strings
        result = result.replace(/"([^"]*)"/g, '<span class="string">"$1"</span>');
        result = result.replace(/'([^']*)'/g, '<span class="string">\'$1\'</span>');
        
        // Highlight comments
        result = result.replace(/#(.*)$/gm, '<span class="comment">#$1</span>');
        
        // Highlight decorators
        result = result.replace(/@[\w.]+/g, '<span class="decorator">$&</span>');
        
        // Highlight numbers
        result = result.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="number">$1</span>');
        
        // Restore HTML entities
        result = result.replace(/{{LT}}/g, '&lt;');
        result = result.replace(/{{GT}}/g, '&gt;');
        result = result.replace(/{{AMP}}/g, '&amp;');
        result = result.replace(/{{QUOT}}/g, '&quot;');
        result = result.replace(/{{APOS}}/g, '&apos;');
        
        return result;
    }

    /**
     * Replace pattern matches with span elements
     * @param {string} text - The text to process
     * @param {RegExp} pattern - The pattern to match
     * @param {string} className - The CSS class name to apply
     * @returns {string} Text with spans added
     */
    replaceWithSpan(text, pattern, className) {
        if (typeof pattern === 'string') {
            pattern = new RegExp(this.escapeRegExp(pattern), 'g');
        }
        return text.replace(pattern, match => `<span class="${className}">${match}</span>`);
    }

    /**
     * Escape special characters in a string for use in a RegExp
     * @param {string} string - The string to escape
     * @returns {string} Escaped string
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Normalize language name (handle aliases)
     * @param {string} language - The language name to normalize
     * @returns {string} Normalized language name
     */
    normalizeLanguageName(language) {
        if (!language) return 'text';
        
        language = language.toLowerCase();
        
        // Check if it's an alias
        if (this.languageAliases[language]) {
            return this.languageAliases[language];
        }
        
        // Check if it's a supported language
        if (this.languagePatterns[language]) {
            return language;
        }
        
        return 'text';
    }

    /**
     * Attempt to detect the language from code content
     * @param {string} code - The code to analyze
     * @returns {string|null} Detected language or null if unknown
     */
    detectLanguage(code) {
        if (!code || typeof code !== 'string') return null;
        
        // Simple heuristics for language detection
        const trimmedCode = code.trim();
        
        // Check for HTML
        if (trimmedCode.startsWith('<') && 
            (trimmedCode.includes('<!DOCTYPE') || 
             trimmedCode.includes('<html') || 
             trimmedCode.includes('<div') || 
             trimmedCode.includes('<body'))) {
            return 'html';
        }
        
        // Check for CSS
        if (trimmedCode.includes('{') && 
            trimmedCode.includes('}') && 
            (trimmedCode.includes(':') && 
             trimmedCode.includes(';') && 
             !trimmedCode.includes('function'))) {
            return 'css';
        }
        
        // Check for Python - look for Python-specific patterns
        if ((trimmedCode.includes('def ') || 
             trimmedCode.includes('class ') || 
             trimmedCode.includes('import ') ||
             trimmedCode.includes('print(')) && 
            (trimmedCode.includes(':') || trimmedCode.includes('__init__')) && 
            !trimmedCode.includes('{') && 
            !trimmedCode.includes('function')) {
            return 'python';
        }
        
        // Default to JavaScript for most other cases
        if (trimmedCode.includes('function') || 
            trimmedCode.includes('const ') || 
            trimmedCode.includes('let ') || 
            trimmedCode.includes('var ') || 
            trimmedCode.includes('=>') || 
            (trimmedCode.includes('import ') && trimmedCode.includes('from '))) {
            return 'javascript';
        }
        
        return null;
    }

    /**
     * Escape HTML special characters to prevent XSS
     * @param {string} text - The text to escape
     * @returns {string} Escaped HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        
        const htmlEntities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&apos;'
        };
        
        return text.replace(/[&<>"']/g, char => htmlEntities[char]);
    }
}

export default SyntaxHighlighter;