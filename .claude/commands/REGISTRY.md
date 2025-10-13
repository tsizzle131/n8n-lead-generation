# Command Registry

**Last Updated:** 2025-10-12
**Total Commands:** 11 built, 3 planned

---

## Purpose

This registry serves as a comprehensive catalog of all commands, their metadata, dependencies, and integration patterns. Use this as a quick reference for command capabilities and usage patterns.

---

## Production Commands

### `/workflow` - Intelligent Task Orchestrator
**Type:** Meta-Command / Orchestrator
**Status:** ✅ Production

**Metadata:**
- **Lines:** 2,095
- **Waves:** 8
- **Agents:** Variable (launches other commands)
- **Validation Gates:** 3 (per orchestrated command)
- **Model:** High (claude-sonnet-4-5)
- **First-Attempt Success:** ~85%

**Purpose:**
Analyzes task requirements, classifies work type, and orchestrates optimal command sequence through 8-wave pattern.

**Usage Patterns:**
```
/workflow Implement user authentication with JWT
/workflow Fix memory leak in data processing
/workflow Refactor API controllers for testability
```

**Task Classifications:**
- Feature Implementation (small/medium/large)
- Bug Fix (critical/major/minor)
- Refactoring (targeted/broad)
- Performance Optimization
- Documentation Update
- Testing/Quality Improvement
- Hybrid tasks

**Integration Points:**
- Orchestrates: /research, /bughunter, /build, /testgen, /refactor, /optimize, /document
- Not orchestrated by any command (top-level)

**Dependencies:**
- Depends on: All other commands for execution
- Required by: None (entry point)

**When to Use:**
- ✅ Complex multi-step tasks
- ✅ Feature implementation
- ✅ Bug fixes with unknown scope
- ✅ Comprehensive project work
- ❌ Simple single-file changes
- ❌ Exploratory work

---

### `/research` - Multi-Domain Research
**Type:** Research / Planning
**Status:** ✅ Production

**Metadata:**
- **Lines:** 996
- **Waves:** 4
- **Agents:** 4 parallel
- **Validation Gates:** 1 (Plan Quality)
- **Model:** High
- **First-Attempt Success:** ~85%

**Purpose:**
Comprehensive analysis across 4 parallel research domains (codebase, docs, config, tests) with synthesized implementation plan.

**Usage Patterns:**
```
/research OAuth 2.0 implementation strategy
/research React state management patterns
/research database migration approaches
```

**Domains Researched:**
- Codebase Patterns - Existing implementations
- Documentation - Architecture decisions
- Configuration - Dependencies and tech stack
- Test & Examples - Usage patterns

**Output:**
- Implementation plan saved to `.claude/plans/research-[TIMESTAMP].md`

**Integration Points:**
- Orchestrated by: /workflow (Wave 2)
- Orchestrates: None
- Often followed by: /build

**Dependencies:**
- Depends on: None
- Required by: /workflow
- Commonly paired with: /build, /explain

**When to Use:**
- ✅ New feature planning
- ✅ Technology research
- ✅ Pattern discovery
- ✅ Before major implementation
- ❌ Simple changes
- ❌ Well-understood tasks

---

### `/bughunter` - Multi-Wave Bug Detection
**Type:** Quality Assurance / Security
**Status:** ✅ Production

**Metadata:**
- **Lines:** 580
- **Waves:** 5
- **Agents:** 5 (1 profiler, 1 mapper, 1 scanner, 5 category analyzers)
- **Validation Gates:** 1 (Analysis Completeness)
- **Model:** High
- **First-Attempt Success:** ~90%

**Purpose:**
Systematic bug discovery across 5 categories (security, memory, logic, concurrency, code quality).

**Usage Patterns:**
```
/bughunter src/
/bughunter src/auth/
/bughunter .
```

**Categories Analyzed:**
- Security Vulnerabilities (OWASP Top 10, injection, XSS)
- Memory & Resource Issues (leaks, unclosed handles)
- Logic Errors (null pointers, off-by-one, type coercion)
- Concurrency Issues (race conditions, deadlocks)
- Code Quality (dead code, duplication, complexity)

