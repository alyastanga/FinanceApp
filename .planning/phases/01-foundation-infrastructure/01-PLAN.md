---
phase: 1
plan: 1
type: execute
wave: 1
depends_on: []
files_modified: 5
autonomous: true
requirements: ["FND-01", "FND-02", "FND-03"]
must_haves:
  truths:
    - "Supabase client initializes without errors"
    - "AuthContext provides session state to the root layout"
    - "App redirects to Login when no session exists"
  artifacts:
    - path: "lib/supabase.ts"
      provides: "Supabase client"
    - path: "context/AuthContext.tsx"
      provides: "User session provider"
    - path: "app/(auth)/login.tsx"
      provides: "Identity entry point"
---

<objective>
Setup Supabase authentication and establish a protected navigation structure where the main dashboard is only accessible to logged-in users.
</objective>

<task>
<name>Supabase & Auth Infrastructure</name>
<files>
- `lib/supabase.ts`
- `context/AuthContext.tsx`
</files>
<read_first>
- `.env`
</read_first>
<action>
Create `lib/supabase.ts` to initialize the `@supabase/supabase-js` client. Create `context/AuthContext.tsx` using `useContext` to expose `session`, `user`, and `signOut` to the application. Implement a listener for `onAuthStateChange` to keep the session in sync.
</action>
<verify>
<automated>npm run lint</automated>
Check that `context/AuthContext.tsx` correctly handles the loading state during the initial session check.
</verify>
<done>
Auth infrastructure is ready and provides reactive session state.
</done>
</task>

<task>
<name>Identity UI & Root Guard</name>
<files>
- `app/(auth)/login.tsx`
- `app/_layout.tsx`
</files>
<read_first>
- `app/(tabs)/_layout.tsx`
</read_first>
<action>
Build a simple Login screen in `app/(auth)/login.tsx` using NativeWind. Update the root `app/_layout.tsx` to wrap the entire project in `AuthProvider`. Use a conditional redirect (via `expo-router`'s `Slot` or `Stack`) that sends unauthenticated users to `/(auth)/login`.
</action>
<verify>
<automated>npm run lint</automated>
Ensure `app/_layout.tsx` includes the `AuthProvider` and logic for navigating based on session presence.
</verify>
<done>
Users are successfully guarded by authentication and can log in via the UI.
</done>
</task>
