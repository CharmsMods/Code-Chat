// Error Handler - Centralized error handling with user-friendly messages
// Implements requirement 1.4 - Displaying appropriate error messages

/**
 * Error types enumeration
 * @enum {string}
 */
export const ErrorType = {
    NETWORK: 'NETWORK_ERROR',
    API_KEY: 'API_KEY_ERROR',
    RATE_LIMIT: 'RATE_LIMIT_ERROR',
    PERMISSION: 'PERMISSION_ERROR',
    TIMEOUT: 'TIMEOUT_ERROR',
    SERVER: 'SERVER_ERROR',
    CONTENT_FILTER: 'CONTENT_FILTER_ERROR',
    VALIDATION: 'VALIDATION_ERROR',
    UNKNOWN: 'UNKNOWN_ERROR'
};

/**
 * ErrorHandler class for centralized error management
 * Implements requirement 1.4 - handling API failures and displaying appropriate error messages
 */
class ErrorHandler {
    /**
     * Create a new ErrorHandler instance
     * @param {Function} displayCallback - Function to call to display errors in UI
     */
    constructor(displayCallback) {
        this.displayCallback = displayCallback || console.error;
        this.retryableErrors = [
            ErrorType.NETWORK,
            ErrorType.TIMEOUT,
            ErrorType.RATE_LIMIT,
            ErrorType.SERVER
        ];
    }

    /**
     * Handle an error by categorizing it and displaying appropriate message
     * @param {Error} error - The error to handle
     * @param {string} [context] - Optional context where the error occurred
     * @returns {Object} Error information including type and user-friendly message
     */
    handleError(error, context = '') {
        const errorInfo = this.categorizeError(error);
        
        // Log the error with context
        console.error(`Error ${context ? 'in ' + context : ''}: ${errorInfo.message}`, error);
        
        // Display the error to the user if callback is provided
        if (this.displayCallback && typeof this.displayCallback === 'function') {
            this.displayCallback(errorInfo);
        }
        
        return errorInfo;
    }

    /**
     * Categorize an error and generate a user-friendly message
     * @param {Error} error - The error to categorize
     * @returns {Object} Error information including type and user-friendly message
     */
    categorizeError(error) {
        const errorMsg = error.message || 'Unknown error occurred';
        let type = ErrorType.UNKNOWN;
        let message = errorMsg;
        let recoverable = false;
        let actionable = false;
        let action = '';
        
        // Categorize based on error message content
        if (errorMsg.includes('key') || errorMsg.includes('auth') || errorMsg.includes('401')) {
            type = ErrorType.API_KEY;
            message = 'API key error: Please check your Gemini API key configuration.';
            actionable = true;
            action = 'Update API Key';
            recoverable = false;
        } else if (errorMsg.includes('rate limit') || errorMsg.includes('429') || errorMsg.includes('quota')) {
            type = ErrorType.RATE_LIMIT;
            message = 'Rate limit exceeded: The AI service is receiving too many requests. Please try again later.';
            recoverable = true;
        } else if (errorMsg.includes('network') || errorMsg.includes('offline') || errorMsg.includes('unreachable')) {
            type = ErrorType.NETWORK;
            message = 'Network error: Unable to connect to the AI service. Please check your internet connection.';
            recoverable = true;
        } else if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
            type = ErrorType.TIMEOUT;
            message = 'Request timed out: The AI service took too long to respond. Please try again.';
            recoverable = true;
        } else if (errorMsg.includes('permission') || errorMsg.includes('403') || errorMsg.includes('forbidden')) {
            type = ErrorType.PERMISSION;
            message = 'Permission denied: Your API key does not have permission to use this service.';
            actionable = true;
            action = 'Update API Key';
            recoverable = false;
        } else if (errorMsg.includes('server') || errorMsg.includes('500') || errorMsg.includes('503') || errorMsg.includes('502')) {
            type = ErrorType.SERVER;
            message = 'Server error: The AI service is experiencing issues. Please try again later.';
            recoverable = true;
        } else if (errorMsg.includes('content') || errorMsg.includes('policy') || errorMsg.includes('blocked')) {
            type = ErrorType.CONTENT_FILTER;
            message = 'Content policy violation: Your request was flagged by content filters. Please modify your prompt and try again.';
            actionable = true;
            action = 'Modify Prompt';
            recoverable = false;
        } else if (errorMsg.includes('validation') || errorMsg.includes('invalid')) {
            type = ErrorType.VALIDATION;
            message = 'Invalid request: Your message contains invalid parameters or formatting.';
            actionable = true;
            action = 'Edit Message';
            recoverable = false;
        }
        
        return {
            type,
            originalError: error,
            message,
            recoverable,
            actionable,
            action,
            timestamp: new Date()
        };
    }

    /**
     * Check if an error is retryable
     * @param {Error|Object} error - The error or error info object to check
     * @returns {boolean} Whether the error is retryable
     */
    isRetryable(error) {
        // If we're passed an error info object
        if (error.type) {
            return this.retryableErrors.includes(error.type);
        }
        
        // If we're passed a raw error, categorize it first
        const errorInfo = this.categorizeError(error);
        return this.retryableErrors.includes(errorInfo.type);
    }

    /**
     * Calculate retry delay using exponential backoff with jitter
     * @param {number} retryCount - The current retry attempt number (starting from 1)
     * @param {number} baseDelay - Base delay in milliseconds
     * @param {number} maxDelay - Maximum delay in milliseconds
     * @returns {number} The calculated delay in milliseconds
     */
    calculateRetryDelay(retryCount, baseDelay = 1000, maxDelay = 30000) {
        // Exponential backoff: baseDelay * 2^(retryCount-1)
        const exponentialDelay = baseDelay * Math.pow(2, retryCount - 1);
        
        // Add jitter: random value between 0 and 25% of the delay
        const jitter = Math.random() * (exponentialDelay * 0.25);
        
        // Calculate final delay with jitter
        const delay = exponentialDelay + jitter;
        
        // Cap at maximum delay
        return Math.min(delay, maxDelay);
    }
}

export default ErrorHandler;