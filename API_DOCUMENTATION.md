# API Documentation

## Table of Contents
1. [Getting Started](#getting-started)
   - [Available npm Scripts](#available-npm-scripts)
   - [Development Mode Setup](#development-mode-setup)
   - [Production Mode Setup](#production-mode-setup)
   - [Hybrid Development Mode](#hybrid-development-mode-local-application-with-dockerized-services)
   - [Environment Variables](#environment-variables)
2. [Authentication](#authentication)
3. [Wallet Operations](#wallet-operations)
4. [Transaction Management](#transaction-management)
5. [Health Check](#health-check)
6. [Database Management](#database-management)
7. [Testing](#testing)
8. [Support](#support)

---

## Getting Started

### Prerequisites
- Node.js 18 or higher
- Docker and Docker Compose
- npm or yarn package manager

### Development Workflow Options

The application supports three different development workflows:

| Workflow | Application | Database | Use Case | Iteration Speed |
|----------|-------------|----------|----------|-----------------|
| **Docker Development** | Docker container | Docker container | Standard development, team consistency | Medium (restart required) |
| **Hybrid Development** | Local (npm run dev) | Docker container | Debugging, IDE breakpoints, hot-reload | Fast (auto-restart) |
| **Production** | Docker container | Docker container | Production deployment, staging | Slow (rebuild required) |


### Available npm Scripts

I provided some npm scripts for all common operations. Use these instead of raw Docker commands for consistency:

**Setup Scripts:**
- `npm run setup:dev:fresh` - Clean setup for development mode
- `npm run setup:prod:fresh` - Clean setup for production mode
- `npm run setup:dev` - Setup development mode (keeps existing data)
- `npm run setup:prod` - Setup production mode (keeps existing data)

**Development Mode Scripts:**
- `npm run docker:dev:up` - Start development containers
- `npm run docker:dev:build` - Build and start development containers
- `npm run docker:dev:restart` - Restart application container
- `npm run docker:dev:logs` - View application logs
- `npm run docker:dev:down` - Stop all containers
- `npm run docker:dev:clean` - Stop containers and remove volumes

**Production Mode Scripts:**
- `npm run docker:prod:up` - Start production containers
- `npm run docker:prod:build` - Build production containers
- `npm run docker:prod:restart` - Restart application container
- `npm run docker:prod:logs` - View application logs
- `npm run docker:prod:down` - Stop all containers
- `npm run docker:prod:clean` - Stop containers and remove volumes

**Database Scripts:**
- `npm run db:status` - View database tables
- `npm run db:migrations` - View applied migrations
- `npm run audit:logs` - View recent audit logs

**Utility Scripts:**
- `npm run docker:list` - List all wallet-related containers
- `npm run health` - Check API health
- `npm test` - Run test suite
- `npm run build` - Build TypeScript code
- `npm run dev` - Run application locally (for hybrid mode)

### Development Mode Setup

```bash
# Clone repository
git clone https://github.com/Abdulgithub0/financial-wallet-system.git
cd financial-wallet-system

# Install dependencies
npm install

# Start development environment
npm run setup:dev:fresh

# Verify application is running
curl http://localhost:3000/health
```

**Expected output:**
```json
{
  "success": true,
  "message": "Server is healthy",
  "data": {
    "timestamp": "2025-10-23T20:00:00.000Z",
    "uptime": 10.5,
    "environment": "development"
  }
}
```

### Production Mode Setup

```bash
# Install dependencies
npm install

# Build application
npm run build

# Start production environment
npm run setup:prod:fresh

# Verify application is running
curl http://localhost:3000/health
```

### Hybrid Development Mode (Local Application with Dockerized Database Services)

This approach runs only PostgreSQL and Adminer in Docker while the application runs locally on the host machine (In ts form). This is useful for:
- Majorly For quick debugging sake
- Faster iteration without container restarts
- Direct access to application logs in the terminal
- Hot-reloading with nodemon for instant code changes

**Step 1: Start only database services**

```bash
# Start PostgreSQL and database setup
docker-compose up -d postgres adminer db_setup

# Verify services are running
npm run docker:list
```

**Step 2: Configure environment variables**

Ensure your `.env` file has `localhost` for database host:

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wallet_db
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Step 3: Run application locally**

```bash
# Start application with hot-reloading
npm run dev
```

**Step 4: Verify application is running**

```bash
curl http://localhost:3000/health

# or
npm run health
```

**Expected output:**
```json
{
  "success": true,
  "message": "Server is healthy",
  "data": {
    "timestamp": "2025-10-23T21:41:37.525Z",
    "uptime": 37.739056628,
    "environment": "development",
    "mode": "Development"
  }
}
```

**Making code changes:**

With `npm run dev`, nodemon automatically restarts the application when you save changes to TypeScript files. 

**Stopping the hybrid setup:**

```bash
# Stop application (Ctrl+C in the terminal running npm run dev)

# Stop database services
npm run docker:dev:down
```

### Environment Variables

Create a `.env` file in the project root. The configuration differs based on your setup:

**For Docker Development Mode (all services in containers):**

```env
PORT=3000
NODE_ENV=development
DB_HOST=postgres
DB_PORT=5432
DB_NAME=wallet_db
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**For Hybrid Development Mode (local app with database docker services - postgres and adminer):**

```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wallet_db
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

Note: The key difference is `DB_HOST` - use `postgres` when the app runs in Docker, use `localhost` when the app runs on the host machine.

### Verify Installation

```bash
# Check containers are running
npm run docker:list

# Check database connection
npm run db:status

# Run tests
npm test
```

### Complete Hybrid Mode Workflow Example

This example demonstrates the complete hybrid development workflow from start to finish:

```bash
# 1. Start database services only
docker-compose up -d postgres db_setup

# 2. Verify services are running
npm run docker:list

# Expected output:
# NAMES             STATUS                  PORTS
# wallet_postgres   Up (healthy)            0.0.0.0:5432->5432/tcp

# 3. Ensure .env has localhost configuration
cat .env | grep "DB_HOST"

# Expected output:
# DB_HOST=localhost

# 4. Start application locally with hot-reload
npm run dev

# Application will start and show:
# Database connected successfully
# Server is running on port 3000
# Environment: development

# 5. In another terminal, test the API
curl http://localhost:3000/health

# 6. Register a user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "full_name": "Test User",
    "phone_number": "+2348012345678"
  }'

# 7. Save the token from response and test wallet operations
TOKEN="<Token From Login Response>"

curl -X GET http://localhost:3000/api/v1/wallet/balance \
  -H "Authorization: Bearer $TOKEN"

# 8. Make a code change in src/app.ts
# The application will automatically restart (nodemon hot-reload)

# 9. Test the change immediately
curl http://localhost:3000/health

# 10. When done, stop the application (Ctrl+C) and clean up
npm run docker:dev:down
```

**Quick start script:**

A helper script is provided for quick setup:

```bash
./test-hybrid-mode.sh
```

This script starts the database services and provides instructions for running the application.

---

## Authentication

### Register User

**Endpoint:** `POST /api/v1/auth/register`

**Authentication:** None required

**Request Body:**
```json
{
  "email": "string (required, valid email format)",
  "password": "string (required, min 8 chars, must contain uppercase, lowercase, number, special char)",
  "full_name": "string (required, min 2 chars)",
  "phone_number": "string (required, E.164 format, e.g., +2348012345678)"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "phone_number": "+2348012345678",
      "is_verified": false,
      "created_at": "2025-10-23T20:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**

400 Bad Request - Invalid input:
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

409 Conflict - Email already exists:
```json
{
  "success": false,
  "message": "Email already registered"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123!",
    "full_name": "John Doe",
    "phone_number": "+2348012345678"
  }'
```

---

### Login

**Endpoint:** `POST /api/v1/auth/login`

**Authentication:** None required

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "phone_number": "+2348012345678",
      "is_verified": false,
      "created_at": "2025-10-23T20:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**

401 Unauthorized - Invalid credentials:
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123!"
  }'
```

---

### Get Profile

**Endpoint:** `GET /api/v1/auth/profile`

**Authentication:** Required (Bearer token)

**Request Headers:**
```
Authorization: Bearer <jwt-token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "phone_number": "+2348012345678",
    "is_verified": false,
    "created_at": "2025-10-23T20:00:00.000Z"
  }
}
```

**Error Responses:**

401 Unauthorized - Missing or invalid token:
```json
{
  "success": false,
  "message": "Authentication required"
}
```

**Example:**
```bash
TOKEN="your-jwt-token-here"
curl -X GET http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

---

## Wallet Operations

### Get Balance

**Endpoint:** `GET /api/v1/wallet/balance`

**Authentication:** Required (Bearer token)

**Request Headers:**
```
Authorization: Bearer <jwt-token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Balance retrieved successfully",
  "data": {
    "balance": "10000.00",
    "currency": "NGN"
  }
}
```

**Error Responses:**

401 Unauthorized:
```json
{
  "success": false,
  "message": "Authentication required"
}
```

404 Not Found - Wallet not found:
```json
{
  "success": false,
  "message": "Wallet not found"
}
```

**Example:**
```bash
TOKEN="your-jwt-token-here"
curl -X GET http://localhost:3000/api/v1/wallet/balance \
  -H "Authorization: Bearer $TOKEN"
```

---

### Credit Wallet

**Endpoint:** `POST /api/v1/wallet/credit`

**Authentication:** Required (Bearer token)

**Request Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": "number (required, positive, max 2 decimal places)",
  "description": "string (required, min 3 chars)",
  "reference": "string (required, unique, alphanumeric with hyphens)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Credit transaction successful",
  "data": {
    "id": "uuid",
    "wallet_id": "uuid",
    "user_id": "uuid",
    "type": "credit",
    "amount": "5000.00",
    "reference": "TXN-CREDIT-1234567890",
    "description": "Deposit from bank",
    "balance_before": "10000.00",
    "balance_after": "15000.00",
    "status": "success",
    "created_at": "2025-10-23T20:00:00.000Z"
  }
}
```

**Error Responses:**

400 Bad Request - Invalid amount:
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "amount",
      "message": "Amount must be a positive number"
    }
  ]
}
```

409 Conflict - Duplicate reference:
```json
{
  "success": false,
  "message": "Transaction reference already exists"
}
```

**Example:**
```bash
TOKEN="your-jwt-token-here"
curl -X POST http://localhost:3000/api/v1/wallet/credit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "description": "Deposit from bank",
    "reference": "TXN-CREDIT-1234567890"
  }'
```

---

### Debit Wallet

**Endpoint:** `POST /api/v1/wallet/debit`

**Authentication:** Required (Bearer token)

**Request Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": "number (required, positive, max 2 decimal places)",
  "description": "string (required, min 3 chars)",
  "reference": "string (required, unique, alphanumeric with hyphens)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Debit transaction successful",
  "data": {
    "id": "uuid",
    "wallet_id": "uuid",
    "user_id": "uuid",
    "type": "debit",
    "amount": "2000.00",
    "reference": "TXN-DEBIT-1234567890",
    "description": "Withdrawal to bank",
    "balance_before": "15000.00",
    "balance_after": "13000.00",
    "status": "success",
    "created_at": "2025-10-23T20:00:00.000Z"
  }
}
```

**Error Responses:**

400 Bad Request - Insufficient funds:
```json
{
  "success": false,
  "message": "Insufficient balance"
}
```

409 Conflict - Duplicate reference:
```json
{
  "success": false,
  "message": "Transaction reference already exists"
}
```

**Example:**
```bash
TOKEN="your-jwt-token-here"
curl -X POST http://localhost:3000/api/v1/wallet/debit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2000,
    "description": "Withdrawal to bank",
    "reference": "TXN-DEBIT-1234567890"
  }'
```

---

### Transfer Funds (Peer-to-Peer)

**Endpoint:** `POST /api/v1/wallet/transfer`

**Authentication:** Required (Bearer token)

**Rate Limiting:** 10 requests per 15 minutes

**Request Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "recipient_email": "string (optional, valid email)",
  "recipient_user_id": "string (optional, valid UUID)",
  "amount": "number (required, positive, max 2 decimal places)",
  "description": "string (optional)",
  "reference": "string (optional, unique, auto-generated if not provided)"
}
```

**Note:** Either `recipient_email` OR `recipient_user_id` must be provided (not both).

**Success Response (201):**
```json
{
  "success": true,
  "message": "Transfer successful",
  "data": {
    "sender_transaction": {
      "id": "uuid",
      "wallet_id": "uuid",
      "user_id": "uuid",
      "type": "transfer_out",
      "amount": "500.00",
      "reference": "TXN-1730000000-123-ABC123-OUT",
      "description": "Payment for services to user recipient-uuid",
      "balance_before": "10000.00",
      "balance_after": "9500.00",
      "status": "success",
      "created_at": "2025-10-23T20:00:00.000Z"
    },
    "recipient_transaction": {
      "id": "uuid",
      "wallet_id": "uuid",
      "user_id": "uuid",
      "type": "transfer_in",
      "amount": "500.00",
      "reference": "TXN-1730000000-123-ABC123-IN",
      "description": "Payment for services from user sender-uuid",
      "balance_before": "5000.00",
      "balance_after": "5500.00",
      "status": "success",
      "created_at": "2025-10-23T20:00:00.000Z"
    },
    "sender_new_balance": "9500.00",
    "recipient_new_balance": "5500.00"
  }
}
```

**Note:** The system generates unique references for sender and recipient transactions by appending `-OUT` and `-IN` suffixes to the base reference. This ensures both transactions can be linked together while maintaining database uniqueness constraints.

**Error Responses:**

400 Bad Request - Missing recipient identifier:
```json
{
  "success": false,
  "message": "Either recipient_email or recipient_user_id must be provided"
}
```

400 Bad Request - Invalid amount:
```json
{
  "success": false,
  "message": "Valid amount is required"
}
```

400 Bad Request - Self-transfer:
```json
{
  "success": false,
  "message": "Cannot transfer to yourself"
}
```

400 Bad Request - Insufficient balance:
```json
{
  "success": false,
  "message": "Insufficient balance"
}
```

404 Not Found - Recipient not found:
```json
{
  "success": false,
  "message": "Recipient user not found"
}
```

404 Not Found - Wallet not found:
```json
{
  "success": false,
  "message": "Sender wallet not found"
}
```

409 Conflict - Duplicate reference:
```json
{
  "success": false,
  "message": "Transaction reference already exists"
}
```

429 Too Many Requests - Rate limit exceeded:
```json
{
  "success": false,
  "message": "Too many transfer requests, please try again later",
  "error": "Rate limit exceeded"
}
```

**Example (using recipient email):**
```bash
TOKEN="your-jwt-token-here"
curl -X POST http://localhost:3000/api/v1/wallet/transfer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_email": "recipient@example.com",
    "amount": 500,
    "description": "Payment for services"
  }'
```

**Example (using recipient user ID):**
```bash
TOKEN="your-jwt-token-here"
curl -X POST http://localhost:3000/api/v1/wallet/transfer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_user_id": "fa66c95c-9f04-442e-978b-359108e6756d",
    "amount": 1000,
    "description": "Loan repayment",
    "reference": "TXN-TRANSFER-CUSTOM-001"
  }'
```

---

## Transaction Management

### Get Transaction History

**Endpoint:** `GET /api/v1/wallet/transactions`

**Authentication:** Required (Bearer token)

**Request Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
```
page: number (optional, default: 1, min: 1)
limit: number (optional, default: 10, min: 1, max: 100)
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Transaction history retrieved successfully",
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "wallet_id": "uuid",
        "user_id": "uuid",
        "type": "debit",
        "amount": "2000.00",
        "reference": "TXN-DEBIT-1234567890",
        "description": "Withdrawal to bank",
        "balance_before": "15000.00",
        "balance_after": "13000.00",
        "status": "success",
        "created_at": "2025-10-23T20:00:00.000Z"
      }
    ],
    "total": 25,
    "page": 1,
    "totalPages": 3
  }
}
```

**Error Responses:**

401 Unauthorized:
```json
{
  "success": false,
  "message": "Authentication required"
}
```

**Example:**
```bash
TOKEN="your-jwt-token-here"
curl -X GET "http://localhost:3000/api/v1/wallet/transactions?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

### Get Transaction by Reference

**Endpoint:** `GET /api/v1/wallet/transactions/:reference`

**Authentication:** Required (Bearer token)

**Request Headers:**
```
Authorization: Bearer <jwt-token>
```

**URL Parameters:**
```
reference: string (required, transaction reference)
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Transaction retrieved successfully",
  "data": {
    "id": "uuid",
    "wallet_id": "uuid",
    "user_id": "uuid",
    "type": "credit",
    "amount": "5000.00",
    "reference": "TXN-CREDIT-1234567890",
    "description": "Deposit from bank",
    "balance_before": "10000.00",
    "balance_after": "15000.00",
    "status": "success",
    "created_at": "2025-10-23T20:00:00.000Z"
  }
}
```

**Error Responses:**

404 Not Found:
```json
{
  "success": false,
  "message": "Transaction not found"
}
```

**Example:**
```bash
TOKEN="your-jwt-token-here"
curl -X GET http://localhost:3000/api/v1/wallet/transactions/TXN-CREDIT-1234567890 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Health Check

### Check Application Health

**Endpoint:** `GET /health`

**Authentication:** None required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Server is healthy",
  "data": {
    "timestamp": "2025-10-23T20:00:00.000Z",
    "uptime": 3600.5,
    "environment": "production"
  }
}
```

**Example:**
```bash
curl http://localhost:3000/health
```

---

## Complete Workflow Example

### 1. Register a new user
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "full_name": "Test User",
    "phone_number": "+2348012345678"
  }'
