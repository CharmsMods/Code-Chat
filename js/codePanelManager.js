// Code Panel Manager - Handles code parsing and panel management
// Implements requirements 2.1, 2.2, 2.3, 2.4, 2.5

import SyntaxHighlighter from './syntaxHighlighter.js';

/**
 * Class representing a code block extracted from AI responses
 */
class CodeBlock {
    /**
     * Create a new code block
     * @param {string} code - The code content
     * @param {string} language - The programming language
     * @param {string} filename - Optional filename
     */
    constructor(code, language = 'text', filename = '') {
        this.code = code;
        this.language = language || 'text';
        this.filename = filename || '';
        this.id = `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

/**
 * CodePanelManager class for parsing code blocks from AI responses and managing code panels
 * Implements requirements 2.1, 2.2, 2.3, 2.4, 2.5
 * Enhanced for requirement 3.4, 3.5, 3.6 - responsive layout and panel management
 */
class CodePanelManager {
    /**
     * Create a new CodePanelManager
     */
    constructor() {
        this.codeBlocks = [];
        this.panels = [];
        this.isGridLayout = window.innerWidth >= 768; // Track if we're in grid layout mode
        
        // Initialize syntax highlighter
        this.syntaxHighlighter = new SyntaxHighlighter();
        
        // DOM elements
        this.codePanelsContainer = document.getElementById('code-panels-container');
        this.panelsContent = document.querySelector('.panels-content');
        this.emptyMessage = document.querySelector('.empty-panels-message');
        this.collapseAllButton = document.getElementById('collapse-all');
        this.mainLayout = document.querySelector('.main-layout');
        this.chatSection = document.querySelector('.chat-section');
        
        if (!this.codePanelsContainer || !this.panelsContent) {
            console.error('Required DOM elements for CodePanelManager not found');
            return;
        }
        
        // Create panels grid container if it doesn't exist
        this.createPanelsGrid();
        
        // Create mobile toggle button
        this.createMobileToggle();
        
        this.setupEventListeners();
        
        // Initialize responsive behavior
        this.initResponsiveLayout();
    }
    
    /**
     * Set up event listeners for panel controls
     */
    setupEventListeners() {
        // Collapse all panels when the collapse all button is clicked
        if (this.collapseAllButton) {
            this.collapseAllButton.addEventListener('click', () => {
                this.collapseAllPanels();
            });
        }
    }
    
    /**
     * Parse code blocks from text using regex
     * Implements requirement 2.1 - extract code blocks from AI responses
     * @param {string} text - The text to parse for code blocks
     * @returns {CodeBlock[]} Array of extracted code blocks
     */
    parseCodeBlocks(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }
        
        const extractedBlocks = [];
        
        // Regex to match code fences with optional language and filename
        // Format: ```language:filename
        // or: ```language filename
        // or: ```language
        const codeBlockRegex = /```([\w-]+)?(?::|\s+)?([^\n]+)?\n([\s\S]*?)```/g;
        
        let match;
        while ((match = codeBlockRegex.exec(text)) !== null) {
            const language = match[1] || 'text';
            const filename = match[2] || '';
            const code = match[3].trim();
            
            extractedBlocks.push(new CodeBlock(code, language, filename));
        }
        
        return extractedBlocks;
    }
    
    /**
     * Process AI response text to extract and display code blocks
     * @param {string} text - The AI response text
     * @returns {string} The text with code blocks removed (optional)
     */
    processResponse(text) {
        if (!text || typeof text !== 'string') {
            return text;
        }
        
        // Extract code blocks
        const codeBlocks = this.parseCodeBlocks(text);
        
        // If no code blocks found, return original text
        if (codeBlocks.length === 0) {
            return text;
        }
        
        // Store code blocks
        this.codeBlocks = [...this.codeBlocks, ...codeBlocks];
        
        // Create panels for each code block
        codeBlocks.forEach(block => {
            this.createCodePanel(block.code, block.language, block.filename);
        });
        
        // Hide empty message if we have panels
        if (this.emptyMessage && this.codeBlocks.length > 0) {
            this.emptyMessage.style.display = 'none';
        }
        
        // Optionally, return text with code blocks removed or replaced
        // For now, we'll just return the original text
        return text;
    }
    