**Integration Points:**
- Orchestrated by: /workflow (Wave 3)
- Orchestrates: None
- Often followed by: /refactor, /optimize

**Dependencies:**
- Depends on: None
- Required by: /workflow
- Commonly paired with: /security (planned), /refactor

**When to Use:**
- ✅ Pre-release security checks
- ✅ Code quality audits
- ✅ Bug investigation
- ✅ Technical debt discovery
- ❌ Performance profiling (use /optimize)
- ❌ Test generation (use /testgen)

---

### `/build` - Plan Execution
**Type:** Implementation
**Status:** ✅ Production

**Metadata:**
- **Lines:** 148
- **Waves:** 6
- **Agents:** Variable (depends on plan)
- **Validation Gates:** 1 (Implementation Quality)
- **Model:** High
- **First-Attempt Success:** ~80%

**Purpose:**
Multi-wave implementation from research plan or specification.

**Usage Patterns:**
```
/build .claude/plans/research-[TIMESTAMP].md
/build path/to/spec.md
```

**Integration Points:**
- Orchestrated by: /workflow (Wave 4)
- Orchestrates: Multiple implementation agents
- Often preceded by: /research
- Often followed by: /testgen

**Dependencies:**
- Depends on: Plan file (from /research or manual)
- Required by: /workflow
- Commonly paired with: /research → /build → /testgen

**When to Use:**
- ✅ Implementing from research plan
- ✅ Following specification document
- ✅ Multi-file feature implementation
- ❌ Simple single-file changes
- ❌ Refactoring existing code (use /refactor)

---

### `/testgen` - Intelligent Test Generation
**Type:** Testing / Quality Assurance
**Status:** ✅ Production

**Metadata:**
- **Lines:** 1,548
- **Waves:** 4
- **Agents:** 3 (Source Analyzer, Test Analyzer, Infrastructure Scout)
- **Validation Gates:** 1 (Test Quality)
- **Model:** High
- **First-Attempt Success:** ~75%

**Purpose:**
Comprehensive test suite creation with gap analysis.

**Usage Patterns:**
```
/testgen src/auth/
/testgen src/controllers/UserController.ts
/testgen .
```

**Test Types Generated:**
- Unit tests (functions, methods, classes)
- Edge case tests (boundaries, null handling)
- Error handling tests (exceptions, validation)
- Integration tests (async, mocking)

**Integration Points:**
- Orchestrated by: /workflow (Wave 5)
- Orchestrates: None
- Often preceded by: /build, /refactor

**Dependencies:**
- Depends on: Source code to test
- Required by: /workflow
- Commonly paired with: /build → /testgen, /refactor → /testgen

**When to Use:**
- ✅ Increasing test coverage
- ✅ Testing new features
- ✅ After refactoring
- ✅ Before major changes
- ❌ Tests already exist and are comprehensive

---

### `/refactor` - Code Quality Improvement
**Type:** Quality Improvement
**Status:** ✅ Production

**Metadata:**
- **Lines:** 1,078
- **Waves:** 5
- **Agents:** 4 (Code smell detectors)
- **Validation Gates:** 1 (Refactoring Success)
- **Model:** High
- **First-Attempt Success:** ~85%

**Purpose:**
Safe behavior-preserving transformations to improve code quality.

**Usage Patterns:**
```
/refactor src/legacy/
/refactor src/controllers/UserController.ts
/refactor .
```

**Code Smells Detected:**
- Size & Complexity (god classes, long methods)
- Duplication (exact/near duplicates, magic numbers)
- Conditional Complexity (long if-else, complex booleans)
- Naming & Clarity (poor names, dead code)

**Integration Points:**
- Orchestrated by: /workflow (Wave 6 - alternative to /optimize)
- Orchestrates: None
- Often preceded by: /bughunter
- Often followed by: /testgen

**Dependencies:**
- Depends on: Source code to refactor
- Required by: /workflow
- Commonly paired with: /bughunter → /refactor → /testgen

