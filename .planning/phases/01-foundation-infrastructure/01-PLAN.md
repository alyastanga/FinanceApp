---
phase: 1
plan: 1
type: execute
wave: 1
depends_on: []
files_modified: 8
autonomous: true
requirements: ["FND-01", "FND-02", "FND-03"]
must_haves:
  truths:
    - "App compiles and runs"
    - "SQLite database initializes successfully"
    - "Navigation between Home and Settings screens works"
  artifacts:
    - path: "app/_layout.tsx"
      provides: "Root navigation layout"
      min_lines: 20
    - path: "app/(tabs)/index.tsx"
      provides: "Home Dashboard"
      min_lines: 10
    - path: "database/index.ts"
      provides: "WatermelonDB instance"
      min_lines: 10
  key_links:
    - from: "app/_layout.tsx"
      to: "database/index.ts"
      via: "DatabaseProvider"
---

<objective>
Initialize Expo Router project, set up WatermelonDB for local-first sqlite storage, and build basic navigation UI.
</objective>

<task>
<name>Scaffold Root Navigation</name>
<files>
- `app/_layout.tsx`
- `app/(tabs)/index.tsx`
- `app/settings.tsx`
</files>
<read_first>
- `package.json`
</read_first>
<action>
Create `app/_layout.tsx` to handle root navigation using Stack or Tabs. Include `app/(tabs)/index.tsx` for Home and `app/settings.tsx` for Settings so that the navigation requirement is met.
</action>
<verify>
<automated>npm run lint</automated>
Check that `app/_layout.tsx`, `app/(tabs)/index.tsx`, and `app/settings.tsx` exist.
</verify>
<done>
Navigation structure is scaffolded and renders without errors.
</done>
</task>

<task>
<name>Setup WatermelonDB Instance</name>
<files>
- `database/index.ts`
- `app/_layout.tsx`
</files>
<read_first>
- `database/schema.ts`
</read_first>
<action>
Create `database/index.ts`. Initialize a new WatermelonDB `Database` instance using the `@nozbe/watermelondb/adapters/sqlite` SQLiteAdapter, and import the database in `app/_layout.tsx` to pass it through a React Provider context to the rest of the application.
</action>
<verify>
<automated>npm run lint</automated>
Check that `database/index.ts` exists and exposes the database, and that it is used in `app/_layout.tsx`.
</verify>
<done>
SQLite is initialized and context is available to children.
</done>
</task>
