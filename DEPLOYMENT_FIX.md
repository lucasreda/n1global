# Database Schema Deployment Fix

## Problem
The deployment is failing with the error:
```
Database schema error: column "onboarding_card_hidden" does not exist
```

## Root Cause
The database schema in production is out of sync with the application code. The `onboarding_card_hidden` column was added to the `users` table in the code schema (`shared/schema.ts`) but the production database hasn't been updated.

## Solution

### Step 1: Update Database Schema
Run the following command to push the schema changes to the production database:

```bash
npm run db:push
```

If that fails, use the force flag:

```bash
npm run db:push --force
```

This will:
- Add the missing `onboarding_card_hidden` column to the `users` table
- Set the default value to `false` for existing records
- Sync any other schema changes

### Step 2: Verify the Fix
After running the schema push:

1. Check that the deployment succeeds
2. Verify that the application starts without crashing
3. Confirm that user login and operations work correctly

## What Was Fixed in the Code

### 1. Added Schema Verification in Seeding Process
The seed process now includes a schema compatibility check that will:
- Verify database schema before attempting to seed
- Exit gracefully if there are schema issues (instead of crash looping)
- Display helpful error messages

**File**: `server/seed.ts`
```typescript
// Verify database schema compatibility
try {
  await db.select().from(users).limit(1);
  console.log("✅ Database schema verification passed");
} catch (schemaError: any) {
  console.error("⚠️ Database schema issue detected:", schemaError.message);
  console.log("⚠️ Skipping seeding - database schema needs migration");
  console.log("ℹ️  Run 'npm run db:push' to update database schema");
  return; // Exit gracefully instead of crashing
}
```

### 2. Schema Definition
The `onboarding_card_hidden` column is properly defined in the schema:

**File**: `shared/schema.ts`
```typescript
export const users = pgTable("users", {
  // ... other fields
  onboardingCardHidden: boolean("onboarding_card_hidden").default(false),
  // ... other fields
});
```

## Prevention for Future Deployments

### Always Run Schema Push Before Deploying
When you make schema changes:

1. Update the schema in `shared/schema.ts`
2. Run `npm run db:push` locally to test
3. Commit the schema changes
4. Run `npm run db:push` in production/staging before deploying
5. Then deploy the application

### Schema Change Checklist
- [ ] Schema updated in `shared/schema.ts`
- [ ] Local database updated with `npm run db:push`
- [ ] Tested locally
- [ ] Production database updated with `npm run db:push`
- [ ] Application deployed

## Technical Details

### Drizzle Kit Commands
- `npm run db:push` - Push schema changes to database (safe, non-destructive)
- `npm run db:push --force` - Force push if there are conflicts (use with caution)

### Database Details
- Database: PostgreSQL (Neon)
- ORM: Drizzle ORM
- Schema file: `shared/schema.ts`
- Migration tool: Drizzle Kit

## Support
If you continue to experience issues:
1. Check that DATABASE_URL environment variable is set correctly
2. Verify database connection is working
3. Review logs for specific error messages
4. Contact support with deployment logs
