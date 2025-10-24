# Quick Start Guide

## Installation

### Development Mode

```bash
# Clone and setup
git clone https://github.com/Abdulgithub0/financial-wallet-system.git
cd financial-wallet-system

# Start development environment
npm run setup:dev:fresh

# Verify
npm run health
# or
curl http://localhost:3000/health
```

### Production Mode

```bash
# Clone and setup
git clone https://github.com/Abdulgithub0/financial-wallet-system.git
cd financial-wallet-system

# Build and start production
npm run setup:prod:fresh

# Verify
npm run health
# or
curl http://localhost:3000/health
```

## Testing the API

### 1. Register a User

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

Save the token from the response.

### 2. Set Token Variable

```bash
TOKEN="<Token From Register Or Login Response>" 
```

### 3. Check Balance

```bash
curl -X GET http://localhost:3000/api/v1/wallet/balance \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Credit Wallet

```bash
curl -X POST http://localhost:3000/api/v1/wallet/credit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "description": "Initial deposit",
    "reference": "CREDIT-'$(date +%s)'"
  }'
```

### 5. Debit Wallet

```bash
curl -X POST http://localhost:3000/api/v1/wallet/debit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2500,
    "description": "Withdrawal",
    "reference": "DEBIT-'$(date +%s)'"
  }'
```

### 6. View Transaction History

```bash
curl -X GET "http://localhost:3000/api/v1/wallet/transactions?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

## Common Commands

### Docker Management

```bash
# Development
npm run docker:dev              # Start development
npm run docker:dev:restart      # Restart app
npm run docker:dev:logs         # View logs
npm run docker:dev:down         # Stop
npm run docker:dev:clean        # Clean all data

# Production
npm run docker:prod             # Build and start
npm run docker:prod:restart     # Restart app
npm run docker:prod:logs        # View logs
npm run docker:prod:down        # Stop
npm run docker:prod:clean       # Clean all data
```

### Database

```bash
npm run db:status               # Check database
npm run db:migrate              # Run migrations
npm run db:migrations           # View applied migrations
```

### Testing

```bash
npm test                        # Run all tests
npm run test:coverage           # With coverage
npm run health                  # Health check
```

## Documentation

- **API_DOCUMENTATION.md** - Complete API reference with all endpoints
- **README.md** - Full project documentation
- **postman_collection.json** - Postman collection for testing

## Troubleshooting

### Containers not starting

```bash
npm run docker:dev:clean
npm run setup:dev:fresh
```

### Database connection issues

```bash
docker ps                       # Check containers
npm run db:status              # Check database
npm run docker:dev:logs        # View logs
```

### Code changes not reflected (Development)

```bash
npm run build
npm run docker:dev:restart
```

### Code changes not reflected (Production)

```bash
npm run build
npm run docker:prod            # Full rebuild required
```

## Environment Variables

Required in `.env` file:

```env
NODE_ENV=development
PORT=3000
DB_HOST=postgres
DB_PORT=5432
DB_NAME=wallet_db
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
```

## Next Steps

1. Read **API_DOCUMENTATION.md** for complete endpoint reference
2. Import **postman_collection.json** into Postman
3. Review **README.md** for detailed setup instructions
4. Run tests with `npm test`
5. Check logs with `npm run docker:dev:logs`

