// ============================================================================
// Analytics Controller
// ============================================================================
// Event log analytics and system-wide metrics
// ============================================================================

const { asyncHandler, ValidationError } = require('../middleware/errorHandler');
const pool = require('../config/database');

/**
 * GET /api/analytics/events
 * Event log analytics with filtering and aggregation
 */
const getEventAnalytics = asyncHandler(async (req, res) => {
  const {
    start_date,
    end_date,
    event_type,
    entity_type,
    user_id,
    group_by = 'day',
    limit = 1000
  } = req.query;

  let query = `
    SELECT
      event_type,
      entity_type,
      DATE_TRUNC($1, created_at) as period,
      COUNT(*) as event_count,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(DISTINCT entity_id) as unique_entities
    FROM event_logs
    WHERE 1=1
  `;

  const params = [group_by];
  let paramIndex = 2;

  if (start_date) {
    query += ` AND created_at >= $${paramIndex}`;
    params.push(start_date);
    paramIndex++;
  }

  if (end_date) {
    query += ` AND created_at <= $${paramIndex}`;
    params.push(end_date);
    paramIndex++;
  }

  if (event_type) {
    query += ` AND event_type = $${paramIndex}`;
    params.push(event_type);
    paramIndex++;
  }

  if (entity_type) {
    query += ` AND entity_type = $${paramIndex}`;
    params.push(entity_type);
    paramIndex++;
  }

  if (user_id) {
    query += ` AND user_id = $${paramIndex}`;
    params.push(user_id);
    paramIndex++;
  }

  query += `
    GROUP BY event_type, entity_type, period
    ORDER BY period DESC, event_count DESC
    LIMIT $${paramIndex}
  `;
  params.push(parseInt(limit, 10));

  const result = await pool.query(query, params);

  res.json({
    success: true,
    count: result.rows.length,
    group_by,
    analytics: result.rows
  });
});

/**
 * GET /api/analytics/events/summary
 * High-level event summary statistics
 */
const getEventSummary = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;

  let dateFilter = '';
  const params = [];
  let paramIndex = 1;

  if (start_date) {
    dateFilter += ` AND created_at >= $${paramIndex}`;
    params.push(start_date);
    paramIndex++;
  }

  if (end_date) {
    dateFilter += ` AND created_at <= $${paramIndex}`;
    params.push(end_date);
    paramIndex++;
  }

  // Overall statistics
  const statsQuery = `
    SELECT
      COUNT(*) as total_events,
      COUNT(DISTINCT event_type) as unique_event_types,
      COUNT(DISTINCT user_id) as unique_users,
      MIN(created_at) as first_event,
      MAX(created_at) as last_event
    FROM event_logs
    WHERE 1=1 ${dateFilter}
  `;

  const statsResult = await pool.query(statsQuery, params);

  // Event type breakdown
  const eventTypeQuery = `
    SELECT
      event_type,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM event_logs WHERE 1=1 ${dateFilter}), 2) as percentage
    FROM event_logs
    WHERE 1=1 ${dateFilter}
    GROUP BY event_type
    ORDER BY count DESC
  `;

  const eventTypeResult = await pool.query(eventTypeQuery, params);

  // Entity type breakdown
  const entityTypeQuery = `
    SELECT
      entity_type,
      COUNT(*) as count,
      COUNT(DISTINCT entity_id) as unique_entities
    FROM event_logs
    WHERE entity_type IS NOT NULL ${dateFilter}
    GROUP BY entity_type
    ORDER BY count DESC
  `;

  const entityTypeResult = await pool.query(entityTypeQuery, params);

  // Top users by activity
  const topUsersQuery = `
    SELECT
      e.user_id,
      u.name,
      u.email,
      COUNT(*) as event_count,
      MAX(e.created_at) as last_activity
    FROM event_logs e
    LEFT JOIN users u ON e.user_id = u.user_id
    WHERE e.user_id IS NOT NULL ${dateFilter}
    GROUP BY e.user_id, u.name, u.email
    ORDER BY event_count DESC
    LIMIT 10
  `;

  const topUsersResult = await pool.query(topUsersQuery, params);

  res.json({
    success: true,
    summary: {
      overall: statsResult.rows[0],
      by_event_type: eventTypeResult.rows,
      by_entity_type: entityTypeResult.rows,
      top_users: topUsersResult.rows
    }
  });
});

/**
 * GET /api/analytics/events/timeline
 * Event timeline for visualization
 */
const getEventTimeline = asyncHandler(async (req, res) => {
  const {
    start_date,
    end_date,
    interval = 'hour',
    event_type
  } = req.query;

  if (!start_date || !end_date) {
    throw new ValidationError('start_date and end_date are required');
  }

  let query = `
    SELECT
      DATE_TRUNC($1, created_at) as time_bucket,
      event_type,
      COUNT(*) as count
    FROM event_logs
    WHERE created_at >= $2 AND created_at <= $3
  `;

  const params = [interval, start_date, end_date];

  if (event_type) {
    query += ` AND event_type = $4`;
    params.push(event_type);
  }

  query += `
    GROUP BY time_bucket, event_type
    ORDER BY time_bucket ASC
  `;

  const result = await pool.query(query, params);

  res.json({
    success: true,
    interval,
    count: result.rows.length,
    timeline: result.rows
  });
});

