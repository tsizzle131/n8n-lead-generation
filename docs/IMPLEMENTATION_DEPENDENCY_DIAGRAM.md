# Implementation Dependency Diagram

**Created**: 2025-10-13
**Purpose**: Visual representation of implementation dependencies and parallelization opportunities

---

## Dependency Graph (SQL Functions)

```
┌─────────────────────────────────────────────────────────────┐
│                    INDEPENDENT GROUPS                        │
│              (Can be developed in parallel)                  │
└─────────────────────────────────────────────────────────────┘

Group 1                   Group 2                   Group 3
┌────────────────┐       ┌────────────────┐       ┌────────────────┐
│   Campaign     │       │   Facebook     │       │   LinkedIn     │
│   Creation     │       │  Enrichment    │       │  Enrichment    │
│                │       │                │       │                │
│  3-4 hours     │       │  3-4 hours     │       │  4-5 hours     │
│  Medium        │       │  Medium        │       │  High          │
└────────────────┘       └────────────────┘       └────────────────┘
       ║                        ║                        ║
       ║                        ║                        ║
       ▼                        ▼                        ▼
  Tables:                  Tables:                  Tables:
  - campaigns              - fb_enrichments         - li_enrichments
  - coverage               - businesses             - businesses


Group 4-6                 Group 5                   Group 6
┌────────────────┐       ┌────────────────┐       ┌────────────────┐
│     Email      │       │   Campaign     │       │     Batch      │
│ Verification   │       │  Statistics    │       │  Operations    │
│ (3 variants)   │       │                │       │                │
│  3-4 hours     │       │  2-3 hours     │       │  4-5 hours     │
│  Medium        │       │  Medium        │       │  High          │
└────────────────┘       └────────────────┘       └────────────────┘
       ║                        ║                        ║
       ║                        ║                        ║
       ▼                        ▼                        ▼
  Tables:                  Tables:                  Tables:
  - fb_enrichments         - campaigns (read)       - businesses
  - li_enrichments         - businesses (read)
  - businesses             - enrichments (read)
  - verifications


Group 7                   Group 8
┌────────────────┐       ┌────────────────┐
│   Coverage     │       │     Status     │
│    Update      │       │  Transition    │
│                │       │                │
│  1-2 hours     │       │  2-3 hours     │
│  Low           │       │  Medium        │
└────────────────┘       └────────────────┘
       ║                        ║
       ║                        ║
       ▼                        ▼
  Tables:                  Tables:
  - coverage               - campaigns

                           Helper:
                           - status_validation()
```

---

## 4-Agent Parallel Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           AGENT ASSIGNMENTS                              │
│                      (Parallel Development - Day 1)                      │
└─────────────────────────────────────────────────────────────────────────┘

Agent 1: Campaign Lifecycle       Agent 2: Enrichment Operations
┌─────────────────────────────┐   ┌─────────────────────────────┐
│ Group 1: Campaign Creation  │   │ Group 2: Facebook Enrich    │
│          3-4 hours          │   │          3-4 hours          │
│                             │   │                             │
│ Group 8: Status Transition  │   │ Group 3: LinkedIn Enrich    │
│          2-3 hours          │   │          4-5 hours          │
│                             │   │                             │
│ Group 7: Coverage Update    │   └─────────────────────────────┘
│          1-2 hours          │
└─────────────────────────────┘   Total: 7-9 hours
Total: 6-9 hours


Agent 3: Email Verification       Agent 4: Batch Operations
┌─────────────────────────────┐   ┌─────────────────────────────┐
│ Group 4-6: Email Verify     │   │ Group 6: Batch Upsert       │
│            3-4 hours        │   │          4-5 hours          │
│                             │   │                             │
│ Group 5: Statistics         │   │ + Integration Setup         │
│          2-3 hours          │   │                             │
└─────────────────────────────┘   └─────────────────────────────┘
Total: 5-7 hours                  Total: 4-5 hours


