// Gemini AI Service - Handles API interactions with Google's Generative AI
import { GoogleGenerativeAI } from '@google/generative-ai';
import ErrorHandler, { ErrorType } from './errorHandler.js';

/**
 * Service class for interacting with Google's Gemini AI API
 * Implements requirements 1.1, 1.4, 4.2, 4.3, 4.4
 */
class GeminiService {
    /**
     * Creates a new GeminiService instance
     * @param {string} apiKey - The API key for Google Generative AI
     * @param {Function} [errorDisplayCallback] - Optional callback for displaying errors
     * @throws {Error} - If no API key is provided
     */
    constructor(apiKey, errorDisplayCallback) {
        if (!apiKey) {
            throw new Error('API key is required to initialize GeminiService');
        }
        
        this.apiKey = apiKey;
        this.genAI = new GoogleGenerativeAI(apiKey);
        // Using gemini-flash model as specified in requirement 4.3
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-flash' });
        
        // Enhanced error handling and retry configuration
        this.errorHandler = new ErrorHandler(errorDisplayCallback);
        this.retryCount = 0;
        this.maxRetries = 3;
        this.baseRetryDelay = 1000; // Initial retry delay in ms
        this.maxRetryDelay = 30000; // Maximum retry delay in ms
        this.requestTimeoutMs = 30000; // Request timeout in ms
        
        // Request history for debugging and analytics
        this.requestHistory = [];
    }

    /**
     * Generates a response from Gemini AI based on the provided prompt
     * Implements requirement 1.1 - sending user message to Gemini AI API
     * @param {string} prompt - The user's message to send to the AI
     * @param {Object} [options] - Optional configuration for the request
     * @param {number} [options.timeout] - Request timeout in milliseconds
     * @param {boolean} [options.stream] - Whether to stream the response
     * @returns {Promise<string>} - The AI's response text
     * @throws {Error} - If the API request fails after retries
     */
    async generateResponse(prompt, options = {}) {
        if (!prompt || typeof prompt !== 'string') {
            const error = new Error('A valid prompt string is required');
            const errorInfo = this.errorHandler.handleError(error, 'input validation');
            throw error;
        }

        // Track request for debugging
        const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        const requestStart = Date.now();
        
        try {
            // Configure request options
            const requestOptions = {
                timeout: options.timeout || this.requestTimeoutMs
            };
            
            // Make the API request with timeout
            const result = await Promise.race([
                this.model.generateContent(prompt),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Request timed out')), requestOptions.timeout)
                )
            ]);
            
            const response = await result.response;
            const text = response.text();
            
            // Reset retry count on success
            this.retryCount = 0;
            
            // Log successful request
            this.logRequest({
                id: requestId,
                prompt,
                success: true,
                duration: Date.now() - requestStart,
                timestamp: new Date()
            });
            
            return text;
        } catch (error) {
            // Log failed request
            this.logRequest({
                id: requestId,
                prompt,
                success: false,
                error: error.message,
                duration: Date.now() - requestStart,
                timestamp: new Date()
            });
            
            return this.handleApiError(error, prompt);
        }
    }

    /**
     * Handles API errors with enhanced retry mechanism
     * Implements requirement 1.4 - handling API failures
     * @param {Error} error - The error that occurred
     * @param {string} prompt - The original prompt to retry
     * @returns {Promise<string>} - The AI's response after successful retry
     * @throws {Error} - If max retries are exceeded or error is unrecoverable
     */
    async handleApiError(error, prompt) {
        // Categorize the error using ErrorHandler
        const errorInfo = this.errorHandler.categorizeError(error);
        
        // Check if we should retry based on error type
        if (this.errorHandler.isRetryable(errorInfo) && this.retryCount < this.maxRetries) {
            this.retryCount++;
            
            // Calculate delay with exponential backoff and jitter
            const delay = this.errorHandler.calculateRetryDelay(
                this.retryCount, 
                this.baseRetryDelay, 
                this.maxRetryDelay
            );
            
            console.warn(`API request failed: ${errorInfo.message}. Retrying (${this.retryCount}/${this.maxRetries}) in ${Math.round(delay)}ms...`);
            
            // Dispatch retry event for UI updates
            this.dispatchRetryEvent(errorInfo, this.retryCount, this.maxRetries, delay);
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Retry the request
            return this.generateResponse(prompt);
        }
        
        // If we've exhausted retries or error is not retryable
        if (this.retryCount >= this.maxRetries) {
            error.message = `Maximum retry attempts (${this.maxRetries}) exceeded: ${errorInfo.message}`;
        }
        
        // Reset retry count for next request
        this.retryCount = 0;
        
        // Throw the error with enhanced information
        throw Object.assign(error, { errorInfo });
    }

    /**
     * Dispatch a custom event for retry attempts
     * @param {Object} errorInfo - Information about the error
     * @param {number} retryCount - Current retry attempt
     * @param {number} maxRetries - Maximum retry attempts
     * @param {number} delay - Delay before next retry in ms
     */
    dispatchRetryEvent(errorInfo, retryCount, maxRetries, delay) {
        if (typeof window !== 'undefined') {
            const event = new CustomEvent('gemini-retry', {
                detail: {
                    errorInfo,
                    retryCount,
                    maxRetries,
                    delay,
                    percentage: (retryCount / maxRetries) * 100
                }
            });
            window.dispatchEvent(event);
        }
    }

    /**
     * Log request information for debugging and analytics
     * @param {Object} requestInfo - Information about the request
     */
    logRequest(requestInfo) {
        this.requestHistory.push(requestInfo);
        
        // Keep history limited to last 50 requests
        if (this.requestHistory.length > 50) {
            this.requestHistory.shift();
        }
    }

    /**
     * Get request history statistics
     * @returns {Object} Statistics about recent requests
     */
    getRequestStats() {
        const total = this.requestHistory.length;
        const successful = this.requestHistory.filter(r => r.success).length;
        const failed = total - successful;
        const averageDuration = this.requestHistory.reduce((sum, r) => sum + r.duration, 0) / (total || 1);
        
        return {
            total,
            successful,
            failed,
            successRate: total ? (successful / total) * 100 : 0,
            averageDuration
        };
    }
}

export default GeminiService;