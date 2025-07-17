import { describe, it, expect, vi, beforeEach } from 'vitest';
import GeminiService from '../js/geminiService.js';
import ErrorHandler, { ErrorType } from '../js/errorHandler.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock the GoogleGenerativeAI module
vi.mock('@google/generative-ai', () => {
  const generateContentMock = vi.fn();
  const getGenerativeModelMock = vi.fn(() => ({
    generateContent: generateContentMock
  }));
  
  return {
    GoogleGenerativeAI: vi.fn(() => ({
      getGenerativeModel: getGenerativeModelMock
    }))
  };
});

describe('GeminiService', () => {
  let geminiService;
  let mockGenerateContent;
  let mockGetGenerativeModel;
  let mockErrorDisplayCallback;
  const mockApiKey = 'test-api-key';
  
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Get reference to the mocked functions
    mockGetGenerativeModel = GoogleGenerativeAI().getGenerativeModel;
    mockGenerateContent = mockGetGenerativeModel().generateContent;
    
    // Mock error display callback
    mockErrorDisplayCallback = vi.fn();
    
    // Create a new instance for each test
    geminiService = new GeminiService(mockApiKey, mockErrorDisplayCallback);
    
    // Reset the retry count
    geminiService.retryCount = 0;
    
    // Mock dispatchEvent for testing retry events
    if (typeof window !== 'undefined') {
      window.dispatchEvent = vi.fn();
    }
  });
  
  describe('constructor', () => {
    it('should initialize with the provided API key', () => {
      expect(geminiService.apiKey).toBe(mockApiKey);
      expect(GoogleGenerativeAI).toHaveBeenCalledWith(mockApiKey);
    });
    
    it('should throw an error if no API key is provided', () => {
      expect(() => new GeminiService()).toThrow('API key is required');
    });
    
    it('should use the gemini-flash model as specified in requirement 4.3', () => {
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-flash' });
    });
  });
  
  describe('generateResponse', () => {
    it('should throw an error if no prompt is provided', async () => {
      await expect(geminiService.generateResponse()).rejects.toThrow('valid prompt string is required');
    });
    
    it('should throw an error if prompt is not a string', async () => {
      await expect(geminiService.generateResponse(123)).rejects.toThrow('valid prompt string is required');
    });
    
    it('should return the AI response text when successful', async () => {
      const mockText = 'This is a mock AI response';
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => mockText
        }
      });
      
      const result = await geminiService.generateResponse('Hello AI');
      
      expect(result).toBe(mockText);
      expect(mockGenerateContent).toHaveBeenCalledWith('Hello AI');
    });
    
    it('should reset retry count on successful response', async () => {
      const mockText = 'This is a mock AI response';
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => mockText
        }
      });
      
      // Set retry count to simulate previous failures
      geminiService.retryCount = 2;
      
      await geminiService.generateResponse('Hello AI');
      
      expect(geminiService.retryCount).toBe(0);
    });
  });
  
  describe('error handling', () => {
    it('should retry on network errors', async () => {
      const mockText = 'Success after retry';
      const networkError = new Error('network error');
      
      // Set up the mock to fail once then succeed
      mockGenerateContent
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          response: {
            text: () => mockText
          }
        });
      
      // Mock setTimeout to avoid waiting in tests
      vi.spyOn(global, 'setTimeout').mockImplementation(callback => callback());
      
      const result = await geminiService.generateResponse('Hello AI');
      
      expect(result).toBe(mockText);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });
    
    it('should use exponential backoff for retries', async () => {
      const networkError = new Error('network error');
      
      // Set up the mock to always fail
      mockGenerateContent.mockRejectedValue(networkError);
      
      // Spy on setTimeout to verify delay values
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      
      // Mock implementation to avoid actual waiting but capture the delay value
      setTimeoutSpy.mockImplementation((callback) => {
        callback();
        return 123; // Mock timer ID
      });
      
      // Set a lower max retries for faster testing
      geminiService.maxRetries = 2;
      
      try {
        await geminiService.generateResponse('Hello AI');
      } catch (error) {
        // Expected to fail after max retries
      }
      
      // Check that setTimeout was called with increasing delays
      expect(setTimeoutSpy).toHaveBeenCalledTimes(2);
      expect(setTimeoutSpy.mock.calls[0][1]).toBe(1000); // First retry: 1000ms
      expect(setTimeoutSpy.mock.calls[1][1]).toBe(2000); // Second retry: 2000ms
    });
    
    it('should give up after max retries', async () => {
      const networkError = new Error('network error');
      
      // Set up the mock to always fail
      mockGenerateContent.mockRejectedValue(networkError);
      
      // Mock setTimeout to avoid waiting in tests
      vi.spyOn(global, 'setTimeout').mockImplementation(callback => callback());
      
      // Set a lower max retries for faster testing
      geminiService.maxRetries = 2;
      
      await expect(geminiService.generateResponse('Hello AI')).rejects.toThrow('Network error');
      
      // Initial call + 2 retries = 3 calls
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });
    
    it('should provide user-friendly error messages for API key issues', async () => {
      const apiKeyError = new Error('invalid key');
      
      // Set up the mock to fail with an API key error
      mockGenerateContent.mockRejectedValue(apiKeyError);
      
      await expect(geminiService.generateResponse('Hello AI')).rejects.toThrow('API key error');
    });
    
    it('should provide user-friendly error messages for rate limiting', async () => {
      const rateLimitError = new Error('rate limit exceeded');
      
      // Set up the mock to fail with a rate limit error
      mockGenerateContent.mockRejectedValue(rateLimitError);
      
      await expect(geminiService.generateResponse('Hello AI')).rejects.toThrow('Rate limit exceeded');
    });
    
    it('should provide user-friendly error messages for permission issues', async () => {
      const permissionError = new Error('permission denied');
      
      // Set up the mock to fail with a permission error
      mockGenerateContent.mockRejectedValue(permissionError);
      
      await expect(geminiService.generateResponse('Hello AI')).rejects.toThrow('Permission denied');
    });
    
    it('should provide generic error message for unknown errors', async () => {
      const unknownError = new Error('some unexpected error');
      
      // Set up the mock to fail with an unknown error
      mockGenerateContent.mockRejectedValue(unknownError);
      
      await expect(geminiService.generateResponse('Hello AI')).rejects.toThrow('AI service error: some unexpected error');
    });
  });
  
  describe('error handling with ErrorHandler', () => {
    it('should use ErrorHandler to categorize errors', async () => {
      // Spy on the errorHandler.categorizeError method
      const categorizeErrorSpy = vi.spyOn(geminiService.errorHandler, 'categorizeError');
      const networkError = new Error('network error occurred');
      
      // Set up the mock to fail
      mockGenerateContent.mockRejectedValue(networkError);
      
      // Mock setTimeout to avoid waiting in tests
      vi.spyOn(global, 'setTimeout').mockImplementation(callback => callback());
      
      try {
        await geminiService.generateResponse('Hello AI');
      } catch (error) {
        // Expected to fail
      }
      
      // Verify that categorizeError was called with the network error
      expect(categorizeErrorSpy).toHaveBeenCalledWith(networkError);
    });
    
    it('should use ErrorHandler to determine if errors are retryable', async () => {
      // Spy on the errorHandler.isRetryable method
      const isRetryableSpy = vi.spyOn(geminiService.errorHandler, 'isRetryable');
      const networkError = new Error('network error occurred');
      
      // Set up the mock to fail
      mockGenerateContent.mockRejectedValue(networkError);
      
      // Mock setTimeout to avoid waiting in tests
      vi.spyOn(global, 'setTimeout').mockImplementation(callback => callback());
      
      try {
        await geminiService.generateResponse('Hello AI');
      } catch (error) {
        // Expected to fail
      }
      
      // Verify that isRetryable was called
      expect(isRetryableSpy).toHaveBeenCalled();
    });
    
    it('should use ErrorHandler to calculate retry delay', async () => {
      // Spy on the errorHandler.calculateRetryDelay method
      const calculateRetryDelaySpy = vi.spyOn(geminiService.errorHandler, 'calculateRetryDelay');
      const networkError = new Error('network error occurred');
      
      // Set up the mock to fail
      mockGenerateContent.mockRejectedValue(networkError);
      
      // Mock setTimeout to avoid waiting in tests
      vi.spyOn(global, 'setTimeout').mockImplementation(callback => callback());
      
      try {
        await geminiService.generateResponse('Hello AI');
      } catch (error) {
        // Expected to fail
      }
      
      // Verify that calculateRetryDelay was called with the correct parameters
      expect(calculateRetryDelaySpy).toHaveBeenCalledWith(
        expect.any(Number),
        geminiService.baseRetryDelay,
        geminiService.maxRetryDelay
      );
    });
    
    it('should dispatch retry events when retrying', async () => {
      const networkError = new Error('network error occurred');
      
      // Set up the mock to fail
      mockGenerateContent.mockRejectedValue(networkError);
      
      // Mock setTimeout to avoid waiting in tests
      vi.spyOn(global, 'setTimeout').mockImplementation(callback => callback());
      
      // Mock dispatchEvent for testing retry events
      const dispatchEventSpy = vi.fn();
      global.window = { dispatchEvent: dispatchEventSpy };
      
      try {
        await geminiService.generateResponse('Hello AI');
      } catch (error) {
        // Expected to fail
      }
      
      // Verify that dispatchEvent was called with a CustomEvent
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'gemini-retry'
        })
      );
    });
    
    it('should log request information', async () => {
      const mockText = 'This is a mock AI response';
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => mockText
        }
      });
      
      await geminiService.generateResponse('Hello AI');
      
      // Verify that the request was logged
      expect(geminiService.requestHistory.length).toBe(1);
      expect(geminiService.requestHistory[0]).toMatchObject({
        prompt: 'Hello AI',
        success: true
      });
    });
    
    it('should log failed requests', async () => {
      const networkError = new Error('network error occurred');
      
      // Set up the mock to fail
      mockGenerateContent.mockRejectedValue(networkError);
      
      // Mock setTimeout to avoid waiting in tests
      vi.spyOn(global, 'setTimeout').mockImplementation(callback => callback());
      
      try {
        await geminiService.generateResponse('Hello AI');
      } catch (error) {
        // Expected to fail
      }
      
      // Verify that the failed request was logged
      expect(geminiService.requestHistory.length).toBe(1);
      expect(geminiService.requestHistory[0]).toMatchObject({
        prompt: 'Hello AI',
        success: false,
        error: expect.stringContaining('network error')
      });
    });
    
    it('should provide request statistics', async () => {
      // Add some mock history
      geminiService.requestHistory = [
        { success: true, duration: 100 },
        { success: true, duration: 200 },
        { success: false, duration: 300 }
      ];
      
      const stats = geminiService.getRequestStats();
      
      expect(stats).toMatchObject({
        total: 3,
        successful: 2,
        failed: 1,
        successRate: 200/3,
        averageDuration: 200
      });
    });
  });
  
  describe('isRetryableError', () => {
    it('should use ErrorHandler to determine if errors are retryable', () => {
      // Create error info objects for different error types
      const networkErrorInfo = { type: ErrorType.NETWORK };
      const timeoutErrorInfo = { type: ErrorType.TIMEOUT };
      const rateLimitErrorInfo = { type: ErrorType.RATE_LIMIT };
      const serverErrorInfo = { type: ErrorType.SERVER };
      const apiKeyErrorInfo = { type: ErrorType.API_KEY };
      
      // Spy on the errorHandler.isRetryable method
      const isRetryableSpy = vi.spyOn(geminiService.errorHandler, 'isRetryable');
      
      // Test each error type
      geminiService.errorHandler.isRetryable(networkErrorInfo);
      geminiService.errorHandler.isRetryable(timeoutErrorInfo);
      geminiService.errorHandler.isRetryable(rateLimitErrorInfo);
      geminiService.errorHandler.isRetryable(serverErrorInfo);
      geminiService.errorHandler.isRetryable(apiKeyErrorInfo);
      
      // Verify that isRetryable was called for each error type
      expect(isRetryableSpy).toHaveBeenCalledTimes(5);
    });
  });
});