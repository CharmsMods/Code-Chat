# Requirements Document

## Introduction

This feature involves building a single-page web application that provides a chat interface for interacting with Google's Gemini AI model. The application will parse AI responses for code blocks and display them in dedicated, interactive panels with syntax highlighting and copy functionality. The app will feature a dark, minimalistic design with responsive layout capabilities.

## Requirements

### Requirement 1

**User Story:** As a user, I want to send messages to the Gemini AI and receive responses in a chat interface, so that I can have conversational interactions with the AI.

#### Acceptance Criteria

1. WHEN the user types a message in the input field and submits it THEN the system SHALL send the message to the Gemini AI API using the provided API key
2. WHEN the AI responds THEN the system SHALL display the user's message right-aligned and the AI's response left-aligned in the chat area
3. WHEN messages are displayed THEN the system SHALL maintain a scrollable message history above the input field
4. IF the API request fails THEN the system SHALL display an appropriate error message to the user

### Requirement 2

**User Story:** As a user, I want AI responses containing code to be automatically parsed and displayed in dedicated panels, so that I can easily view and interact with code snippets.

#### Acceptance Criteria

1. WHEN the AI response contains code fences (```language blocks) THEN the system SHALL extract each code block and create a separate panel for it
2. WHEN a code panel is created THEN the system SHALL display the filename as a header if specified in the code fence
3. WHEN code is displayed in a panel THEN the system SHALL apply syntax highlighting appropriate to the detected language
4. WHEN a user clicks the copy button on a code panel THEN the system SHALL copy only that specific code block's contents to the clipboard
5. WHEN multiple code blocks exist THEN the system SHALL create resizable and collapsible panels for each block

### Requirement 3

**User Story:** As a user, I want the application to have a dark, minimalistic design that works well on both desktop and mobile devices, so that I can use it comfortably across different screen sizes.

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL display a dark theme with borderless and minimalistic styling
2. WHEN styling elements THEN the system SHALL use only one or two accent colors for buttons and text highlights
3. WHEN displaying content THEN the system SHALL use clean typography with generous spacing and smooth transitions
4. WHEN viewed on desktop THEN the system SHALL display code panels side-by-side when space allows
5. WHEN viewed on mobile devices THEN the system SHALL stack code panels vertically for optimal viewing
6. WHEN the user interacts with UI elements THEN the system SHALL provide smooth visual transitions

### Requirement 4

**User Story:** As a developer, I want the application to be built with vanilla JavaScript and modern web standards, so that it remains lightweight and maintainable without framework dependencies.

#### Acceptance Criteria

1. WHEN implementing the application THEN the system SHALL use HTML, CSS (Tailwind or plain CSS), and vanilla JavaScript only
2. WHEN integrating with Gemini AI THEN the system SHALL use the @google/generative-ai SDK with the specified API key
3. WHEN initializing the AI client THEN the system SHALL use the "gemini-flash" model for free tier access
4. WHEN the application starts THEN the system SHALL properly initialize the GoogleGenerativeAI client with the provided API key
5. IF using external dependencies THEN the system SHALL only include the @google/generative-ai package via npm install