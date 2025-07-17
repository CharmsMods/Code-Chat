// Error Handler Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ErrorHandler, { ErrorType } from '../js/errorHandler.js';

describe('ErrorHandler', () => {
    let errorHandler;
    let mockDisplayCallback;
    
    beforeEach(() => {
        mockDisplayCallback = vi.fn();
        errorHandler = new ErrorHandler(mockDisplayCallback);
        console.error = vi.fn(); // Mock console.error
    });
    
    it('should categorize API key errors correctly', () => {
        const error = new Error('Invalid API key provided');
        const errorInfo = errorHandler.categorizeError(error);
        
        expect(errorInfo.type).toBe(ErrorType.API_KEY);
        expect(errorInfo.recoverable).toBe(false);
        expect(errorInfo.actionable).toBe(true);
    });
    
    it('should categorize network errors correctly', () => {
        const error = new Error('Network error: Failed to fetch');
        const errorInfo = errorHandler.categorizeError(error);
        
        expect(errorInfo.type).toBe(ErrorType.NETWORK);
        expect(errorInfo.recoverable).toBe(true);
    });
    
    it('should categorize rate limit errors correctly', () => {
        const error = new Error('Rate limit exceeded (429)');
        const errorInfo = errorHandler.categorizeError(error);
        
        expect(errorInfo.type).toBe(ErrorType.RATE_LIMIT);
        expect(errorInfo.recoverable).toBe(true);
    });
    
    it('should identify retryable errors correctly', () => {
        const networkError = { type: ErrorType.NETWORK };
        const timeoutError = { type: ErrorType.TIMEOUT };
        const rateLimitError = { type: ErrorType.RATE_LIMIT };
        const serverError = { type: ErrorType.SERVER };
        const apiKeyError = { type: ErrorType.API_KEY };
        
        expect(errorHandler.isRetryable(networkError)).toBe(true);
        expect(errorHandler.isRetryable(timeoutError)).toBe(true);
        expect(errorHandler.isRetryable(rateLimitError)).toBe(true);
        expect(errorHandler.isRetryable(serverError)).toBe(true);
        expect(errorHandler.isRetryable(apiKeyError)).toBe(false);
    });
    
    it('should calculate retry delay with exponential backoff', () => {
        const baseDelay = 1000;
        const maxDelay = 30000;
        
        const firstRetry = errorHandler.calculateRetryDelay(1, baseDelay, maxDelay);
        const secondRetry = errorHandler.calculateRetryDelay(2, baseDelay, maxDelay);
        const thirdRetry = errorHandler.calculateRetryDelay(3, baseDelay, maxDelay);
        
        // First retry should be around baseDelay (with jitter)
        expect(firstRetry).toBeGreaterThanOrEqual(baseDelay);
        expect(firstRetry).toBeLessThanOrEqual(baseDelay * 1.25);
        
        // Second retry should be around 2*baseDelay (with jitter)
        expect(secondRetry).toBeGreaterThanOrEqual(baseDelay * 2);
        expect(secondRetry).toBeLessThanOrEqual(baseDelay * 2 * 1.25);
        
        // Third retry should be around 4*baseDelay (with jitter)
        expect(thirdRetry).toBeGreaterThanOrEqual(baseDelay * 4);
        expect(thirdRetry).toBeLessThanOrEqual(baseDelay * 4 * 1.25);
    });
    
    it('should respect maximum delay', () => {
        const baseDelay = 1000;
        const maxDelay = 5000;
        
        // With these parameters, the 10th retry would be 1000 * 2^9 = 512,000ms
        // But it should be capped at maxDelay (5000ms)
        const tenthRetry = errorHandler.calculateRetryDelay(10, baseDelay, maxDelay);
        
        expect(tenthRetry).toBe(maxDelay);
    });
    
    it('should call display callback when handling errors', () => {
        const error = new Error('Test error');
        errorHandler.handleError(error, 'test context');
        
        expect(mockDisplayCallback).toHaveBeenCalled();
        expect(console.error).toHaveBeenCalled();
    });
});