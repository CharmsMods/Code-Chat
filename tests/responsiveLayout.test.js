// Responsive Layout and Panel Management Tests
// Tests for requirements 3.4, 3.5, 3.6

// Mock DOM elements for testing
document.body.innerHTML = `
<div id="app">
    <main class="main-layout">
        <section id="chat-container" class="chat-section">
            <div id="messages" class="messages-container"></div>
        </section>
        <aside id="code-panels-container" class="code-panels-section">
            <div class="panels-header">
                <h2>Code Panels</h2>
                <button id="collapse-all" class="text-button">Collapse All</button>
            </div>
            <div class="panels-content">
                <div class="empty-panels-message">
                    <p>Code snippets from the AI will appear here</p>
                </div>
            </div>
        </aside>
    </main>
</div>
`;

// Import the CodePanelManager class
import CodePanelManager from '../js/codePanelManager.js';
import SyntaxHighlighter from '../js/syntaxHighlighter.js';

// Mock SyntaxHighlighter
jest.mock('../js/syntaxHighlighter.js', () => {
    return jest.fn().mockImplementation(() => {
        return {
            highlight: jest.fn().mockReturnValue('<pre><code>highlighted code</code></pre>'),
            detectLanguage: jest.fn().mockReturnValue('javascript')
        };
    });
});

describe('Responsive Layout and Panel Management', () => {
    let codePanelManager;
    
    // Mock window.innerWidth for testing different screen sizes
    const setWindowWidth = (width) => {
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: width
        });
        
        // Trigger resize event
        window.dispatchEvent(new Event('resize'));
    };
    
    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = `
        <div id="app">
            <main class="main-layout">
                <section id="chat-container" class="chat-section">
                    <div id="messages" class="messages-container"></div>
                </section>
                <aside id="code-panels-container" class="code-panels-section">
                    <div class="panels-header">
                        <h2>Code Panels</h2>
                        <button id="collapse-all" class="text-button">Collapse All</button>
                    </div>
                    <div class="panels-content">
                        <div class="empty-panels-message">
                            <p>Code snippets from the AI will appear here</p>
                        </div>
                    </div>
                </aside>
            </main>
        </div>
        `;
        
        // Clear mocks
        jest.clearAllMocks();
        
        // Set default window width to desktop
        setWindowWidth(1024);
        
        // Initialize CodePanelManager
        codePanelManager = new CodePanelManager();
    });
    
    test('Should create panels grid container for desktop layout', () => {
        // Verify panels grid was created
        const panelsGrid = document.querySelector('.panels-grid');
        expect(panelsGrid).not.toBeNull();
    });
    
    test('Should create layout splitter for desktop layout', () => {
        // Verify layout splitter was created
        const splitter = document.querySelector('.layout-splitter');
        expect(splitter).not.toBeNull();
    });
    
    test('Should not show mobile toggle button on desktop', () => {
        // Verify mobile toggle button is not visible
        const toggleButton = document.querySelector('.toggle-panels-button');
        expect(toggleButton).toBeNull();
    });
    
    test('Should create mobile toggle button and hide panels on mobile', () => {
        // Set window width to mobile
        setWindowWidth(375);
        
        // Create new instance for mobile
        const mobilePanelManager = new CodePanelManager();
        
        // Verify mobile toggle button was created
        const toggleButton = document.querySelector('.toggle-panels-button');
        expect(toggleButton).not.toBeNull();
        
        // Verify panels are hidden by default on mobile
        const codePanelsContainer = document.getElementById('code-panels-container');
        expect(codePanelsContainer.classList.contains('mobile-hidden')).toBe(true);
    });
    
    test('Should toggle panels visibility on mobile when toggle button is clicked', () => {
        // Set window width to mobile
        setWindowWidth(375);
        
        // Create new instance for mobile
        const mobilePanelManager = new CodePanelManager();
        
        // Get toggle button and panels container
        const toggleButton = document.querySelector('.toggle-panels-button');
        const codePanelsContainer = document.getElementById('code-panels-container');
        
        // Click toggle button to show panels
        toggleButton.click();
        
        // Verify panels are visible
        expect(codePanelsContainer.classList.contains('mobile-hidden')).toBe(false);
        expect(codePanelsContainer.classList.contains('mobile-visible')).toBe(true);
        
        // Click toggle button again to hide panels
        toggleButton.click();
        
        // Verify panels are hidden
        expect(codePanelsContainer.classList.contains('mobile-hidden')).toBe(true);
        expect(codePanelsContainer.classList.contains('mobile-visible')).toBe(false);
    });
    
    test('Should add horizontal resize handles to panels on desktop', () => {
        // Create a code panel
        const panel = codePanelManager.createCodePanel('console.log("test")', 'javascript', 'test.js');
        
        // Verify horizontal resize handle was added
        const horizontalHandle = panel.querySelector('.resize-handle-horizontal');
        expect(horizontalHandle).not.toBeNull();
    });
    
    test('Should not add horizontal resize handles to panels on mobile', () => {
        // Set window width to mobile
        setWindowWidth(375);
        
        // Create new instance for mobile
        const mobilePanelManager = new CodePanelManager();
        
        // Create a code panel
        const panel = mobilePanelManager.createCodePanel('console.log("test")', 'javascript', 'test.js');
        
        // Verify horizontal resize handle was not added
        const horizontalHandle = panel.querySelector('.resize-handle-horizontal');
        expect(horizontalHandle).toBeNull();
    });
    
    test('Should update layout when window is resized from desktop to mobile', () => {
        // Start with desktop layout
        expect(codePanelManager.isGridLayout).toBe(true);
        
        // Create a code panel
        const panel = codePanelManager.createCodePanel('console.log("test")', 'javascript', 'test.js');
        
        // Resize to mobile
        setWindowWidth(375);
        
        // Verify layout was updated
        expect(codePanelManager.isGridLayout).toBe(false);
        
        // Verify mobile toggle button was created
        const toggleButton = document.querySelector('.toggle-panels-button');
        expect(toggleButton).not.toBeNull();
        
        // Verify panels are hidden on mobile
        const codePanelsContainer = document.getElementById('code-panels-container');
        expect(codePanelsContainer.classList.contains('mobile-hidden')).toBe(true);
    });
    
    test('Should update layout when window is resized from mobile to desktop', () => {
        // Start with mobile layout
        setWindowWidth(375);
        const mobilePanelManager = new CodePanelManager();
        
        // Create a code panel
        const panel = mobilePanelManager.createCodePanel('console.log("test")', 'javascript', 'test.js');
        
        // Verify we're in mobile layout
        expect(mobilePanelManager.isGridLayout).toBe(false);
        
        // Resize to desktop
        setWindowWidth(1024);
        
        // Verify layout was updated
        expect(mobilePanelManager.isGridLayout).toBe(true);
        
        // Verify layout splitter was created
        const splitter = document.querySelector('.layout-splitter');
        expect(splitter).not.toBeNull();
        
        // Verify panels grid was created
        const panelsGrid = document.querySelector('.panels-grid');
        expect(panelsGrid).not.toBeNull();
    });
});