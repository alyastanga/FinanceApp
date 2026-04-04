---
phase: 2
plan: 1
type: execute
wave: 1
depends_on: ["01-foundation-infrastructure/01-PLAN.md"]
files_modified: 12
autonomous: true
requirements: ["CORE-01", "CORE-02", "CORE-03", "CORE-04"]
must_haves:
  truths:
    - "WatermelonDB schema matches supabase_setup.sql"
    - "Sync bridge successfully calls pull_changes and push_changes RPCs"
    - "Transactions are persisted locally and synced to remote"
  artifacts:
    - path: "database/schema.ts"
      provides: "WatermelonDB Schema"
    - path: "lib/sync.ts"
      provides: "Supabase Sync Bridge"
    - path: "components/TransactionForm.tsx"
      provides: "Unified CRUD interface"
---

<objective>
Implement the local-first data layer with WatermelonDB, build the synchronization bridge to Supabase, and create the core transaction management UI.
</objective>

<task>
<name>WatermelonDB Core & Models</name>
<files>
- `database/schema.ts`
- `database/models/Income.ts`
- `database/models/Expense.ts`
- `database/index.ts`
</files>
<read_first>
- `supabase_setup.sql`
</read_first>
<action>
Define the WatermelonDB schema in `database/schema.ts` based on the tables in `supabase_setup.sql`. Create Model classes for `Income` and `Expense` including associations and field definitions. Initialize the `Database` instance in `database/index.ts`.
</action>
<verify>
<automated>npm run lint</automated>
Ensure models correctly map to schema fields and includes `created_at`/`updated_at` for sync metadata.
</verify>
<done>
Local database is initialized with the correct schema and models.
</done>
</task>

<task>
<name>Supabase Sync Bridge</name>
<files>
- `lib/sync.ts`
- `context/AuthContext.tsx`
</files>
<read_first>
- `lib/supabase.ts`
</read_first>
<action>
Implement the `synchronize` logic in `lib/sync.ts`. Define `pullChanges` to fetch remote updates via Supabase RPC and `pushChanges` to send local variations. Integrate this into the `AuthContext` to trigger automatically on mount and session changes.
</action>
<verify>
<automated>npm run lint</automated>
Check that `pullChanges` correctly handles the `lastPulledAt` timestamp provided by WatermelonDB.
</verify>
<done>
Data synchronization between local SQLite and remote Postgres is functional.
</done>
</task>

<task>
<name>Core Transaction UI</name>
<files>
- `components/TransactionForm.tsx`
- `app/(tabs)/index.tsx`
</files>
<read_first>
- `database/index.ts`
</read_first>
<action>
Build a unified `TransactionForm` using NativeWind to handle both Income and Expense entries. Update the Home screen to display a list of transactions using WatermelonDB observables (`withObservables`) for real-time UI updates when sync occurs.
</action>
<verify>
<automated>npm run lint</automated>
Verify that adding a transaction locally updates the UI immediately and triggers a sync in the background.
</verify>
<done>
Users can manage their finances with a responsive, offline-first interface.
</done>
</task>