```

### 2. Save the token from response
```bash
TOKEN="<token-from-register-response>"
```

### 3. Check wallet balance
```bash
curl -X GET http://localhost:3000/api/v1/wallet/balance \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Credit wallet
```bash
curl -X POST http://localhost:3000/api/v1/wallet/credit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "description": "Initial deposit",
    "reference": "INIT-DEP-'$(date +%s)'"
  }'
```

### 5. Debit wallet
```bash
curl -X POST http://localhost:3000/api/v1/wallet/debit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2500,
    "description": "Withdrawal",
    "reference": "WD-'$(date +%s)'"
  }'
```

### 6. View transaction history
```bash
curl -X GET "http://localhost:3000/api/v1/wallet/transactions?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "field_name",
      "message": "Specific error message"
    }
  ]
}
```

### Common HTTP Status Codes

- **200 OK** - Request successful
- **201 Created** - Resource created successfully
- **400 Bad Request** - Invalid input or validation error
- **401 Unauthorized** - Authentication required or invalid token
- **404 Not Found** - Resource not found
- **409 Conflict** - Duplicate resource (e.g., email, reference)
- **500 Internal Server Error** - Server error

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

**Configuration:**
- Window: 15 minutes (900000ms)
- Per IP address
- General endpoints: 100 requests per 15 minutes
- Authentication endpoints: 5 requests per 15 minutes