┌─────────────────────────────────────────────────────────────────────────┐
│                      PARALLEL COMPLETION TIME                            │
│                           Max: 8-12 hours                                │
│                (vs Sequential: 24-32 hours = 3x faster)                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Application Code Integration Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 1: SQL FUNCTIONS (Day 1)                        │
│                        All 8 groups in parallel                          │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ All SQL functions complete
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              PHASE 2: JAVASCRIPT INTEGRATION (Day 2 - Morning)           │
│                     3 methods in supabase-db.js                          │
└─────────────────────────────────────────────────────────────────────────┘

Location 1                  Location 2                  Location 3
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Campaign       │         │  Batch Save     │         │  Facebook       │
│  Create         │         │  Businesses     │         │  Enrichment     │
│                 │         │                 │         │                 │
│  Lines 45-95    │         │  Lines 144-189  │         │  Lines 227-246  │
│  → RPC wrapper  │         │  → RPC wrapper  │         │  → RPC wrapper  │
└─────────────────┘         └─────────────────┘         └─────────────────┘
        │                           │                           │
        └───────────────────────────┴───────────────────────────┘
                                    │
                                    ▼
                           Estimated: 2-3 hours
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              PHASE 3: PYTHON INTEGRATION (Day 2 - Afternoon)             │
│                5 methods in gmaps_supabase_manager.py                    │
└─────────────────────────────────────────────────────────────────────────┘

Location 4           Location 5           Location 6           Location 7
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Facebook    │     │  LinkedIn    │     │  LinkedIn    │     │  Facebook    │
│  Enrichment  │     │  Enrichment  │     │  Verification│     │  Verification│
│              │     │              │     │              │     │              │
│  Lines 320-  │     │  Lines 382-  │     │  Lines 457-  │     │  Lines 521-  │
│  361         │     │  455         │     │  519         │     │  586         │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘

Location 8
┌──────────────┐
│  Google Maps │
│  Verification│
│              │
│  Lines 588-  │
│  639         │
└──────────────┘
        │
        └────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                           Estimated: 3-4 hours
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   PHASE 4: TEST UPDATES (Day 3)                          │
│                        7 test files updated                              │
└─────────────────────────────────────────────────────────────────────────┘

Test Suite Updates              New Test Files
┌──────────────────────────┐    ┌──────────────────────────┐
│ test_campaign_manager    │    │ test_stored_procedures   │
│ test_gmaps_integration   │    │ test_transaction_rollback│
│ test_complete_flow       │    │                          │
│ test_email_source_track  │    └──────────────────────────┘
│ test_email_enrichment    │
│ test_linkedin_full       │
│ test_update_campaign     │
└──────────────────────────┘
        │
        └────────────────────────────────────────────┘
                                    │
                                    ▼
                           Estimated: 4-6 hours
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              PHASE 5: INTEGRATION TESTING (Day 3-4)                      │
│                   End-to-end validation & performance                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## File Update Dependencies

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FILE MODIFICATION ORDER                          │
└─────────────────────────────────────────────────────────────────────────┘

1. SQL Migration                       (Day 1 - 8 hours)
   migrations/schema/20251013_001_add_transaction_stored_procedures.sql
   │
   │ All 10 functions + helper
   │ ~800 lines SQL
   │
   └──────────────────────────────────────────┐
                                              │
                                              ▼
2. JavaScript DB Layer                 (Day 2 - 2 hours)
   supabase-db.js
   │
   │ Replace 3 methods with RPC wrappers
   │ Lines: 45-95, 144-189, 227-246
   │ Net change: -60 lines
   │
   └──────────────────────────────────────────┐
                                              │
                                              ▼
3. Python DB Manager                   (Day 2 - 3 hours)
   gmaps_supabase_manager.py
   │
   │ Replace 5 methods with RPC wrappers
   │ Lines: 320-361, 382-455, 457-519, 521-586, 588-639
   │ Net change: -160 lines
   │
   └──────────────────────────────────────────┐
                                              │
                                              ▼
