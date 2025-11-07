// ============================================================================
// PostgreSQL Database Connection Pool
// ============================================================================

const { Pool } = require('pg');

// Database configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'bondvaluator',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',

  // Connection pool settings
  max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum number of clients
  min: parseInt(process.env.DB_POOL_MIN || '4'),  // Minimum number of clients
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),

  // SSL configuration (enable in production)
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
};

// Create connection pool
const pool = new Pool(config);

// Pool error handling
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('New database connection established');
  }
});

pool.on('remove', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Database connection removed from pool');
  }
});

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration,
        rows: result.rowCount
      });
    }

    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Helper function to get a client from the pool (for transactions)
const getClient = async () => {
  const client = await pool.connect();
  const originalQuery = client.query;
  const originalRelease = client.release;

  // Set a timeout for client checkout
  const timeout = setTimeout(() => {
    console.error('Client has been checked out for more than 5 seconds!');
    console.error('The last query executed was:', client.lastQuery);
  }, 5000);

  // Monkey patch the query method to keep track of the last query
  client.query = (...args) => {
    client.lastQuery = args;
    return originalQuery.apply(client, args);
  };

  // Monkey patch the release method to clear timeout
  client.release = () => {
    clearTimeout(timeout);
    client.query = originalQuery;
    client.release = originalRelease;
    return originalRelease.apply(client);
  };

  return client;
};

// Transaction helper
const transaction = async (callback) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Pool status
const getPoolStats = () => {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  };
};

// Graceful shutdown
const end = async () => {
  console.log('Closing database connection pool...');
  await pool.end();
  console.log('Database connection pool closed');
};

// Export pool and helper functions
module.exports = {
  query,
  getClient,
  transaction,
  getPoolStats,
  end,
  pool
};