**When rate limit is exceeded:**
```json
{
  "success": false,
  "message": "Too many requests, please try again later"
}
```

---

## Database Management

### Adminer Database Tool

I included Adminer to provide a web-based interface to browse tables, view data, and run SQL queries.

**Access Adminer:**

URL: `http://localhost:8080`

**Login Credentials:**

| Field | Value |
|-------|-------|
| System | PostgreSQL |
| Server | postgres |
| Username | postgres |
| Password | postgres |
| Database | wallet_db |

**Starting Adminer:**

Adminer starts automatically when you run the Docker Compose setup:

```bash
# Development mode
npm run docker:dev:up

# Production mode
npm run docker:prod:up

# Or start only database services with Adminer (for hybrid mode)
# Note: Use docker-compose directly for selective service startup
docker-compose up -d postgres db_setup adminer
```

**Using Adminer:**

1. **Browse Tables:**
   - After logging in, click on the database name (wallet_db) in the left sidebar
   - Click on any table name to view its structure and data
   - Available tables: users, wallets, transactions, audit_logs, schema_migrations

2. **View Data:**
   - Click "Select data" to view all records in a table
   - Use the filter options to search for specific records
   - Click on column headers to sort data

3. **Run SQL Queries:**
   - Click "SQL command" in the left sidebar
   - Enter your SQL query in the text area
   - Click "Execute" to run the query

