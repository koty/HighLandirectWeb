# CloudFlare D1 Database Setup

## Prerequisites

1. CloudFlare account with Pages project deployed
2. `wrangler` CLI installed and authenticated

## Setup Steps

### 1. Authenticate with CloudFlare
```bash
npx wrangler login
```

### 2. Create D1 Database
```bash
npx wrangler d1 create highlandirect-db
```

This will output something like:
```
[[d1_databases]]
binding = "DB"
database_name = "highlandirect-db"
database_id = "xxxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 3. Update wrangler.toml
Copy the `database_id` from step 2 and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "highlandirect-db"
database_id = "YOUR_ACTUAL_DATABASE_ID_HERE"
```

### 4. Create Database Schema
```bash
npx wrangler d1 execute highlandirect-db --file=migration/schema.sql
```

### 5. Insert Initial Data
```bash
npx wrangler d1 execute highlandirect-db --file=migration/seed.sql
```

### 6. Configure CloudFlare Pages

1. Go to CloudFlare Pages Dashboard
2. Select your project: `highlandirect`
3. Go to **Settings** → **Functions**
4. Add **D1 database binding**:
   - Variable name: `DB`
   - D1 database: `highlandirect-db`

### 7. Deploy and Test

1. Commit and push changes to trigger deployment
2. Test the API endpoints:
   - `https://yoursite.pages.dev/api/health`
   - `https://yoursite.pages.dev/api/orders`

## Verification

Test database connectivity:
```bash
npx wrangler d1 execute highlandirect-db --command="SELECT COUNT(*) FROM 'Order'"
```

Expected result: `{"count(*)":3}` (3 initial orders)

## Local Development

For local testing with actual database:
```bash
npx wrangler dev --local --persist
```

## Files

- `migration/schema.sql` - Database schema
- `migration/seed.sql` - Initial data
- `functions/api/orders.js` - D1-enabled API functions
- `wrangler.toml` - CloudFlare configuration