# Phase 2: Validation Architecture

## Overview
Phase 2 focuses on data integrity during manual and bulk entry. Verification must confirm that all financial calculations are accurate and that the CSV parser handles real-world file variations without crashing.

## Automated Verification Requirements

### Wave 0 Tasks
- Pre-linting and type-checking are mandatory before any feature PR.
- Unit tests for `lib/csv-import.ts` using mock CSV data (valid and malformed).

### Testing Tiers
1.  **Unit Tests**: `npx jest lib/csv-import.ts` (Verify column mapping).
2.  **Lint**: `npm run lint`.
3.  **Manual Verification**: Confirm dashboard totals update immediately after a mock CSV import.

### Implementation Checklist
- CSV import uses `batch()` for large files.
- UI forms use native keyboards for numeric input (`keyboardType="numeric"`).
- Dashboard uses WatermelonDB decorators (`@lazy`, `@observe`) for real-time reactivity.
