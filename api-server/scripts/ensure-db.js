#!/usr/bin/env node
// ============================================================================
// Development Database Bootstrapper
// ============================================================================
// Ensures the Postgres database exists and applies the schema if the tables
// are missing. Intended to remove the need for manual `createdb` + schema steps.
// ============================================================================

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../.env');
const exampleEnvPath = path.resolve(__dirname, '../.env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(exampleEnvPath)) {
    fs.copyFileSync(exampleEnvPath, envPath);
    console.log('✓ Created api-server/.env from .env.example');
  } else {
    console.warn('⚠️  api-server/.env missing and no example file found.');
  }
}

dotenv.config({ path: envPath });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === 'yourpassword')
    ? undefined
    : process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'bondvaluator'
};

const adminDatabase = process.env.DB_ADMIN_DATABASE || 'postgres';

const schemaPath = path.resolve(__dirname, '../../database/schema.sql');

const createDbStatement = `CREATE DATABASE "${dbConfig.database}" WITH ENCODING='UTF8';`;
const tableCheckStatement = `
  SELECT to_regclass('public.users') AS exists;
`;

async function ensureDatabaseExists() {
  const client = new Client(dbConfig);
  try {
    await client.connect();
    await client.end();
    console.log(`✓ Database "${dbConfig.database}" already exists`);
    return;
  } catch (error) {
    if (error.code !== '3D000') {
      console.error('✗ Failed to connect to target database:', error.message);
      throw error;
    }
  }

  console.log(`⧗ Creating database "${dbConfig.database}"...`);
  const adminClient = new Client({ ...dbConfig, database: adminDatabase });
  await adminClient.connect();
  try {
    await adminClient.query(createDbStatement);
    console.log(`✓ Database "${dbConfig.database}" created`);
  } catch (error) {
    if (error.code === '42P04') {
      console.log(`• Database "${dbConfig.database}" already exists (caught concurrently)`);
    } else {
      console.error('✗ Failed to create database:', error.message);
      throw error;
    }
  } finally {
    await adminClient.end();
  }
}

async function applySchemaIfNeeded() {
  if (!fs.existsSync(schemaPath)) {
    console.error(`✗ Schema file not found at ${schemaPath}`);
    process.exit(1);
  }

  const client = new Client(dbConfig);
  await client.connect();

  const tableCheck = await client.query(tableCheckStatement);
  const hasUsersTable = tableCheck.rows?.[0]?.exists !== null;

  if (hasUsersTable) {
    console.log('✓ Core tables detected; skipping schema import');
    await client.end();
    return;
  }

  console.log('⧗ Applying database schema (first-time setup)...');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  try {
    await client.query(schemaSql);
    console.log('✓ Schema applied successfully');
  } catch (error) {
    console.error('✗ Failed to apply schema:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

async function ensureSchemaUpgrades() {
  const client = new Client(dbConfig);
  await client.connect();

  try {
    const classificationColumn = await client.query(
      `
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'asset_classes'
          AND column_name = 'classification'
        LIMIT 1
      `
    );

    if (classificationColumn.rowCount === 0) {
      console.log('⧗ Applying asset class classification upgrade...');
      await client.query(`
        ALTER TABLE asset_classes
        ADD COLUMN classification TEXT NOT NULL DEFAULT 'bond'
      `);
      console.log('✓ Added classification column to asset_classes');
    }

    const valuationUpdatedColumn = await client.query(
      `
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'valuation_runs'
          AND column_name = 'updated_at'
        LIMIT 1
      `
    );

    if (valuationUpdatedColumn.rowCount === 0) {
      console.log('⧗ Adding updated_at column to valuation_runs...');
      await client.query(`
        ALTER TABLE valuation_runs
        ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()
      `);
      console.log('✓ Added updated_at column to valuation_runs');
    }

    const curveYearFractionColumn = await client.query(
      `
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'curve_points'
          AND column_name = 'year_fraction'
        LIMIT 1
      `
    );

    if (curveYearFractionColumn.rowCount === 0) {
      console.log('⧗ Adding year_fraction column to curve_points...');
      await client.query(`
        ALTER TABLE curve_points
        ADD COLUMN year_fraction NUMERIC(18,8)
      `);
      console.log('✓ Added year_fraction column to curve_points');
    }

    const curveMaturityColumn = await client.query(
      `
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'curve_points'
          AND column_name = 'maturity_date'
        LIMIT 1
      `
    );

    if (curveMaturityColumn.rowCount === 0) {
      console.log('⧗ Adding maturity_date column to curve_points...');
      await client.query(`
        ALTER TABLE curve_points
        ADD COLUMN maturity_date DATE
      `);
      console.log('✓ Added maturity_date column to curve_points');
    }

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_curve_points_maturity
      ON curve_points(curve_id, maturity_date)
    `);
  } finally {
    await client.end();
  }
}

async function run() {
  try {
    await ensureDatabaseExists();
    await applySchemaIfNeeded();
    await ensureSchemaUpgrades();
  } catch (error) {
    console.error('\nDatabase bootstrap failed.');
    process.exit(1);
  }
}

run();
