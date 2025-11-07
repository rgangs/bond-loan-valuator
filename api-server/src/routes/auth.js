// ============================================================================
// Authentication Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { ValidationError, UnauthorizedError } = require('../middleware/errorHandler');
const db = require('../config/database');

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }

  // Find user by email
  const result = await db.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const user = result.rows[0];

  // Check if user is active
  if (!user.is_active) {
    throw new UnauthorizedError('User account is inactive');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);

  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Update last login
  await db.query(
    'UPDATE users SET last_login = NOW() WHERE user_id = $1',
    [user.user_id]
  );

  // Generate token
  const token = generateToken(user);

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      user_id: user.user_id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
}));

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  // Client-side should remove the token
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// GET /api/auth/me (requires authentication)
const { authenticate } = require('../middleware/auth');

router.get('/me', authenticate, (req, res) => {
  res.json({
    success: true,
    user: {
      user_id: req.user.user_id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role
    }
  });
});

module.exports = router;
