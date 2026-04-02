# Roadmap: FinanceApp

## Overview
This roadmap takes the FinanceApp from a blank Expo project to a fully functional, AI-driven personal finance tracker that works across iOS, Android, Web, and Desktop. The strategy focuses on establishing a local-first foundation for privacy, followed by core tracking features, and finishing with advanced AI budgeting and investment guidance.

## Phases

- [ ] **Phase 1: Foundation & Infrastructure** - Setup Expo project, SQLite database, and basic navigation.
- [ ] **Phase 2: Core Expense Tracker** - Implement manual logging, categories, and CSV import.
- [ ] **Phase 3: AI Budgeting & Assistant** - Integrate OpenRouter for chat and intelligent goal-based budgeting.
- [ ] **Phase 4: Investment Insights** - Add portfolio analysis and educational investment AI.
- [ ] **Phase 5: Desktop Portability & Polish** - Finalize Electron integration and UI refinement for desktop/large screens.

## Phase Details

### Phase 1: Foundation & Infrastructure
**Goal**: Establish a stable, cross-platform base with local data persistence.
**Depends on**: Nothing
**Requirements**: FND-01, FND-02, FND-03
**Success Criteria**:
  1. App compiles and runs on iOS, Android, and Web.
  2. SQLite database initializes successfully on all platforms.
  3. Navigation between Home and Settings screens works.
**Plans**: 2 plans

Plans:
- [ ] 01-01: Initialize Expo Router project and basic UI layout.
- [ ] 01-02: Setup SQLite and local-first data architecture.

### Phase 2: Core Expense Tracker
**Goal**: Enable high-fidelity manual data entry and "pseudo-sync" via CSV.
**Depends on**: Phase 1
**Requirements**: CORE-01, CORE-02, CORE-03, CORE-04
**Success Criteria**:
  1. User can add, edit, and delete income/expense entries.
  2. Dashboard shows a summarized view of the monthly balance.
  3. User can upload a CSV file to bulk-import transactions.
**Plans**: 3 plans

Plans:
- [ ] 02-01: Build CRUD interfaces for Income and Expenses.
- [ ] 02-02: Implement categorization logic and summary dashboard.
- [ ] 02-03: Develop CSV Parser for bulk import.

### Phase 3: AI Budgeting & Assistant
**Goal**: Introduce AI-driven value through chat and intelligent budgeting.
**Depends on**: Phase 2
**Requirements**: GOAL-01, GOAL-02, GOAL-03, CHAT-01
**Success Criteria**:
  1. User can set and track specific savings goals.
  2. AI chat accurately answers questions about spending history.
  3. AI generates a "Safe to Spend" budget based on active goals.
**Plans**: 3 plans

Plans:
- [ ] 03-01: Setup OpenRouter integration and AI Chat interface.
- [ ] 03-02: Goal tracking system and "Safe to Spend" logic.
- [ ] 03-03: AI Visualization (Pie charts via Skia).

### Phase 4: Investment Insights
**Goal**: Expand the AI into portfolio analysis and investment guidance.
**Depends on**: Phase 3
**Requirements**: CHAT-02, CHAT-03, GOAL-04
**Success Criteria**:
  1. AI provides educational guidance on investment terms.
  2. AI analyzes user portfolio inputs and suggests real-world improvements.
  3. "Scenario Simulator" correctly predicts goal impact of new purchases.
**Plans**: 2 plans

Plans:
- [ ] 04-01: Portfolio data entry and AI analysis engine.
- [ ] 04-02: Educational AI assistant and Purchase Simulator.

### Phase 5: Desktop Portability & Polish
**Goal**: Optimize the experience for desktop and large-screen users.
**Depends on**: Phase 4
**Requirements**: FND-04
**Success Criteria**:
  1. App runs natively on Desktop via Electron.
  2. UI layout adapts to wide-screen dashboards.
  3. Final UI/UX polish across all platforms.
**Plans**: 2 plans

Plans:
- [ ] 05-01: Electron integration and Desktop-specific builds.
- [ ] 05-02: Global UI/UX refinement and final validation.

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/2 | Not started | - |
| 2. Core Tracker | 0/3 | Not started | - |
| 3. AI Budgeting | 0/3 | Not started | - |
| 4. AI Portfolio | 0/2 | Not started | - |
| 5. Desktop/Polish | 0/2 | Not started | - |

---
*Last updated: 2026-04-02*
