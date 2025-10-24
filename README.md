# Financial Wallet System

A secure, scalable financial wallet backend system built with Node.js, TypeScript, and PostgreSQL.

## Features

- User authentication with JWT
- Wallet balance management
- Credit and debit operations with ACID guarantees
- Transaction history with pagination
- Idempotent transactions using unique references
- Atomic operations with row-level locking
- Audit logging for compliance
- Rate limiting and security middleware
- Docker containerization
- **Automatic database migrations** on install

## Technology Stack

- **Backend**: Node.js with TypeScript
- **Database**: PostgreSQL 15
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Testing**: Jest
- **Migrations**: Automated with tracking

## Prerequisites

- Node.js 18 or higher
- Docker and Docker Compose
- PostgreSQL 15 (if running locally without Docker)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Abdulgithub0/financial-wallet-system.git
cd financial-wallet-system
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=wallet_db
DB_USER=postgres
DB_PASSWORD=your_secure_password

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=24h

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Quick Start

### Fresh Setup (Recommended for First Time)

Run the complete setup with a single command:

```bash
npm run setup:fresh
```

This command will:
1. Clean up any existing Docker containers and volumes
2. Install all dependencies
3. **Automatically run database migrations** (via postinstall hook)
4. Build the TypeScript code
5. Start all Docker services (PostgreSQL, Application)

### Regular Setup

If you already have dependencies installed:

```bash
npm run setup
```

This will:
1. Install dependencies (if needed)
2. **Automatically run database migrations** (via postinstall hook)
3. Build the TypeScript code
4. Start all Docker services

## Running the Application

### Using Docker (Recommended)

Start all services:

```bash
npm run docker:up
# or
docker-compose up -d
```

This will start:
- PostgreSQL database
- Database setup service (runs migrations)
- Application server

The API will be available at `http://localhost:3000`

**Note**: Database migrations run automatically when you `npm install`. If you need to run them manually:

```bash
npm run db:migrate
# or
npm run setup:db
```

### Available NPM Scripts

**Setup Commands:**
- `npm run setup` - Install dependencies, build, and start Docker services
- `npm run setup:fresh` - Clean setup from scratch (removes all data)

**Docker Commands:**
- `npm run docker:up` - Start all Docker services
- `npm run docker:down` - Stop all Docker services
- `npm run docker:clean` - Stop services and remove volumes (deletes all data)
- `npm run docker:logs` - View application logs
- `npm run docker:restart` - Restart the application container
- `npm run docker:build` - Build Docker images

**Development Commands:**
- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Run in development mode with hot reload
- `npm start` - Run the compiled application

**Testing Commands:**
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:e2e` - Run end-to-end tests
- `npm run verify` - Run unit tests and health check

**Database Commands:**
- `npm run db:status` - Check database tables
- `npm run db:migrate` - Run database migrations
- `npm run db:migrations` - View applied migrations
- `npm run setup:db` - Run database setup (same as db:migrate)

**Health Check:**
- `npm run health` - Check if the server is running

To view logs:

```bash
docker-compose logs -f app
```

To stop all services:

```bash
docker-compose down
```


## Database Migrations

### Automatic Migrations (Recommended)

Database migrations run automatically after `npm install` via the postinstall hook. This means:

- Migrations are tracked in the `schema_migrations` table
- Already-applied migrations are skipped (idempotent, I used 001, 002 (e.t.c) for synchronization tracking)
- Safe to run multiple times

### Manual Migration Management

If you need to run migrations manually:

```bash
# Run all pending migrations
npm run db:migrate

# View applied migrations
npm run db:migrations

# Check database status
npm run db:status
```

### Adding New Migrations

1. Create a new migration file in `database/migrations/`:

```bash
# Use the next number in sequence
touch database/migrations/004_add_new_feature.sql
```

2. Write idempotent SQL (use `IF NOT EXISTS`, `CREATE OR REPLACE`, etc.):

```sql
-- Example: Adding a new table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now()
);

-- Example: Adding an index
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id
  ON user_preferences(user_id);
```

3. Run the migration:

```bash
npm run db:migrate
```

4. Verify the migration was applied:

```bash
npm run db:migrations
```

### Migration Tracking

All applied migrations are tracked in the `schema_migrations` table:

```sql
SELECT * FROM schema_migrations ORDER BY applied_at;

-- Output:
-- id |        migration_name        |         applied_at
-- ----+------------------------------+----------------------------
--  1 | 001_create_tables            | 2025-10-23 18:20:40.341401
--  2 | 002_alter_full_name_not_null | 2025-10-23 18:20:40.4043
```

### Skip Postinstall (CI/CD)

To skip automatic migrations during `npm install` (e.g., in CI environments):

```bash
SKIP_POSTINSTALL=true npm install
```

For more details, see [scripts/README.md](scripts/README.md).

## API Documentation

For complete API documentation, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md).
For Postman collection, see [postman_collection.json](postman_collection.json).

### Base URL

```
http://localhost:3000/api/v1
```

### Authentication Endpoints

#### Register User

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "phone_number": "+2348012345678"
}
```

#### Login User

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Get Profile

```http
GET /api/v1/auth/profile
Authorization: Bearer <token>
```

### Wallet Endpoints

#### Get Balance

```http
GET /api/v1/wallet/balance
Authorization: Bearer <token>
```

#### Credit Wallet

```http
POST /api/v1/wallet/credit
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 1000,
  "description": "Deposit",
  "reference": "TXN-1234567890-ABCD"
}
```

#### Debit Wallet

```http
POST /api/v1/wallet/debit
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 500,
  "description": "Withdrawal"
}
```

#### Get Transaction History

```http
GET /api/v1/wallet/transactions?page=1&limit=20
Authorization: Bearer <token>
```

#### Get Transaction by Reference

```http
GET /api/v1/wallet/transactions/:reference
Authorization: Bearer <token>
```

### Health Check

```http
GET /health
```

## Postman Collection

Import the `postman_collection.json` file into Postman to test all API endpoints.

## Testing

Run unit tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Database Schema

The system uses the following tables:

- **users**: User authentication and profile
- **wallets**: User wallet balances
- **transactions**: Transaction ledger
- **sessions**: JWT session tracking
- **audit_logs**: System event tracking (I don't include Api for this but you can query the database to view the logs or adminer with your browser on http://localhost:8080 with username: postgres , password: postgres , server : postgres , database: wallet_db )

## Security Features

- Password hashing with bcrypt
- JWT-based authentication
- Rate limiting on all endpoints
- Helmet.js for security headers
- Input validation
- SQL injection prevention
- CORS enabled

## Architecture Highlights

- Atomic transactions with row-level locking
- Idempotent operations using unique references
- Audit logging for compliance
- Scalable microservices-ready architecture

## Project Structure

```
financial-wallet-system/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── database/        # Database connections
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   ├── __tests__/       # Unit tests
│   ├── app.ts           # Express app setup
│   └── index.ts         # Application entry point
├── database/
│   ├── migrations/      # SQL migration scripts
│   └── setup.sh         # Database setup script
├── .env.example         # Environment variables template
├── docker-compose.yml   # Docker Compose configuration
├── Dockerfile           # Docker image definition
├── tsconfig.json        # TypeScript configuration
└── package.json         # Project dependencies
```


