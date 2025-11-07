// ============================================================================
// Global Error Handler Middleware
// ============================================================================

const errorHandler = (err, req, res, next) => {
  // Log error details
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('Error occurred:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Determine status code
  let statusCode = err.statusCode || err.status || 500;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
  } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
  } else if (err.code === '23505') {
    // PostgreSQL unique violation
    statusCode = 409;
  } else if (err.code === '23503') {
    // PostgreSQL foreign key violation
    statusCode = 400;
  } else if (err.code === '23502') {
    // PostgreSQL not null violation
    statusCode = 400;
  }

  // Build error response
  const errorResponse = {
    error: true,
    message: err.message || 'Internal Server Error',
    statusCode: statusCode
  };

  // Add additional details in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err.details || null;
  }

  // Handle PostgreSQL errors
  if (err.code && err.code.startsWith('23')) {
    if (err.code === '23505') {
      errorResponse.message = 'Duplicate entry. A record with this value already exists.';
      if (err.constraint) {
        errorResponse.constraint = err.constraint;
      }
    } else if (err.code === '23503') {
      errorResponse.message = 'Referenced record does not exist.';
    } else if (err.code === '23502') {
      errorResponse.message = 'Required field is missing.';
      if (err.column) {
        errorResponse.column = err.column;
      }
    }
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Custom error classes
class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
  }
}

class ConflictError extends Error {
  constructor(message = 'Conflict') {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

// Async route handler wrapper (to catch async errors)
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = errorHandler;
module.exports.ValidationError = ValidationError;
module.exports.NotFoundError = NotFoundError;
module.exports.UnauthorizedError = UnauthorizedError;
module.exports.ForbiddenError = ForbiddenError;
module.exports.ConflictError = ConflictError;
module.exports.asyncHandler = asyncHandler;