**When to Use:**
- ✅ Technical debt reduction
- ✅ Code smell elimination
- ✅ Improving maintainability
- ✅ Before adding features
- ❌ Performance issues (use /optimize)
- ❌ Changing functionality

---

### `/optimize` - Performance Optimization
**Type:** Performance Improvement
**Status:** ✅ Production

**Metadata:**
- **Lines:** 1,889
- **Waves:** 5
- **Agents:** 4 (Optimization analyzers)
- **Validation Gates:** 1 (Performance Improvement)
- **Model:** High
- **First-Attempt Success:** ~80%

**Purpose:**
Systematic bottleneck elimination and performance improvement.

**Usage Patterns:**
```
/optimize src/api/
/optimize src/database/queries.ts
/optimize .
```

**Optimization Categories:**
- Database (indexes, N+1 queries, connection pooling)
- Algorithms (complexity reduction, memoization)
- Memory (leak fixes, cache limits, resource cleanup)
- Frontend (code splitting, lazy loading, bundle size)

**Integration Points:**
- Orchestrated by: /workflow (Wave 6 - alternative to /refactor)
- Orchestrates: None
- Often preceded by: Profiling/benchmarking
- Often followed by: /testgen, benchmarking

**Dependencies:**
- Depends on: Source code with performance issues
- Required by: /workflow
- Commonly paired with: Profiling → /optimize → /testgen

**When to Use:**
- ✅ Performance bottlenecks
- ✅ Slow endpoints/functions
- ✅ High resource usage
- ✅ Scale preparation
- ❌ Code quality issues (use /refactor)
- ❌ No measured performance problem

---

### `/document` - Documentation Generation
**Type:** Documentation
**Status:** ✅ Production

**Metadata:**
- **Lines:** 1,843
- **Waves:** 4
- **Agents:** 3 (Code Analyzer, Git Analyzer, Template Generator)
- **Validation Gates:** 1 (Documentation Quality)
- **Model:** High
- **First-Attempt Success:** ~90%

**Purpose:**
Multi-format comprehensive documentation generation.

**Usage Patterns:**
```
/document README
/document API
/document CODE src/
/document ADR
/document CHANGELOG
/document CONTRIBUTING
```

**Documentation Types:**
- README (project overview, setup, usage)
- API (endpoint documentation with examples)
- CODE (inline comments, docstrings)
- ADR (Architecture Decision Records)
- CHANGELOG (git history analysis)
- CONTRIBUTING (development guidelines)

**Integration Points:**
- Orchestrated by: /workflow (Wave 7)
- Orchestrates: None
- Often follows: All implementation commands

**Dependencies:**
- Depends on: Codebase to document
- Required by: /workflow
- Commonly paired with: Final wave of any workflow

**When to Use:**
- ✅ New project documentation
- ✅ Updating stale docs
- ✅ Onboarding materials
- ✅ API documentation
- ❌ Code explanations (use /explain)

---

### `/explain` - Code Explanation
**Type:** Documentation / Education
**Status:** ✅ Production

**Metadata:**
- **Lines:** 1,451
- **Waves:** 4
- **Agents:** 3 (Mapper, Analyzer, Generator)
- **Validation Gates:** 1 (Explanation Quality)
- **Model:** High
- **First-Attempt Success:** ~95%

**Purpose:**
Multi-level code explanation for different audiences.

**Usage Patterns:**
```
/explain src/auth/
/explain authentication system
/explain how JWT works in this codebase
```

**Explanation Levels:**
- High-level (plain English for beginners)
- Technical (detailed architecture for developers)
- Code examples (annotated snippets with diagrams)

**Integration Points:**
- Orchestrated by: None (standalone)
- Orchestrates: None
- Often used: Before /refactor, for onboarding, for documentation

**Dependencies:**
- Depends on: Codebase to explain
- Required by: None
- Commonly paired with: Standalone or /document

**When to Use:**
- ✅ Understanding complex code
- ✅ Onboarding new developers
- ✅ Architecture documentation
- ✅ Before refactoring
- ❌ Generating new documentation (use /document)