    /**
     * Create a code panel for a code block
     * Implements requirements 2.2, 2.3, 2.4, 2.5 - create panels with headers, syntax highlighting, copy functionality, and resizing
     * Enhanced for requirements 3.4, 3.5, 3.6 - responsive layout and smooth transitions
     * @param {string} code - The code content
     * @param {string} language - The programming language
     * @param {string} filename - Optional filename for the header
     * @returns {HTMLElement} The created panel element
     */
    createCodePanel(code, language, filename) {
        if (!this.panelsContent) return null;
        
        // Create panel container
        const panel = document.createElement('div');
        panel.className = 'code-panel';
        panel.dataset.language = language || 'text';
        
        // Add animation class for smooth appearance
        panel.style.opacity = '0';
        panel.style.transform = 'translateY(10px)';
        
        // Create panel header
        const header = document.createElement('div');
        header.className = 'panel-header';
        
        // Add filename or language as title
        const title = document.createElement('div');
        title.className = 'panel-title';
        
        // If no language is specified, try to detect it
        if (!language && this.syntaxHighlighter) {
            const detectedLanguage = this.syntaxHighlighter.detectLanguage(code);
            if (detectedLanguage) {
                language = detectedLanguage;
                panel.dataset.language = language;
            }
        }
        
        title.textContent = filename || language || 'Code';
        header.appendChild(title);
        
        // Add control buttons
        const controls = document.createElement('div');
        controls.className = 'panel-controls';
        
        // Copy button
        const copyButton = document.createElement('button');
        copyButton.className = 'panel-button copy-button';
        copyButton.setAttribute('aria-label', 'Copy code to clipboard');
        copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
        copyButton.addEventListener('click', () => this.copyToClipboard(code, copyButton));
        controls.appendChild(copyButton);
        
        // Collapse button
        const collapseButton = document.createElement('button');
        collapseButton.className = 'panel-button collapse-button';
        collapseButton.setAttribute('aria-label', 'Collapse code panel');
        collapseButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>';
        collapseButton.addEventListener('click', () => this.togglePanelCollapse(panel));
        controls.appendChild(collapseButton);
        
        header.appendChild(controls);
        panel.appendChild(header);
        
        // Create code content
        const codeContainer = document.createElement('div');
        codeContainer.className = 'code-container';
        
        // Apply syntax highlighting if available
        if (this.syntaxHighlighter) {
            // Use the syntax highlighter to generate highlighted HTML
            const highlightedCode = this.syntaxHighlighter.highlight(code, language);
            codeContainer.innerHTML = highlightedCode;
        } else {
            // Fallback to plain text if no syntax highlighter
            const pre = document.createElement('pre');
            pre.className = `language-${language || 'text'}`;
            
            const codeElement = document.createElement('code');
            codeElement.className = `language-${language || 'text'}`;
            codeElement.textContent = code;
            
            pre.appendChild(codeElement);
            codeContainer.appendChild(pre);
        }
        
        panel.appendChild(codeContainer);
        
        // Add vertical resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        panel.appendChild(resizeHandle);
        
        // Add horizontal resize handle if in desktop mode
        if (window.innerWidth >= 768) {
            const horizontalHandle = document.createElement('div');
            horizontalHandle.className = 'resize-handle-horizontal';
            panel.appendChild(horizontalHandle);
            
            // Setup horizontal resize functionality
            this.setupHorizontalResize(panel, horizontalHandle);
        }
        
        // Add panel to DOM - use panels grid if available
        if (this.panelsGrid && window.innerWidth >= 768) {
            this.panelsGrid.appendChild(panel);
        } else {
            this.panelsContent.appendChild(panel);
        }
        
        // Setup vertical resize functionality
        this.setupResizeHandle(panel, resizeHandle);
        
        // Store panel reference
        this.panels.push(panel);
        
        // Animate panel appearance with smooth transition
        setTimeout(() => {
            panel.style.opacity = '1';
            panel.style.transform = 'translateY(0)';
        }, 10);
        
        // Hide empty message if we have panels
        if (this.emptyMessage) {
            this.emptyMessage.style.display = 'none';
        }
        
        return panel;
    }
    
