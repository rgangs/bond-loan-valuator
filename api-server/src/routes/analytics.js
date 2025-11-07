// ============================================================================
// Analytics Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// GET /api/analytics/events - Event log analytics with filtering
router.get('/events', analyticsController.getEventAnalytics);

// GET /api/analytics/events/summary - High-level event summary
router.get('/events/summary', analyticsController.getEventSummary);

// GET /api/analytics/events/timeline - Event timeline for charts
router.get('/events/timeline', analyticsController.getEventTimeline);

// GET /api/analytics/valuation-metrics - Valuation performance metrics
router.get('/valuation-metrics', analyticsController.getValuationMetrics);

// GET /api/analytics/user-activity - User activity tracking
router.get('/user-activity', analyticsController.getUserActivity);

// GET /api/analytics/system-health - System health indicators
router.get('/system-health', analyticsController.getSystemHealth);

module.exports = router;
