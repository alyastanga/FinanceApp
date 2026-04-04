# Debug Session: MISSING_PORTFOLIO_TABLE

## Symptoms
- **Reported Error**: `ERROR [Data Management] Failed to clear cloud table portfolio: Could not find the table 'public.portfolio' in the schema cache`
- **Context**: Occurs during `clearAllUserData` when attempting to delete from the cloud via the Supabase client.

## Hypotheses
1. **Missing Table**: The `portfolio` table is defined in the local WatermelonDB schema but was never created in the Supabase PostgreSQL database. (Confirmed: No migration files found in local repository).

## Root Cause
The `portfolio` table is missing in the Supabase public schema. While Phase 4 correctly added the table locally to WatermelonDB, the remote Supabase database was not updated to reflect this new collection.

## Proposed Fix
Provide the SQL DDL for the `portfolio` table and update `lib/data-management.ts` to handle missing tables more gracefully.

## Resolution
1. **User Action**: Run the provided SQL in Supabase SQL Editor.
2. **Agent Action**: Improve error handling in `lib/data-management.ts` to log warnings instead of crashing on missing tables.
