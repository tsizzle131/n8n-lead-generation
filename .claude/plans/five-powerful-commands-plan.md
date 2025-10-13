# Plan: Five Most Powerful Slash Commands

## Objective

Implement five powerful slash commands that complement the existing `/build`, `/bughunter`, and `/research` commands, creating a comprehensive development workflow system.

## Analysis of Existing Commands

**Current Coverage:**
- `/build` - Takes a plan and implements it through multi-wave agents
- `/bughunter` - Analyzes code for bugs with security-first priority
- `/research` - Researches topics and generates implementation plans
- `/test` - Basic example command

**Gaps Identified:**
1. No refactoring/code improvement command
2. No testing/test generation command
3. No documentation generation command
4. No deployment/release preparation command
5. No codebase explanation/onboarding command
6. No dependency management/upgrade command
7. No performance optimization command

## The Five Most Powerful Commands

### 1. `/refactor` - Intelligent Code Refactoring

**Power Level:** ⭐⭐⭐⭐⭐ (Critical for code quality)

**Purpose:** Systematically improve code quality through refactoring while maintaining functionality.

**Key Features:**
- Detect code smells (long methods, duplicate code, large classes)
- Suggest and apply refactoring patterns
- Extract methods, classes, and interfaces
- Rename variables/functions for clarity
- Simplify complex conditionals
- Automated testing before and after refactoring

**Workflow:**
- Wave 1: Code smell detection across codebase
- Wave 2: Refactoring strategy planning
- Wave 3: Safe refactoring execution with tests
- Wave 4: Validation and regression testing

**Why Powerful:**
- Directly improves code maintainability
- Reduces technical debt
- Makes future development faster
- Complements `/bughunter` by fixing structural issues

---

### 2. `/testgen` - Intelligent Test Generation

**Power Level:** ⭐⭐⭐⭐⭐ (Essential for quality)

**Purpose:** Generate comprehensive test suites for existing code or new features.

**Key Features:**
- Analyze code to understand functionality
- Generate unit tests with edge cases
- Generate integration tests
- Create test fixtures and mocks
- Achieve target code coverage (e.g., 80%+)
- Generate both happy path and error cases

**Workflow:**
- Wave 1: Code analysis and test gap identification
- Wave 2: Test case design (unit, integration, edge cases)
- Wave 3: Test implementation with assertions
- Wave 4: Test execution and coverage validation

**Why Powerful:**
- Dramatically increases code coverage
- Catches regressions before they reach production
- Documents expected behavior through tests
- Enables confident refactoring
- Pairs perfectly with `/build` and `/refactor`

---

### 3. `/explain` - Codebase Intelligence & Onboarding

**Power Level:** ⭐⭐⭐⭐ (Accelerates onboarding)

**Purpose:** Generate comprehensive explanations of codebases, features, or specific code sections.

**Key Features:**
- High-level architecture overview
- Component interaction diagrams (as text/markdown)
- Data flow analysis
- Entry point identification
- Technology stack explanation
- Onboarding guide generation
- Feature walkthrough generation
- "How does X work?" explanations

**Workflow:**
- Wave 1: Codebase structure mapping
- Wave 2: Dependency and interaction analysis
- Wave 3: Documentation synthesis
- Wave 4: Explanation generation with examples

**Why Powerful:**
- Reduces onboarding time from weeks to hours
- Creates living documentation
- Helps developers understand legacy code
- Enables faster feature development
- Complements `/research` for internal code

---

### 4. `/optimize` - Performance Optimization

**Power Level:** ⭐⭐⭐⭐ (Critical for scale)

**Purpose:** Identify and fix performance bottlenecks systematically.

**Key Features:**
- Detect N+1 database queries
- Identify inefficient algorithms (O(n²) → O(n log n))
- Find unnecessary re-renders (React)
- Detect memory leaks and bloat
- Suggest caching strategies
- Database index recommendations
- Bundle size optimization
- API response time improvements

**Workflow:**
- Wave 1: Performance profiling and bottleneck detection
- Wave 2: Optimization strategy planning
- Wave 3: Implementation of optimizations
- Wave 4: Benchmarking and validation

**Why Powerful:**
- Directly improves user experience
- Reduces infrastructure costs
- Enables scaling
- Prevents performance regressions
- Complements `/bughunter` by finding performance "bugs"

