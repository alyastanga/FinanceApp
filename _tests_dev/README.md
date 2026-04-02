# Developer Test Environment (`_tests_dev`)

This folder contains utilities, seeders, and mocks strictly used for **development and testing**.
Do not import anything from this folder into production components unless guarded by `__DEV__` or an explicit feature flag.

## Files
- `seed.ts`: Wipes the local database and inserts deterministic mock data (incomes, expenses, and goals) so developers can test the AI agent and visualization components rapidly.
