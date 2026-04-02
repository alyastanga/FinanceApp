---
phase: 2
plan: 1
type: execute
wave: 1
depends_on: []
files_modified: 10
autonomous: true
requirements: ["CORE-01", "CORE-02", "CORE-03", "CORE-04"]
must_haves:
  truths:
    - "Manual entries appear in the transaction list"
    - "Dashboard reflects correct monthly balance"
    - "CSV files are parsed and imported into the DB"
  artifacts:
    - path: "components/IncomeForm.tsx"
      provides: "Form for adding income"
      min_lines: 30
    - path: "components/ExpenseForm.tsx"
      provides: "Form for adding expenses"
      min_lines: 35
    - path: "lib/csv-import.ts"
      provides: "CSV parsing logic"
      min_lines: 40
  key_links:
    - from: "components/ExpenseForm.tsx"
      to: "database/index.ts"
      via: "Database observation"
---

<objective>
Build the core financial tracking features including manual CRUD, monthly balance dashboard, and CSV import engine.
</objective>

<task>
<name>Install Core Dependencies</name>
<files>
- `package.json`
</files>
<read_first>
- `package.json`
</read_first>
<action>
Run `npx expo install expo-document-picker papaparse` to add support for file picking and CSV processing.
</action>
<verify>
<automated>grep -E "expo-document-picker|papaparse" package.json</automated>
Check that dependencies are correctly installed.
</verify>
<done>
Libraries are ready for use.
</done>
</task>

<task>
<name>Develop CRUD Components</name>
<files>
- `components/IncomeForm.tsx`
- `components/ExpenseForm.tsx`
- `components/TransactionList.tsx`
</files>
<read_first>
- `database/models/Income.ts`
- `database/models/Expense.ts`
</read_first>
<action>
Create `IncomeForm.tsx` and `ExpenseForm.tsx` using NativeWind for styling. Integrate them into the Home (index) screen so users can log transactions. Each form should interact directly with WatermelonDB models to save data.
</action>
<verify>
<automated>npm run lint</automated>
Check that forms exist and reference the DB correctly.
</verify>
<done>
Manual entry forms are functional.
</done>
</task>

<task>
<name>Implement Dashboard Summary</name>
<files>
- `app/(tabs)/index.tsx`
- `components/BalanceSummary.tsx`
</files>
<read_first>
- `database/index.ts`
</read_first>
<action>
Update the Home screen to query the database for the current month's totals. Calculate `totalIncome`, `totalExpenses`, and the net balance. Display this in a premium balance card using NativeWind gradients.
</action>
<verify>
<automated>npm run lint</automated>
Check that the dashboard calculates totals using the DB query.
</verify>
<done>
Real-time financial summary is visible on the Home screen.
</done>
</task>

<task>
<name>Implement CSV Import Module</name>
<files>
- `lib/csv-import.ts`
</files>
<read_first>
- `database/schema.ts`
</read_first>
<action>
Create the `lib/csv-import.ts` utility. Use `expo-document-picker` to select files, `papaparse` to extract data, and WatermelonDB `batch()` to efficiently insert bulk transactions.
</action>
<verify>
<automated>npm run lint</automated>
Check the import logic to ensure it maps CSV columns to DB fields accurately.
</verify>
<done>
Users can import history via CSV files.
</done>
</task>