4. Campaign Manager (Optional)         (Day 2 - 1 hour)
   gmaps_campaign_manager.py
   │
   │ Update 8 call sites (if needed)
   │ Lines: 290, 323, 517, 542, 625, 656, 666, 802
   │ Net change: 0 lines (signature-compatible)
   │
   └──────────────────────────────────────────┐
                                              │
                                              ▼
5. Test Files                          (Day 3 - 4 hours)
   tests/*.py, tests/integration/*.py
   │
   │ Update 7 test files
   │ Add 2 new test files
   │ Net change: +300 lines
   │
   └──────────────────────────────────────────┐
                                              │
                                              ▼
6. Integration Validation              (Day 3-4 - 4 hours)
   Run full test suite, performance tests, rollback scenarios
```

---

## Risk Dependencies

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      HIGH RISK ITEMS (Do First)                          │
└─────────────────────────────────────────────────────────────────────────┘

1. Campaign Creation
   ┌────────────────────────────────────────────┐
   │ Risk: Frontend dependency                  │
   │ Impact: User-facing feature                │
   │ Mitigation: Feature flag + thorough testing│
   └────────────────────────────────────────────┘
                    │
                    │ Test before enabling
                    ▼
2. Batch Operations
   ┌────────────────────────────────────────────┐
   │ Risk: Performance + deduplication logic    │
   │ Impact: Core Phase 1 operation             │
   │ Mitigation: Performance tests + monitoring │
   └────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                    MEDIUM RISK ITEMS (Do Second)                         │
└─────────────────────────────────────────────────────────────────────────┘

3. Facebook Enrichment
   ┌────────────────────────────────────────────┐
   │ Risk: Email source priority logic          │
   │ Impact: Phase 2 operation                  │
   │ Mitigation: Email source tracking tests    │
   └────────────────────────────────────────────┘

4. LinkedIn Enrichment
   ┌────────────────────────────────────────────┐
   │ Risk: Many fields + Bouncer integration    │
   │ Impact: Phase 2.5 operation                │
   │ Mitigation: Field mapping tests            │
   └────────────────────────────────────────────┘

5. Email Verification
   ┌────────────────────────────────────────────┐
   │ Risk: 3 code paths + audit logging         │
   │ Impact: All phases                         │
   │ Mitigation: Branch coverage tests          │
   └────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                      LOW RISK ITEMS (Do Last)                            │
└─────────────────────────────────────────────────────────────────────────┘

6. Campaign Statistics
   ┌────────────────────────────────────────────┐
   │ Risk: Performance on large datasets        │
   │ Impact: Informational (can be recalculated)│
   │ Mitigation: Performance tests              │
   └────────────────────────────────────────────┘

7. Coverage Update
   ┌────────────────────────────────────────────┐
   │ Risk: Minimal (single table)               │
   │ Impact: Internal tracking                  │
   │ Mitigation: Basic unit tests               │
   └────────────────────────────────────────────┘

8. Status Transition
   ┌────────────────────────────────────────────┐
   │ Risk: Minimal (state machine well-defined) │
   │ Impact: Campaign lifecycle                 │
   │ Mitigation: State transition tests         │
   └────────────────────────────────────────────┘
```

---

## Testing Dependencies

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TESTING PHASES                                   │
└─────────────────────────────────────────────────────────────────────────┘

Phase A: SQL Unit Tests              Phase B: Integration Tests
(After each function)                 (After all functions)
┌──────────────────────────┐         ┌──────────────────────────┐
│ Test function in isolation│         │ Test application code    │
│ - Success cases           │         │ - Frontend to DB         │
│ - Error cases             │         │ - Python to DB           │
│ - Rollback scenarios      │ ───────>│ - End-to-end flows       │
│ - Edge cases              │         │ - Concurrent operations  │
└──────────────────────────┘         └──────────────────────────┘
         │                                      │
         │ 5-10 tests per function              │ 3-5 tests per function
         │ 60-80 total                          │ 30-40 total
         │                                      │
         └──────────────────┬───────────────────┘
                            │
                            ▼
Phase C: Performance Tests            Phase D: Rollback Tests
(After integration tests)              (After integration tests)
┌──────────────────────────┐         ┌──────────────────────────┐
│ Test transaction duration │         │ Test failure scenarios   │
│ - Small datasets          │         │ - Network interruptions  │
│ - Medium datasets         │         │ - Mid-transaction fails  │
│ - Large datasets          │         │ - Constraint violations  │
│ - Concurrent operations   │         │ - Data integrity checks  │
└──────────────────────────┘         └──────────────────────────┘
         │                                      │
         │ 2-4 tests per function               │ 2-3 tests per function
         │ 20-30 total                          │ 15-20 total
         │                                      │
         └──────────────────┬───────────────────┘
                            │
                            ▼
                ┌──────────────────────────┐
                │   PRODUCTION READY       │
                │   Total: 125-170 tests   │
                └──────────────────────────┘
```

---

## Deployment Dependencies

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    GRADUAL ROLLOUT STRATEGY                              │
└─────────────────────────────────────────────────────────────────────────┘

Week 1: Development                    Week 2: Staging
┌──────────────────────────┐          ┌──────────────────────────┐
│ All SQL functions        │          │ Deploy to staging DB     │
│ All application code     │          │ Run full test suite      │
│ All tests written        │──────────>│ Performance benchmark    │
│ Feature flags added      │          │ Monitor for 2-3 days     │
└──────────────────────────┘          └──────────────────────────┘
                                               │
                                               │ All tests pass
                                               │
                                               ▼
Week 3: Production (Gradual)          Week 4: Full Production
┌──────────────────────────┐          ┌──────────────────────────┐
│ Day 1: 10% traffic       │          │ 100% traffic on RPC      │
│ Day 2: 25% traffic       │          │ Remove feature flags     │
│ Day 3: 50% traffic       │──────────>│ Remove legacy code       │
│ Day 4: 75% traffic       │          │ Update documentation     │
│ Day 5: 100% traffic      │          │ Post-mortem analysis     │
└──────────────────────────┘          └──────────────────────────┘

Monitoring at each stage:
- Transaction success rate
- Rollback rate
- Lock timeouts
- Data consistency
- Performance metrics
```

---

## Summary: Critical Path

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CRITICAL PATH (3-5 days)                            │
└─────────────────────────────────────────────────────────────────────────┘

Day 1 (8 hours)
├─ Agent 1: Campaign Creation + Status + Coverage
├─ Agent 2: Facebook + LinkedIn Enrichment
├─ Agent 3: Email Verification + Statistics
└─ Agent 4: Batch Operations

Day 2 (6 hours)
├─ JavaScript integration (2 hours)
└─ Python integration (4 hours)

Day 3 (8 hours)
├─ Test updates (4 hours)
└─ Integration testing (4 hours)

Day 4 (Optional: 4 hours)
└─ Performance testing + optimization

Day 5 (Optional: 4 hours)
└─ Staging deployment + monitoring

TOTAL: 26-30 hours over 3-5 days
```

---

## Decision Points

### Parallel vs Sequential
```
Parallel Development (RECOMMENDED)
┌──────────────────────────────────┐
│ Pros:                            │
│ - Fastest (8-12 hours)           │
│ - Leverages 4 agents             │
│ - Groups truly independent       │
│                                  │
│ Cons:                            │
│ - Requires coordination          │
│ - Integration testing after all  │
└──────────────────────────────────┘

Sequential Development
┌──────────────────────────────────┐
│ Pros:                            │
│ - Lower coordination             │
│ - Test each before next          │
│ - Easier for single developer    │
│                                  │
│ Cons:                            │
│ - Slower (24-32 hours)           │
│ - May lose momentum              │
└──────────────────────────────────┘
```

**Recommendation**: Parallel development with 4 agents for fastest completion

---

**Status**: Ready for Implementation
**Last Updated**: 2025-10-13
**Total Diagrams**: 10 visual representations