---

### 5. `/document` - Automated Documentation Generation

**Power Level:** ⭐⭐⭐⭐ (Saves massive time)

**Purpose:** Generate comprehensive, accurate documentation for code, APIs, and systems.

**Key Features:**
- README generation with setup instructions
- API documentation (OpenAPI/Swagger)
- Function/class docstrings generation
- Architecture decision records (ADRs)
- Inline code comments
- Usage examples
- Troubleshooting guides
- Changelog generation from git history

**Workflow:**
- Wave 1: Code analysis and structure mapping
- Wave 2: Documentation strategy (what to document)
- Wave 3: Documentation generation
- Wave 4: Validation and formatting

**Why Powerful:**
- Documentation stays in sync with code
- Reduces maintenance burden
- Improves team collaboration
- Enables API adoption
- Complements `/explain` with formal docs
- Saves hours of manual writing

---

## Implementation Priority

**Priority 1 (Highest Value):**
1. `/testgen` - Testing is foundational for all other commands
2. `/refactor` - Code quality enables everything else

**Priority 2 (High Value):**
3. `/explain` - Unlocks understanding
4. `/optimize` - Critical for production systems

**Priority 3 (Strong Value):**
5. `/document` - Completes the workflow

---

## Command Comparison Matrix

| Command | Problem Solved | Synergy With | Impact | Difficulty |
|---------|---------------|--------------|--------|-----------|
| `/refactor` | Technical debt | `/bughunter`, `/testgen` | High | Medium |
| `/testgen` | Low test coverage | `/build`, `/refactor` | Very High | Medium |
| `/explain` | Codebase complexity | `/research`, `/document` | High | Medium |
| `/optimize` | Performance issues | `/bughunter`, `/refactor` | High | High |
| `/document` | Missing docs | `/explain`, `/build` | Medium-High | Low |

---

## Architecture Design

All commands follow the proven multi-wave pattern:

**Standard Wave Structure:**
1. **Validation & Scoping** - Validate inputs, establish boundaries
2. **Analysis Wave** - Parallel agents analyze codebase
3. **Strategy Wave** - Plan approach based on analysis
4. **Execution Wave** - Implement changes/generate outputs
5. **Validation Wave** - Verify results, run tests

**Shared Patterns:**
- Parallel agent execution for efficiency
- Synchronization points between waves
- Context management (token budgets)
- Adaptive scaling based on project size
- Comprehensive error handling
- Structured output formats

---

## File Structure

All commands will be created in:
```
.claude/commands/
├── refactor.md
├── testgen.md
├── explain.md
├── optimize.md
└── document.md
```

---

## Success Criteria

Each command must:
- Follow established patterns from `/build`, `/bughunter`, `/research`
- Use proper frontmatter (description, argument-hint, allowed-tools, model)
- Implement multi-wave workflow with parallel agents
- Include comprehensive error handling
- Provide usage examples
- Define clear success criteria
- Include execution guidelines
- Be production-ready (similar quality to existing commands)

---

## Estimated Impact

**Developer Productivity:**
- `/testgen`: +40% (automated test writing)
- `/refactor`: +30% (faster code improvements)
- `/explain`: +50% onboarding speed
- `/optimize`: +25% performance (user-facing)
- `/document`: +35% collaboration efficiency

**Combined Impact:** 3-5x improvement in development workflow completeness

---

## Technical Specifications

**Frontmatter Template:**
```yaml
---
description: [One-line description]
argument-hint: [argument]
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
model: claude-sonnet-4-5-20250929
---
```

**Wave Count:**
- `/refactor`: 4-5 waves
- `/testgen`: 4 waves
- `/explain`: 4 waves
- `/optimize`: 5 waves
- `/document`: 4 waves

**Average Command Size:** 800-1200 lines (similar to existing commands)

---

## Next Steps

1. Implement `/refactor` command
2. Implement `/testgen` command
3. Implement `/explain` command
4. Implement `/optimize` command
5. Implement `/document` command
6. Create README documenting all commands
7. Test each command on real codebases

---

## Notes

- All commands designed to work standalone or in combination
- Each command saves significant developer time (hours → minutes)
- Together, they create a complete development workflow
- All leverage proven multi-wave parallel agent architecture
- All maintain consistency with existing command patterns
