# Roadmap: FinanceApp

## Overview
This roadmap takes the FinanceApp from a blank Expo project to a fully functional, AI-driven personal finance tracker that works across iOS, Android, Web, and Desktop. The strategy focuses on establishing a local-first foundation for privacy, followed by core tracking features, and finishing with advanced AI budgeting and investment guidance.

## Phases

- [x] **Phase 1: Foundation & Infrastructure** - Setup Expo project, SQLite database, and basic navigation.
- [x] **Phase 2: Core Expense Tracker** - Implement manual logging, categories, and CSV import.
- [x] **Phase 3: AI Budgeting & Assistant** - Integrate OpenRouter for chat and intelligent goal-based budgeting.
- [x] **Phase 4: Investment Insights** - Add portfolio analysis and educational investment AI.

- [x] **Phase 5: Desktop Portability & Polish** - Finalize Electron integration and UI refinement for desktop/large screens.
- [x] **Phase 9: Multi-Agent Local AI** - Modular expert team with specialized system prompts.
- [ ] **Phase 10: E2EE Cloud Storage (Zero-Knowledge)** - Implement end-to-end encrypted sync with BIP39 recovery.


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

### Phase 3: Hybrid AI Budgeting & Assistant
**Goal**: Introduce AI-driven value through a hybrid (Cloud + Local) chat and intelligent budgeting.
**Depends on**: Phase 2
**Requirements**: GOAL-01, GOAL-02, GOAL-03, CHAT-01, CHAT-04, FND-05
**Success Criteria**:
  1. User can track specific savings goals.
  2. AI chat works offline for basic balance/history queries.
  3. AI chat seamlessly falls back to Cloud for complex budgeting.
**Plans**: 4 plans

Plans:
- [ ] 03-01: Setup OpenRouter (Cloud) and Local LLM (llama.rn) runtimes.
- [ ] 03-02: Goal tracking system and "Safe to Spend" logic.
- [ ] 03-03: AI Visualization (Pie charts via Skia).
- [ ] 03-04: Hybrid Chat Router (Cloud vs. Local logic).

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

### Phase 6: Improve Dashboard Empty States
**Goal**: Enhance the first-time user experience by replacing empty charts with instructional prompts.
**Depends on**: Phase 5
**Requirements**: CORE-02, GOAL-01
**Success Criteria**:
  1. No empty/zeroed graphs are visible to users with no transaction or budget data.
  2. Every dashboard panel shows a specific, helpful text prompt when its data source is empty.
  3. Clicking any "empty" panel correctly routes the user to the setup screen for that feature.
**Plans**: 1 plan

Plans:
- [ ] 06-01: Implement icon+text empty states across all dashboard tiles.

### Final Phase: 

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete | 2026-04-02 |
| 2. Core Tracker | 3/3 | Complete | 2026-04-03 |
| 3. AI Budgeting | 4/4 | Complete | 2026-04-04 |
| 4. AI Portfolio | 2/2 | Complete | 2026-04-04 |
| 5. Desktop/Polish | 1/1 | Complete | 2026-04-04 |
| 9. Multi-Agent AI | 1/1 | Complete | 2026-04-27 |
| 10. E2EE Storage | 0/5 | Not Started | 2026-04-27 |



### Phase 6: Improve Dashboard Empty States

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 5
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 6 to break down)

### Phase 7: Dashboard Visual Focus - Data Driven Tiles

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 6
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 7 to break down)

### Phase 8: Dashboard Polish & Calculation Verification

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 7
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 8 to break down)

### Phase 9: Multi-Agent Local AI

**Goal**: Transition the local AI from a single advisor into a modular team of financial experts.
**Depends on**: Phase 4
**Requirements**: CHAT-01, CHAT-02
**Success Criteria**:
  1. User can mention agents using `@consultant`, `@risk`, etc.
  2. Each agent responds with a distinct personality and strategy.
  3. UI correctly identifies the active responding specialist.

Plans:
- [x] 09-01: Implement agent definitions and mention parsing logic.

### Phase 10: E2EE Cloud Storage (Zero-Knowledge)

**Goal**: Establish a true zero-knowledge, end-to-end encrypted sync system for absolute financial privacy.
**Depends on**: Phase 5
**Requirements**: PRIVACY-01, SYNC-01
**Success Criteria**:
  1. All financial data is encrypted on the client using AES-256-GCM before upload.
  2. Server stores only encrypted blobs and cannot access raw data.
  3. User can recover their account using a BIP39 24-word seed phrase.
  4. DEK revocation and rotation works seamlessly across devices.

Plans:
- [ ] 10-01: Setup Cryptography Foundation (Argon2id, AES-GCM, Native Modules).
- [ ] 10-02: Implement Secure Key Management and BIP39 Seed Phrase.
- [ ] 10-03: Update Cloud Schema and Implement Encrypted Sync.
- [ ] 10-04: Build E2EE Onboarding and Setup Wizard.
- [ ] 10-05: Implement Tamper-Evident Logs and Security Verification.

---
*Last updated: 2026-04-02*
