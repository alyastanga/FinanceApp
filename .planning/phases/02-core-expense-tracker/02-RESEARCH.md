# Phase 2: Core Expense Tracker - Research

## Feature Analysis

### 1. Manual Logging (CORE-01, CORE-02)
- **UI Pattern**: Modal or inline forms with NativeWind styling.
- **Data Entry**: Numeric keypad for amounts, string labels for sources/categories.
- **Database**: Direct use of `@nozbe/watermelondb` `collections.create()` and `update()`.

### 2. Month-over-Month Dashboard (CORE-03)
- **Aggregation**: Querying WatermelonDB with date range filters.
- **Logic**: 
  - `totalIncome = incomes.where(createdAt >= monthStart).sum(amount)`
  - `totalExpenses = expenses.where(createdAt >= monthStart).sum(amount)`
  - `balance = totalIncome - totalExpenses`
- **Visualization**: Simple balance cards and transaction lists (Charts to follow in Phase 3).

### 3. CSV Import (CORE-04)
- **File Selection**: `expo-document-picker`.
- **Parsing**: `papaparse` (High performance, supports streams, web-compatible).
- **Batching**: WatermelonDB `batch()` for performant multi-record inserts.

## Dependencies to Add
```bash
npx expo install expo-document-picker papaparse
```

## Validation Architecture (Phase 2)
- **Unit**: Verify CSV parser handles edge cases (empty lines, missing columns).
- **Integration**: Verify total calculation logic matches manual entries.
- **UX**: Verify optimistic UI updates (records appear instantly).

## Navigation Impact
- Home screen becomes the "Dashboard".
- Add "Add Income" and "Add Expense" buttons.
- Create a "Quick Import" button for CSVs.