---

### `/migrate` - Framework Migration
**Type:** Infrastructure / Migration
**Status:** 🆕 Built (2025-10-12)

**Metadata:**
- **Lines:** 673
- **Waves:** 6
- **Agents:** 7 (4 discovery, 3 preparation, refactoring specialist)
- **Validation Gates:** 3 (Plan Quality, Migration Success, Post-Migration Quality)
- **Model:** High
- **First-Attempt Success:** ~75%

**Purpose:**
Intelligent framework/dependency migration with risk assessment and automated refactoring.

**Usage Patterns:**
```
/migrate react 18
/migrate node 20
/migrate vue3
/migrate typescript 5
/migrate package.json
```

**Common Scenarios:**
- React 17→18, Vue 2→3, Angular 14→17
- Node 14→20, Python 3.8→3.12
- TypeScript 4→5, webpack 4→5
- Full dependency modernization

**Risk Assessment:**
- Breaking Change Risk (deprecated APIs, severity, files affected)
- Dependency Conflict Risk (incompatible deps, peer mismatches)
- Test Coverage Risk (current coverage, tests that may break)
- Implementation Complexity (LOC affected, integration points)

**Integration Points:**
- Orchestrated by: /workflow (not yet integrated)
- Orchestrates: Refactoring specialist agent
- Often preceded by: /deps (planned)
- Often followed by: /testgen

**Dependencies:**
- Depends on: Package manifest, migration target
- Required by: None yet (will be /workflow)
- Commonly paired with: /deps → /migrate → /testgen

**When to Use:**
- ✅ Framework upgrades
- ✅ Language version updates
- ✅ Dependency modernization
- ✅ Major version migrations
- ❌ New feature development
- ❌ Bug fixes

---

## Planned Commands

### `/security` - Comprehensive Security Audit
**Type:** Security / Compliance
**Status:** 📋 Planned (Next to build)

**Planned Metadata:**
- **Lines:** 800-1000 (estimate)
- **Waves:** 5
- **Agents:** 5+ (OWASP parallel, secrets scanner, dependency auditor)
- **Validation Gates:** 3 (Coverage, Findings, Remediation)
- **Model:** High
- **First-Attempt Success:** ~85% (target)

**Purpose:**
OWASP Top 10 analysis, secrets scanning, dependency vulnerabilities, security best practices.

**Planned Usage:**
```
/security
/security src/
/security --compliance SOC2
```

**Planned Integration:**
- Will orchestrate: Multiple security analyzers
- Will integrate with: /workflow, /bughunter
- Will be part of: /audit meta-workflow (planned)

**When to Use (Planned):**
- ✅ Pre-production security checks
- ✅ Compliance requirements
- ✅ Security audits
- ✅ Penetration test prep

---

### `/api` - API Design & Generation
**Type:** Design / Implementation
**Status:** 📋 Planned

**Planned Metadata:**
- **Lines:** 900-1100 (estimate)
- **Waves:** 5
- **Agents:** 4 (Requirements, Designer, Schema, Implementation)
- **Validation Gates:** 3 (Design, Schema, Implementation)
- **Model:** High
- **First-Attempt Success:** ~80% (target)

**Purpose:**
RESTful API design, OpenAPI spec generation, endpoint implementation, authentication patterns.

**Planned Usage:**
```
/api design user management
/api generate from openapi.yaml
/api document existing endpoints
```

**Planned Integration:**
- Will orchestrate: API designers and generators
- Will integrate with: /workflow, /build, /document
- Will work with: /testgen for API tests

**When to Use (Planned):**
- ✅ New API development
- ✅ API redesign
- ✅ OpenAPI spec creation
- ✅ Consistent endpoint patterns

---

### `/deps` - Dependency Management
**Type:** Infrastructure / Maintenance
**Status:** 📋 Planned

**Planned Metadata:**
- **Lines:** 600-800 (estimate)
- **Waves:** 4
- **Agents:** 3 (Auditor, Analyzer, Planner)
- **Validation Gates:** 2 (Audit, Recommendations)
- **Model:** High
- **First-Attempt Success:** ~85% (target)