**Example SQL Queries:**

View all users:
```sql
SELECT id, email, full_name, phone_number, created_at
FROM users
ORDER BY created_at DESC;
```

Check wallet balances:
```sql
SELECT u.email, u.full_name, w.balance, w.currency, w.updated_at
FROM wallets w
JOIN users u ON w.user_id = u.id
ORDER BY w.balance DESC;
```

View recent transactions:
```sql
SELECT t.id, u.email, t.type, t.amount, t.description, t.created_at
FROM transactions t
JOIN users u ON t.user_id = u.id
ORDER BY t.created_at DESC
LIMIT 20;
```

Audit log for a specific user:
```sql
SELECT action, details, ip_address, created_at
FROM audit_logs
WHERE user_id = 'your-user-id-here'
ORDER BY created_at DESC;
```

**Stopping Adminer:**

```bash
# Stop all services including Adminer (development mode)
npm run docker:dev:down

# Stop all services including Adminer (production mode)
npm run docker:prod:down
```


## Testing

Run the test suite:
```bash
npm test
```

Run specific test file:
```bash
npm test -- authService.test.ts
```

Run tests with coverage:
```bash
npm run test:coverage
```

---

## For any troubles during assessment,

For issues or questions:
1. Check the logs: `npm run docker:dev:logs` or `npm run docker:prod:logs`
2. Verify database status: `npm run db:status`
3. Check container health: `npm run docker:list`
4. Review environment variables in `.env` file

