// ============================================================================
// Jest Test Setup
// ============================================================================

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME || 'bondvaluator_test';
process.env.JWT_SECRET = 'test-jwt-secret-key';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Suppress console logs during tests (optional)
if (process.env.SILENT_TESTS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}
