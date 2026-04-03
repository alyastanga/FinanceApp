---
phase: 4
plan: 03
subsystem: Data Management
tags: [Destructive, Wipe, Local-First, Supabase]
dependency-graph:
  requires: [Phase 1, Phase 2]
  provides: [Cleanup Utility]
  affects: [Settings UI]
tech-stack: [WatermelonDB, Supabase, React Native]
key-files:
  created: [lib/data-management.ts]
  modified: [app/(tabs)/settings.tsx]
decisions:
  - "User-confirm first via 2-step Alert to prevent accidental data loss."
  - "Atomic deletion of all 5 core tables (incomes, expenses, budgets, goals, portfolio)."
metrics:
  duration: 10m
  completed-date: 2026-04-04
---

# Phase 4 Plan 03: Unified Data Wipe Summary

Implemented a "Nuclear Option" in the Settings screen to permanently wipe all user data from both the local device (WatermelonDB) and the cloud (Supabase).

## One-liner
**Atomic cross-platform data wipe with multi-step user confirmation.**

## Deviations from Plan
None - plan executed exactly as written.

## Implementation Details

### 1. Data Management Core (`lib/data-management.ts`)
Created a centralized utility that:
- Identifies the active user session.
- Iterates through all WatermelonDB collections and performs a permanent destruction of records.
- Issues a `DELETE` command to Supabase for the same collections, scoped to the current `user_id`.

### 2. UI Integration (`settings.tsx`)
- Updated the "Clear Database" button to trigger a `Native Alert`.
- Implemented a two-step confirmation process with descriptive styling.
- Provided clear feedback for success or "Partial Success" (e.g., if the device is offline during cloud wipe).

## Self-Check: PASSED
- [x] `lib/data-management.ts` exists and exports `clearAllUserData`.
- [x] `settings.tsx` imports and calls the utility.
- [x] Commits made: `feat(04-03): add unified data-wipe utility` and `feat(04-03): add Clear Database UI with confirmation`.