**Purpose:**
Dependency audit, upgrade recommendations, security vulnerabilities, breaking change analysis.

**Planned Usage:**
```
/deps audit
/deps upgrade
/deps security
```

**Planned Integration:**
- Will orchestrate: Dependency analyzers
- Will integrate with: /workflow, /migrate
- Will be part of: /audit meta-workflow (planned)

**When to Use (Planned):**
- ✅ Regular dependency maintenance
- ✅ Security updates
- ✅ Before migrations
- ✅ Pre-production checks

---

## Meta-Workflows (Planned)

### `/audit` - Comprehensive Project Audit
**Type:** Meta-Workflow
**Status:** 📋 Planned (Phase 2)

**Combines:** /security + /deps + /bughunter + /architect (if built)

**Purpose:** Complete project health check before releases or quarterly reviews.

---

### `/modernize` - Legacy Code Modernization
**Type:** Meta-Workflow
**Status:** 📋 Planned (Phase 2)

**Combines:** /explain + /migrate + /refactor + /testgen + /document

**Purpose:** Systematic legacy code modernization workflow.

---

### `/greenfield` - New Project Setup
**Type:** Meta-Workflow
**Status:** 📋 Planned (Phase 2)

**Combines:** /scaffold (if built) + /security + /cicd (if built) + /document

**Purpose:** Bootstrap new projects with best practices.

---

## Command Dependency Graph

```
/workflow (orchestrator)
├── Orchestrates: /research
├── Orchestrates: /bughunter
├── Orchestrates: /build
├── Orchestrates: /testgen
├── Orchestrates: /refactor (Wave 6 option)
├── Orchestrates: /optimize (Wave 6 option)
├── Orchestrates: /document
└── Will orchestrate: /migrate (pending integration)

/research
└── Often followed by: /build

/build
├── Often preceded by: /research
└── Often followed by: /testgen

/refactor
├── Often preceded by: /bughunter
└── Often followed by: /testgen

/migrate
├── Will be preceded by: /deps (when built)
└── Often followed by: /testgen

/security (planned)
└── Will integrate with: /workflow, /bughunter

/deps (planned)
└── Often followed by: /migrate

Meta-workflows (planned):
/audit = /security + /deps + /bughunter + /architect
/modernize = /explain + /migrate + /refactor + /testgen + /document
/greenfield = /scaffold + /security + /cicd + /document
```

---

## Usage Pattern Examples

### Feature Development
```
/workflow Implement user authentication
→ Calls: /research → /build → /testgen → /refactor → /document
```

### Bug Fix
```
/workflow Fix memory leak in data processing
→ Calls: /bughunter → /refactor → /testgen → /document
```

### Framework Upgrade
```
/deps audit
→ Review recommendations
/migrate react 18
→ Run migration
/testgen src/
→ Ensure tests pass
```

### Pre-Release Check
```
/security
→ Security audit
/deps security
→ Dependency vulnerabilities
/bughunter src/
→ Bug scan
/testgen src/
→ Test coverage
```

### Legacy Modernization
```
/explain src/legacy/
→ Understand code
/migrate node 20
→ Update runtime
/refactor src/legacy/
→ Improve code quality
/testgen src/legacy/
→ Add tests
/document src/legacy/
→ Update docs
```

---

## Command Selection Guide

**Need to understand code?** → `/explain`
**Need to plan implementation?** → `/research`
**Need to build something?** → `/build` or `/workflow`
**Need to find bugs?** → `/bughunter`
**Need to add tests?** → `/testgen`
**Need to improve code quality?** → `/refactor`
**Need to improve performance?** → `/optimize`
**Need to write documentation?** → `/document`
**Need to upgrade frameworks?** → `/migrate`
**Need security check?** → `/security` (planned)
**Need dependency audit?** → `/deps` (planned)
**Need complete workflow?** → `/workflow`

---

**Last Updated:** 2025-10-12
**Registry Version:** 1.0
**Commands Cataloged:** 11 built, 3 planned
