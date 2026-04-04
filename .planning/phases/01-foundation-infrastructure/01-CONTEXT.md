# Phase 1 Context: Foundation & Infrastructure

This document captures the locked architectural decisions for the initial phase of FinanceApp development.

## Locked Decisions

### D-01: Persistence Strategy
**Decision:** WatermelonDB (Local) + Supabase (Remote)
**Rationale:** Provides instant UI responsiveness and offline support while ensuring data is backed up and synced to the cloud.
**Status:** Locked

### D-02: Identity Provider
**Decision:** Supabase Auth
**Rationale:** Integrated solution for user authentication, providing seamless access to the Postgres backend and RLS.
**Status:** Locked

### D-03: Root Navigation
**Decision:** Tab-based Navigation
**Rationale:** standard mobile UX for financial applications (Dashboard, Expenses, Stats, Settings).
**Status:** Locked

### D-04: Sync Strategy
**Decision:** Automatic Sync on Mount/Resume
**Rationale:** Ensures data parity across devices without requiring manual user intervention.
**Status:** Locked

## Technical Stack
- **Framework:** Expo (React Native)
- **Styling:** NativeWind (Tailwind CSS)
- **Database:** WatermelonDB (SQLite) / Supabase (Postgres)
- **Auth:** Supabase Auth
- **Graphics:** React Native Skia (for visualizations)

## Constraints
- Must handle offline state gracefully.
- Must clear local database on user logout (Security).
- Schema parity must be maintained between `supabase_setup.sql` and WatermelonDB models.
