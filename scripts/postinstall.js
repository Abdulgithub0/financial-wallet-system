#!/usr/bin/env node

/**
 * Post-install setup script for Financial Wallet Backend System
 *
 * This script runs automatically after `npm install` and performs:
 * 1. Database connection verification
 * 2. Database migrations (in order)
 * 3. System health checks
 *
 * The script is idempotent and safe to run multiple times.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Helper functions for colored output
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.error(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`\n${colors.cyan}${colors.bright}▶${colors.reset} ${msg}`),
};

// Configuration
const config = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'wallet_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
};

/**
 * Wait for a service to be available
 */
async function waitForService(checkFn, serviceName, maxRetries = 30, delayMs = 1000) {
  log.info(`Waiting for ${serviceName} to be available...`);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await checkFn();
      log.success(`${serviceName} is available`);
      return true;
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new Error(`${serviceName} is not available after ${maxRetries} attempts`);
      }
      process.stdout.write('.');
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

/**
 * Check if PostgreSQL is available
 */
async function checkPostgres() {
  const client = new Client(config.db);
  await client.connect();
  await client.query('SELECT NOW()');
  await client.end();
}



/**
 * Create database if it doesn't exist
 */
async function ensureDatabase() {
  log.step('Ensuring database exists...');
  
  const client = new Client({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: 'postgres', 
  });

  try {
    await client.connect();
    
    // Check if database exists
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [config.db.database]
    );

    if (result.rows.length === 0) {
      log.info(`Creating database '${config.db.database}'...`);
      await client.query(`CREATE DATABASE ${config.db.database}`);
      log.success(`Database '${config.db.database}' created`);
    } else {
      log.info(`Database '${config.db.database}' already exists`);
    }
  } catch (error) {
    log.error(`Failed to ensure database: ${error.message}`);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Check if a migration has been applied
 */
async function isMigrationApplied(client, migrationName) {
  try {
    // Check if migrations table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schema_migrations'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      return false;
    }

    // Check if this specific migration has been applied
    const result = await client.query(
      'SELECT 1 FROM schema_migrations WHERE migration_name = $1',
      [migrationName]
    );

    return result.rows.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Record a migration as applied
 */
async function recordMigration(client, migrationName) {
  await client.query(
    `INSERT INTO schema_migrations (migration_name, applied_at) 
     VALUES ($1, NOW())
     ON CONFLICT (migration_name) DO NOTHING`,
    [migrationName]
  );
}

/**
 * Create migrations tracking table
 */
async function createMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}

/**
 * Apply database migrations
 */
async function applyMigrations() {
  log.step('Applying database migrations...');

  const client = new Client(config.db);
  
  try {
    await client.connect();
    
    // Create migrations tracking table
    await createMigrationsTable(client);
    log.info('Migrations tracking table ready');

    // Get all migration files
    const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      log.warning('No migrations directory found, skipping migrations');
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure order (001, 002, etc.)

    if (migrationFiles.length === 0) {
      log.warning('No migration files found');
      return;
    }

    log.info(`Found ${migrationFiles.length} migration file(s)`);

    // Apply each migration
    for (const file of migrationFiles) {
      const migrationName = file.replace('.sql', '');
      
      // Check if already applied
      const applied = await isMigrationApplied(client, migrationName);
      
      if (applied) {
        log.info(`Migration '${migrationName}' already applied, skipping`);
        continue;
      }

      log.info(`Applying migration '${migrationName}'...`);
      
      const migrationPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(migrationPath, 'utf8');

      try {
        // Execute migration in a transaction
        await client.query('BEGIN');
        await client.query(sql);
        await recordMigration(client, migrationName);
        await client.query('COMMIT');
        
        log.success(`Migration '${migrationName}' applied successfully`);
      } catch (error) {
        await client.query('ROLLBACK');
        log.error(`Failed to apply migration '${migrationName}': ${error.message}`);
        throw error;
      }
    }

    log.success('All migrations applied successfully');
  } catch (error) {
    log.error(`Migration failed: ${error.message}`);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Verify system health
 */
async function verifySystemHealth() {
  log.step('Verifying system health...');

  const client = new Client(config.db);
  
  try {
    await client.connect();

    // Check if all required tables exist
    const tables = ['users', 'wallets', 'transactions', 'audit_logs', 'schema_migrations'];
    
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);

      if (result.rows[0].exists) {
        log.success(`Table '${table}' exists`);
      } else {
        log.warning(`Table '${table}' does not exist`);
      }
    }

    // Get migration status
    const migrations = await client.query(
      'SELECT migration_name, applied_at FROM schema_migrations ORDER BY applied_at'
    );
    
    if (migrations.rows.length > 0) {
      log.info(`Applied migrations: ${migrations.rows.length}`);
      migrations.rows.forEach(row => {
        log.info(`  - ${row.migration_name} (${new Date(row.applied_at).toISOString()})`);
      });
    }

  } catch (error) {
    log.error(`Health check failed: ${error.message}`);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Main setup function
 */
async function main() {
  // Skip postinstall if SKIP_POSTINSTALL environment variable is set
  if (process.env.SKIP_POSTINSTALL === 'true') {
    console.log('Skipping post-install setup (SKIP_POSTINSTALL=true)');
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bright}Financial Wallet Backend System - Post-Install Setup${colors.reset}`);
  console.log('='.repeat(60) + '\n');

  try {
    // Skip setup if in CI environment or if explicitly disabled
    if (process.env.SKIP_POSTINSTALL === 'true') {
      log.warning('Post-install setup skipped (SKIP_POSTINSTALL=true)');
      return;
    }

    // Wait for PostgreSQL to be available
    log.step('Checking PostgreSQL availability...');
    await waitForService(checkPostgres, 'PostgreSQL', 30, 1000);

    // Ensure database exists
    await ensureDatabase();

    // Apply migrations
    await applyMigrations();

    // Verify system health
    await verifySystemHealth();

    // Success message
    console.log('\n' + '='.repeat(60));
    log.success('Post-install setup completed successfully!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    log.error('Post-install setup failed!');
    log.error(error.message);
    console.log('='.repeat(60) + '\n');
    
    // Don't fail npm install if services are not available
    // This allows development without Docker
    if (error.message.includes('not available')) {
      log.warning('Setup incomplete - services may not be running');
      log.info('Run `npm run docker:up` to start services, then run this script manually');
      process.exit(0); 
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };

