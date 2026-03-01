/**
 * Database Setup Script
 * 
 * This script helps verify your database connection and optionally creates tables.
 * 
 * Usage:
 *   node scripts/setup-db.js
 *   node scripts/setup-db.js --create-tables
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool, query } from '../src/db.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const result = await query('SELECT NOW() as current_time, version() as version');
    console.log('✅ Database connected successfully!');
    console.log('   Time:', result.rows[0].current_time);
    console.log('   Version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('   Error:', error.message);
    console.error('\n   Please check:');
    console.error('   1. PostgreSQL is running');
    console.error('   2. DATABASE_URL in .env is correct');
    console.error('   3. Database exists');
    return false;
  }
}

async function checkTables() {
  try {
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'games', 'moves')
      ORDER BY table_name
    `);
    
    const existingTables = result.rows.map(r => r.table_name);
    const requiredTables = ['users', 'games', 'moves'];
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));
    
    if (missingTables.length === 0) {
      console.log('✅ All required tables exist!');
      return true;
    } else {
      console.log('⚠️  Missing tables:', missingTables.join(', '));
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
    return false;
  }
}

async function createTables() {
  try {
    console.log('Creating tables from schema.sql...');
    const schemaPath = join(__dirname, '../database/schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    // Split by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        await query(statement + ';');
      }
    }
    
    console.log('✅ Tables created successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    return false;
  }
}

async function main() {
  console.log('=== Database Setup Script ===\n');
  
  // Test connection
  const connected = await testConnection();
  if (!connected) {
    process.exit(1);
  }
  
  console.log('');
  
  // Check tables
  const tablesExist = await checkTables();
  
  // Create tables if requested or missing
  const args = process.argv.slice(2);
  if (args.includes('--create-tables') || !tablesExist) {
    if (!tablesExist) {
      console.log('\nCreating missing tables...');
      await createTables();
    } else {
      console.log('\nTables already exist. Use --create-tables to recreate.');
    }
  }
  
  console.log('\n=== Setup Complete ===');
  await pool.end();
}

main().catch(console.error);