/**
 * GET /api/analytics/valuation-metrics
 * Valuation run performance metrics
 */
const getValuationMetrics = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;

  let dateFilter = '';
  const params = [];
  let paramIndex = 1;

  if (start_date) {
    dateFilter += ` AND started_at >= $${paramIndex}`;
    params.push(start_date);
    paramIndex++;
  }

  if (end_date) {
    dateFilter += ` AND started_at <= $${paramIndex}`;
    params.push(end_date);
    paramIndex++;
  }

  // Overall valuation statistics
  const overallQuery = `
    SELECT
      COUNT(*) as total_runs,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_runs,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_runs,
      COUNT(CASE WHEN status = 'running' THEN 1 END) as running_runs,
      ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))), 2) as avg_duration_seconds,
      SUM(total_securities) as total_securities_valued
    FROM valuation_runs
    WHERE 1=1 ${dateFilter}
  `;

  const overallResult = await pool.query(overallQuery, params);

  // By run type
  const byTypeQuery = `
    SELECT
      run_type,
      COUNT(*) as run_count,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
      ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))), 2) as avg_duration_seconds,
      SUM(total_securities) as securities_valued
    FROM valuation_runs
    WHERE 1=1 ${dateFilter}
    GROUP BY run_type
  `;

  const byTypeResult = await pool.query(byTypeQuery, params);

  // Recent runs
  const recentQuery = `
    SELECT
      valuation_run_id,
      run_type,
      status,
      valuation_date,
      total_securities,
      completed_securities,
      EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds,
      started_at,
      completed_at
    FROM valuation_runs
    WHERE 1=1 ${dateFilter}
    ORDER BY started_at DESC
    LIMIT 20
  `;

  const recentResult = await pool.query(recentQuery, params);

  res.json({
    success: true,
    metrics: {
      overall: overallResult.rows[0],
      by_run_type: byTypeResult.rows,
      recent_runs: recentResult.rows
    }
  });
});

/**
 * GET /api/analytics/user-activity
 * User activity tracking
 */
const getUserActivity = asyncHandler(async (req, res) => {
  const { user_id, start_date, end_date, limit = 100 } = req.query;

  let query = `
    SELECT
      e.event_id,
      e.event_type,
      e.entity_type,
      e.entity_id,
      e.description,
      e.metadata,
      e.created_at,
      u.name as user_name,
      u.email as user_email
    FROM event_logs e
    LEFT JOIN users u ON e.user_id = u.user_id
    WHERE 1=1
  `;

  const params = [];
  let paramIndex = 1;

  if (user_id) {
    query += ` AND e.user_id = $${paramIndex}`;
    params.push(user_id);
    paramIndex++;
  }

  if (start_date) {
    query += ` AND e.created_at >= $${paramIndex}`;
    params.push(start_date);
    paramIndex++;
  }

  if (end_date) {
    query += ` AND e.created_at <= $${paramIndex}`;
    params.push(end_date);
    paramIndex++;
  }

  query += `
    ORDER BY e.created_at DESC
    LIMIT $${paramIndex}
  `;
  params.push(parseInt(limit, 10));

  const result = await pool.query(query, params);

  res.json({
    success: true,
    count: result.rows.length,
    activities: result.rows
  });
});

/**
 * GET /api/analytics/system-health
 * System health and performance indicators
 */
const getSystemHealth = asyncHandler(async (req, res) => {
  // Database statistics
  const dbSizeQuery = `
    SELECT
      pg_size_pretty(pg_database_size(current_database())) as database_size,
      (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
      (SELECT COUNT(*) FROM funds) as total_funds,
      (SELECT COUNT(*) FROM portfolios) as total_portfolios,
      (SELECT COUNT(*) FROM security_master) as total_securities,
      (SELECT COUNT(*) FROM positions WHERE status = 'active') as active_positions,
      (SELECT COUNT(*) FROM valuation_runs WHERE status = 'running') as running_valuations
  `;

  const dbSizeResult = await pool.query(dbSizeQuery);

  // Table sizes
  const tableSizeQuery = `
    SELECT
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
      n_tup_ins as inserts,
      n_tup_upd as updates,
      n_tup_del as deletes
    FROM pg_stat_user_tables
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LIMIT 10
  `;

  const tableSizeResult = await pool.query(tableSizeQuery);

  // Recent activity (last 24 hours)
  const activityQuery = `
    SELECT
      COUNT(*) as events_24h,
      COUNT(DISTINCT user_id) as active_users_24h,
      COUNT(CASE WHEN event_type = 'valuation' THEN 1 END) as valuations_24h,
      COUNT(CASE WHEN event_type = 'upload' THEN 1 END) as uploads_24h
    FROM event_logs
    WHERE created_at >= NOW() - INTERVAL '24 hours'
  `;

  const activityResult = await pool.query(activityQuery);

  res.json({
    success: true,
    health: {
      database: dbSizeResult.rows[0],
      table_sizes: tableSizeResult.rows,
      activity_24h: activityResult.rows[0],
      timestamp: new Date()
    }
  });
});

module.exports = {
  getEventAnalytics,
  getEventSummary,
  getEventTimeline,
  getValuationMetrics,
  getUserActivity,
  getSystemHealth
};
