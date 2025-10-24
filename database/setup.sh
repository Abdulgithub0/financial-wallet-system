#!/bin/bash

set -e

echo "Setting up database..."

export PGPASSWORD=${DB_PASSWORD:-postgres}

psql -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} -d postgres -c "CREATE DATABASE ${DB_NAME:-wallet_db};" || echo "Database already exists"

psql -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} -d ${DB_NAME:-wallet_db} -f /migrations/001_create_tables.sql

echo "Database setup completed successfully"