    /**
     * Set up resize handle for a panel
     * Implements requirement 2.5 - resizable panels
     * @param {HTMLElement} panel - The panel element
     * @param {HTMLElement} handle - The resize handle element
     */
    setupResizeHandle(panel, handle) {
        let startY = 0;
        let startHeight = 0;
        
        const startResize = (e) => {
            startY = e.clientY;
            startHeight = parseInt(document.defaultView.getComputedStyle(panel).height, 10);
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
            document.body.style.cursor = 'ns-resize';
        };
        
        const resize = (e) => {
            const newHeight = startHeight + (e.clientY - startY);
            if (newHeight > 100) { // Minimum height
                panel.style.height = `${newHeight}px`;
            }
        };
        
        const stopResize = () => {
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
            document.body.style.cursor = '';
        };
        
        handle.addEventListener('mousedown', startResize);
    }
    
    /**
     * Toggle panel collapse state
     * Implements requirement 2.5 - collapsible panels
     * @param {HTMLElement} panel - The panel to toggle
     */
    togglePanelCollapse(panel) {
        const codeContainer = panel.querySelector('.code-container');
        const collapseButton = panel.querySelector('.collapse-button');
        
        if (!codeContainer || !collapseButton) return;
        
        const isCollapsed = codeContainer.style.display === 'none';
        
        if (isCollapsed) {
            // Expand
            codeContainer.style.display = 'block';
            collapseButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>';
            panel.classList.remove('collapsed');
        } else {
            // Collapse
            codeContainer.style.display = 'none';
            collapseButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
            panel.classList.add('collapsed');
        }
    }
    
    /**
     * Collapse all panels
     */
    collapseAllPanels() {
        this.panels.forEach(panel => {
            const codeContainer = panel.querySelector('.code-container');
            if (codeContainer && codeContainer.style.display !== 'none') {
                this.togglePanelCollapse(panel);
            }
        });
    }
    
