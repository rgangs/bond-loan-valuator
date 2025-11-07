// ============================================================================
// Bond & Loan Portfolio Valuator - API Server
// ============================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const fundRoutes = require('./routes/funds');
const portfolioRoutes = require('./routes/portfolios');
const assetClassRoutes = require('./routes/assetClasses');
const securityRoutes = require('./routes/securities');
const positionRoutes = require('./routes/positions');
const cashflowRoutes = require('./routes/cashflows');
const curveRoutes = require('./routes/curves');
const fxRoutes = require('./routes/fx');
const discountSpecRoutes = require('./routes/discountSpecs');
const valuationRoutes = require('./routes/valuations');
const auditRoutes = require('./routes/audit');
const overviewRoutes = require('./routes/overview');
const analyticsRoutes = require('./routes/analytics');
const reconciliationRoutes = require('./routes/reconciliation');

// Initialize Express app
const app = express();

// ============================================================================
// Middleware Configuration
// ============================================================================

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Bond & Loan Portfolio Valuator API',
    version: '1.0.0'
  });
});

// ============================================================================
// API Routes
// ============================================================================

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes (require authentication)
app.use('/api/funds', authenticate, fundRoutes);
app.use('/api/portfolios', authenticate, portfolioRoutes);
app.use('/api/asset-classes', authenticate, assetClassRoutes);
app.use('/api/securities', authenticate, securityRoutes);
app.use('/api/positions', authenticate, positionRoutes);
app.use('/api/cashflows', authenticate, cashflowRoutes);
app.use('/api/curves', authenticate, curveRoutes);
app.use('/api/fx', authenticate, fxRoutes);
app.use('/api/discount-specs', authenticate, discountSpecRoutes);
app.use('/api/valuations', authenticate, valuationRoutes);
app.use('/api/audit', authenticate, auditRoutes);
app.use('/api/overview', authenticate, overviewRoutes);
app.use('/api/analytics', authenticate, analyticsRoutes);
app.use('/api/reconciliation', authenticate, reconciliationRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: true,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// ============================================================================
// Error Handler (must be last)
// ============================================================================

app.use(errorHandler);

// ============================================================================
// Server Startup
// ============================================================================

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Test database connection before starting server
const db = require('./config/database');

db.query('SELECT NOW()')
  .then(() => {
    console.log('✓ Database connection established');

    // Start server
    app.listen(PORT, HOST, () => {
      console.log('============================================');
      console.log('  Bond & Loan Portfolio Valuator API');
      console.log('============================================');
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Server: http://${HOST}:${PORT}`);
      console.log(`  Health: http://${HOST}:${PORT}/health`);
      console.log('============================================');
    });
  })
  .catch((err) => {
    console.error('✗ Database connection failed:', err.message);
    console.error('  Please check your database configuration in .env');
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing HTTP server...');
  db.end(() => {
    console.log('Database connections closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received. Closing HTTP server...');
  db.end(() => {
    console.log('Database connections closed');
    process.exit(0);
  });
});

module.exports = app;
