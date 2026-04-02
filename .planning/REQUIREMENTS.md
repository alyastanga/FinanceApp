# Requirements: FinanceApp

**Defined:** 2026-04-02
**Core Value:** Empowering users (from students to wealth-builders) to achieve specific savings goals through AI-optimized budgeting and actionable investment insights.

## v1 Requirements

### Foundation & Portability
- [ ] **FND-01**: Unified codebase for iOS, Android, and Web (React Native/Expo)
- [ ] **FND-02**: Local SQLite database for offline-first data persistence
- [ ] **FND-03**: Secure local storage for sensitive user data
- [ ] **FND-04**: Responsive layout that adapts from mobile to desktop screen sizes
- [ ] **FND-05**: Local LLM runtime (llama.rn) for offline-first privacy

### Core Finance Tracking
- [ ] **CORE-01**: User can log monthly income with source labels
- [ ] **CORE-02**: User can log expenses with custom categories (Food, Rent, etc.)
- [ ] **CORE-03**: Dashboard showing current month's spending vs. income
- [ ] **CORE-04**: CSV Import functionality (allowing "pseudo-sync" without paid APIs)

### AI Budgeting & Goals
- [ ] **GOAL-01**: User can set specific savings goals (e.g., "Save $1000 for Japan trip")
- [ ] **GOAL-02**: AI analyzes spending history to generate a "Safe to Spend" daily budget
- [ ] **GOAL-03**: AI creates a pie chart visualization for optimal money splitting
- [ ] **GOAL-04**: "Scenario Simulator": User can ask AI how a potential purchase affects their goals

### AI Insights & Chat
- [ ] **CHAT-01**: Real-time AI chat interface for querying financial status (e.g., "How much did I spend on coffee this week?")
- [ ] **CHAT-02**: AI provides educational investment guidance (general concepts)
- [ ] **CHAT-03**: AI analyzes user-provided portfolio data to suggest optimizations based on trends
- [ ] **CHAT-04**: Offline-first AI mode for basic financial status queries

## v2 Requirements

### Advanced Features
- **ADV-01**: Automated Receipt Scanning (OCR)
- **ADV-02**: Multi-currency support
- **ADV-03**: Advanced portfolio performance tracking (integrating live market APIs)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automated Bank Sync | Paid API cost ($) not suitable for student budget v1 |
| Direct Stock Trading | Regulatory/Brokerage complexity |
| Cloud Sync / Multi-user | Privacy-first local approach for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 1 | Pending |
| FND-02 | Phase 1 | Pending |
| FND-03 | Phase 1 | Pending |
| FND-04 | Phase 5 | Pending |
| FND-05 | Phase 3 | Pending |
| CORE-01 | Phase 2 | Pending |
| CORE-02 | Phase 2 | Pending |
| CORE-03 | Phase 2 | Pending |
| CORE-04 | Phase 2 | Pending |
| GOAL-01 | Phase 3 | Pending |
| GOAL-02 | Phase 3 | Pending |
| GOAL-03 | Phase 3 | Pending |
| GOAL-04 | Phase 4 | Pending |
| CHAT-01 | Phase 3 | Pending |
| CHAT-02 | Phase 4 | Pending |
| CHAT-03 | Phase 4 | Pending |
| CHAT-04 | Phase 3 | Pending |

---
*Last updated: 2026-04-02*
