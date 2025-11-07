// ============================================================================
// Database Migration Script
// ============================================================================
// Runs the schema.sql file to set up the complete database
// ============================================================================

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bondvaluator',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 5
});

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('Starting database migration...');
    console.log(`Database: ${process.env.DB_NAME || 'bondvaluator'}`);
    console.log(`Host: ${process.env.DB_HOST || 'localhost'}`);

    // Read the schema file
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    // Execute the schema
    console.log('\nExecuting schema.sql...');
    await client.query(schemaSql);

    console.log('✓ Schema created successfully');

    // Verify tables were created
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log(`\n✓ Created ${result.rows.length} tables:`);
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Create default admin user if not exists
    const adminEmail = 'admin@bondvaluator.com';
    const bcrypt = require('bcryptjs');
    const defaultPassword = await bcrypt.hash('Admin@123', 10);

    const userCheck = await client.query(
      'SELECT user_id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (userCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO users (email, password_hash, name, role, is_active)
        VALUES ($1, $2, $3, $4, $5)
      `, [adminEmail, defaultPassword, 'System Administrator', 'admin', true]);

      console.log('\n✓ Created default admin user:');
      console.log(`  Email: ${adminEmail}`);
      console.log('  Password: Admin@123');
      console.log('  ⚠️  CHANGE THIS PASSWORD IN PRODUCTION!');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('  1. Run seed script: npm run db:seed');
    console.log('  2. Start the server: npm run dev');

  } catch (error) {
    console.error('❌ Migration failed:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migrations
runMigrations();