    /**
     * Copy code to clipboard
     * Implements requirement 2.4 - copy to clipboard functionality
     * @param {string} content - The content to copy
     * @param {HTMLElement} button - The button that was clicked (for feedback)
     */
    copyToClipboard(content, button) {
        if (!content) return;
        
        // Use the Clipboard API if available
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(content)
                .then(() => this.showCopyFeedback(button, true))
                .catch(err => {
                    console.error('Failed to copy: ', err);
                    this.showCopyFeedback(button, false);
                });
        } else {
            // Fallback for older browsers
            try {
                const textArea = document.createElement('textarea');
                textArea.value = content;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                
                this.showCopyFeedback(button, successful);
            } catch (err) {
                console.error('Failed to copy: ', err);
                this.showCopyFeedback(button, false);
            }
        }
    }
    
    /**
     * Show feedback after copy attempt
     * @param {HTMLElement} button - The button element
     * @param {boolean} success - Whether the copy was successful
     */
    showCopyFeedback(button, success) {
        if (!button) return;
        
        const originalHTML = button.innerHTML;
        
        if (success) {
            button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            button.classList.add('success');
        } else {
            button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            button.classList.add('error');
        }
        
        // Reset button after a delay
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.classList.remove('success', 'error');
        }, 2000);
    }
    
    /**
     * Clear all code panels
     */
    clearPanels() {
        if (this.panelsContent) {
            // Remove all panels
            this.panels.forEach(panel => {
                if (panel.parentNode === this.panelsContent) {
                    this.panelsContent.removeChild(panel);
                }
            });
            
            // Reset arrays
            this.panels = [];
            this.codeBlocks = [];
            
            // Show empty message
            if (this.emptyMessage) {
                this.emptyMessage.style.display = 'flex';
            }
        }
    }
    
    /**
     * Create panels grid container for desktop layout
     * Implements requirement 3.4 - desktop side-by-side panel layout
     */
    createPanelsGrid() {
        // Check if grid already exists
        if (this.panelsContent && !this.panelsContent.querySelector('.panels-grid')) {
            // Create grid container
            const panelsGrid = document.createElement('div');
            panelsGrid.className = 'panels-grid';
            
            // Move existing panels to grid if any
            const existingPanels = this.panelsContent.querySelectorAll('.code-panel');
            if (existingPanels.length > 0) {
                existingPanels.forEach(panel => {
                    panelsGrid.appendChild(panel);
                });
            }
            
            // Add grid to panels content
            this.panelsContent.appendChild(panelsGrid);
            
            // Update panels content reference to use grid
            this.panelsGrid = panelsGrid;
        }
    }
    
    /**
     * Create mobile toggle button for showing/hiding panels on mobile
     * Implements requirement 3.5 - mobile stacking behavior
     */
    createMobileToggle() {
        // Only create on mobile
        if (window.innerWidth < 768 && !document.querySelector('.toggle-panels-button')) {
            const toggleButton = document.createElement('button');
            toggleButton.className = 'toggle-panels-button';
            toggleButton.setAttribute('aria-label', 'Toggle code panels');
            toggleButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>';
            
            // Add click event
            toggleButton.addEventListener('click', () => {
                this.toggleMobilePanels();
            });
            
            // Add to DOM
            document.body.appendChild(toggleButton);
            this.toggleButton = toggleButton;
            
            // Initially hide panels on mobile
            if (this.codePanelsContainer) {
                this.codePanelsContainer.classList.add('mobile-hidden');
            }
        }
    }
    
    /**
     * Toggle panels visibility on mobile
     * Implements requirement 3.5 - mobile stacking behavior
     */
    toggleMobilePanels() {
        if (!this.codePanelsContainer) return;
        
        if (this.codePanelsContainer.classList.contains('mobile-hidden')) {
            // Show panels
            this.codePanelsContainer.classList.remove('mobile-hidden');
            this.codePanelsContainer.classList.add('mobile-visible');
            
            // Update button icon
            if (this.toggleButton) {
                this.toggleButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 6 6 6 12 12"></polyline></svg>';
            }
        } else {
            // Hide panels
            this.codePanelsContainer.classList.add('mobile-hidden');
            this.codePanelsContainer.classList.remove('mobile-visible');
            
            // Update button icon
            if (this.toggleButton) {
                this.toggleButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>';
            }
        }
    }
    
    /**
     * Initialize responsive layout behavior
     * Implements requirements 3.4, 3.5, 3.6 - responsive layout and smooth transitions
     */
    initResponsiveLayout() {
        // Create layout splitter for desktop
        this.createLayoutSplitter();
        
        // Handle window resize events
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Initial layout setup based on screen size
        this.updateLayoutForScreenSize();
        
        // Add horizontal resize handles to panels in desktop mode
        if (window.innerWidth >= 768) {
            this.addHorizontalResizeHandles();
        }
    }
    
    /**
     * Create layout splitter between chat and code panels sections
     * Implements requirement 3.4 - desktop side-by-side panel layout
     */
    createLayoutSplitter() {
        // Only create on desktop
        if (window.innerWidth >= 768 && this.mainLayout && !this.mainLayout.querySelector('.layout-splitter')) {
            const splitter = document.createElement('div');
            splitter.className = 'layout-splitter';
            
            // Insert splitter between chat and code panels
            if (this.chatSection && this.codePanelsContainer) {
                this.mainLayout.insertBefore(splitter, this.codePanelsContainer);
                
                // Setup splitter drag functionality
                this.setupSplitterDrag(splitter);
            }
        }
    }
    
    /**
     * Setup drag functionality for the layout splitter
     * @param {HTMLElement} splitter - The splitter element
     */
    setupSplitterDrag(splitter) {
        let startX = 0;
        let startWidth = 0;
        
        const startDrag = (e) => {
            startX = e.clientX;
            startWidth = parseInt(document.defaultView.getComputedStyle(this.chatSection).width, 10);
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', stopDrag);
            document.body.style.cursor = 'ew-resize';
            splitter.classList.add('dragging');
        };
        
        const drag = (e) => {
            const containerWidth = this.mainLayout.offsetWidth;
            const newWidth = startWidth + (e.clientX - startX);
            
            // Limit chat section width between 30% and 70% of container
            const minWidth = containerWidth * 0.3;
            const maxWidth = containerWidth * 0.7;
            
            if (newWidth >= minWidth && newWidth <= maxWidth) {
                const widthPercent = (newWidth / containerWidth) * 100;
                this.chatSection.style.width = `${widthPercent}%`;
                this.codePanelsContainer.style.width = `${100 - widthPercent}%`;
            }
        };
        
        const stopDrag = () => {
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', stopDrag);
            document.body.style.cursor = '';
            splitter.classList.remove('dragging');
        };
        
        splitter.addEventListener('mousedown', startDrag);
    }
    
    /**
     * Add horizontal resize handles to panels in desktop mode
     * Implements requirement 3.4 - desktop side-by-side panel layout
     */
    addHorizontalResizeHandles() {
        this.panels.forEach(panel => {
            // Check if panel already has horizontal resize handle
            if (!panel.querySelector('.resize-handle-horizontal')) {
                const horizontalHandle = document.createElement('div');
                horizontalHandle.className = 'resize-handle-horizontal';
                panel.appendChild(horizontalHandle);
                
                // Setup horizontal resize functionality
                this.setupHorizontalResize(panel, horizontalHandle);
            }
        });
    }
    
    /**
     * Setup horizontal resize functionality for panels
     * @param {HTMLElement} panel - The panel element
     * @param {HTMLElement} handle - The horizontal resize handle
     */
    setupHorizontalResize(panel, handle) {
        let startX = 0;
        let startWidth = 0;
        
        const startResize = (e) => {
            e.stopPropagation();
            startX = e.clientX;
            startWidth = parseInt(document.defaultView.getComputedStyle(panel).width, 10);
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
            document.body.style.cursor = 'ew-resize';
            panel.classList.add('resizing');
        };
        
        const resize = (e) => {
            const newWidth = startWidth + (e.clientX - startX);
            if (newWidth > 200) { // Minimum width
                panel.style.width = `${newWidth}px`;
            }
        };
        
        const stopResize = () => {
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
            document.body.style.cursor = '';
            panel.classList.remove('resizing');
        };
        
        handle.addEventListener('mousedown', startResize);
    }
    
    /**
     * Handle window resize events
     * Implements requirements 3.4, 3.5 - responsive layout
     */
    handleResize() {
        const isDesktop = window.innerWidth >= 768;
        
        // Check if layout mode changed
        if (isDesktop !== this.isGridLayout) {
            this.isGridLayout = isDesktop;
            this.updateLayoutForScreenSize();
        }
    }
    
    /**
     * Update layout based on screen size
     * Implements requirements 3.4, 3.5 - responsive layout
     */
    updateLayoutForScreenSize() {
        if (window.innerWidth >= 768) {
            // Desktop layout
            this.setupDesktopLayout();
        } else {
            // Mobile layout
            this.setupMobileLayout();
        }
    }
    
    /**
     * Setup desktop layout
     * Implements requirement 3.4 - desktop side-by-side panel layout
     */
    setupDesktopLayout() {
        // Create layout splitter if it doesn't exist
        this.createLayoutSplitter();
        
        // Create panels grid if it doesn't exist
        this.createPanelsGrid();
        
        // Add horizontal resize handles
        this.addHorizontalResizeHandles();
        
        // Remove mobile-specific classes
        if (this.codePanelsContainer) {
            this.codePanelsContainer.classList.remove('mobile-hidden', 'mobile-visible');
        }
        
        // Hide mobile toggle button
        if (this.toggleButton) {
            this.toggleButton.style.display = 'none';
        }
        
        // Reset any mobile-specific styles
        if (this.chatSection) {
            this.chatSection.style.height = '';
        }
        
        if (this.codePanelsContainer) {
            this.codePanelsContainer.style.height = '';
        }
    }
    
    /**
     * Setup mobile layout
     * Implements requirement 3.5 - mobile stacking behavior
     */
    setupMobileLayout() {
        // Create mobile toggle if it doesn't exist
        this.createMobileToggle();
        
        // Show mobile toggle button
        if (this.toggleButton) {
            this.toggleButton.style.display = 'flex';
        }
        
        // Reset desktop-specific styles
        if (this.chatSection) {
            this.chatSection.style.width = '';
        }
        
        if (this.codePanelsContainer) {
            this.codePanelsContainer.style.width = '';
        }
        
        // Initially hide panels on mobile
        if (this.codePanelsContainer && !this.codePanelsContainer.classList.contains('mobile-visible')) {
            this.codePanelsContainer.classList.add('mobile-hidden');
        }
        
        // Remove any layout splitters
        const splitter = this.mainLayout ? this.mainLayout.querySelector('.layout-splitter') : null;
        if (splitter) {
            splitter.remove();
        }
    }
}

export default CodePanelManager;