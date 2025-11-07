// ============================================================================
// Request Validation Middleware
// ============================================================================

const { ValidationError } = require('./errorHandler');

// Validate UUID format
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Validate date format (YYYY-MM-DD)
const isValidDate = (dateString) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate currency code (ISO 4217)
const isValidCurrency = (currency) => {
  const currencyRegex = /^[A-Z]{3}$/;
  return currencyRegex.test(currency);
};

// Validate ISIN format
const isValidISIN = (isin) => {
  const isinRegex = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
  return isinRegex.test(isin);
};

// Validate CUSIP format
const isValidCUSIP = (cusip) => {
  const cusipRegex = /^[0-9A-Z]{9}$/;
  return cusipRegex.test(cusip);
};

// Generic field validator
const validateField = (value, fieldName, rules = {}) => {
  const errors = [];

  // Required check
  if (rules.required && (value === undefined || value === null || value === '')) {
    errors.push(`${fieldName} is required`);
    return errors;
  }

  // Skip further validation if field is not required and empty
  if (!rules.required && (value === undefined || value === null || value === '')) {
    return errors;
  }

  // Type validation
  if (rules.type) {
    const actualType = typeof value;
    if (rules.type === 'array' && !Array.isArray(value)) {
      errors.push(`${fieldName} must be an array`);
    } else if (rules.type !== 'array' && actualType !== rules.type) {
      errors.push(`${fieldName} must be of type ${rules.type}`);
    }
  }

  // String validations
  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${fieldName} must be at most ${rules.maxLength} characters`);
    }
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${fieldName} has invalid format`);
    }
  }

  // Number validations
  if (typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      errors.push(`${fieldName} must be at least ${rules.min}`);
    }
    if (rules.max !== undefined && value > rules.max) {
      errors.push(`${fieldName} must be at most ${rules.max}`);
    }
  }

  // Custom validations
  if (rules.custom) {
    const customError = rules.custom(value);
    if (customError) {
      errors.push(customError);
    }
  }

  // Format validations
  if (rules.format) {
    switch (rules.format) {
      case 'uuid':
        if (!isValidUUID(value)) errors.push(`${fieldName} must be a valid UUID`);
        break;
      case 'date':
        if (!isValidDate(value)) errors.push(`${fieldName} must be a valid date (YYYY-MM-DD)`);
        break;
      case 'email':
        if (!isValidEmail(value)) errors.push(`${fieldName} must be a valid email`);
        break;
      case 'currency':
        if (!isValidCurrency(value)) errors.push(`${fieldName} must be a valid currency code`);
        break;
      case 'isin':
        if (!isValidISIN(value)) errors.push(`${fieldName} must be a valid ISIN`);
        break;
      case 'cusip':
        if (!isValidCUSIP(value)) errors.push(`${fieldName} must be a valid CUSIP`);
        break;
    }
  }

  // Enum validation
  if (rules.enum && !rules.enum.includes(value)) {
    errors.push(`${fieldName} must be one of: ${rules.enum.join(', ')}`);
  }

  return errors;
};

// Validate request body against schema
const validateSchema = (schema) => {
  return (req, res, next) => {
    const errors = [];

    for (const [fieldName, rules] of Object.entries(schema)) {
      const value = req.body[fieldName];
      const fieldErrors = validateField(value, fieldName, rules);
      errors.push(...fieldErrors);
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed', errors);
    }

    next();
  };
};

// Validate URL parameters
const validateParams = (paramRules) => {
  return (req, res, next) => {
    const errors = [];

    for (const [paramName, rules] of Object.entries(paramRules)) {
      const value = req.params[paramName];
      const fieldErrors = validateField(value, paramName, rules);
      errors.push(...fieldErrors);
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid parameters', errors);
    }

    next();
  };
};

// Validate query parameters
const validateQuery = (queryRules) => {
  return (req, res, next) => {
    const errors = [];

    for (const [queryName, rules] of Object.entries(queryRules)) {
      const value = req.query[queryName];
      const fieldErrors = validateField(value, queryName, rules);
      errors.push(...fieldErrors);
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid query parameters', errors);
    }

    next();
  };
};

// Common validation schemas
const commonSchemas = {
  uuid: {
    required: true,
    type: 'string',
    format: 'uuid'
  },
  email: {
    required: true,
    type: 'string',
    format: 'email'
  },
  date: {
    required: true,
    type: 'string',
    format: 'date'
  },
  currency: {
    required: true,
    type: 'string',
    format: 'currency'
  },
  positiveNumber: {
    type: 'number',
    min: 0
  },
  percentage: {
    type: 'number',
    min: 0,
    max: 100
  }
};

module.exports = {
  validateField,
  validateSchema,
  validateParams,
  validateQuery,
  commonSchemas,
  isValidUUID,
  isValidDate,
  isValidEmail,
  isValidCurrency,
  isValidISIN,
  isValidCUSIP
};
