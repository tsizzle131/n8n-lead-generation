---
description: Build the codebase based on the plan
argument-hint: [path-to-plan]
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
model: claude-sonnet-4-5-20250929
---

# Build

Orchestrate a multi-wave agent workflow to implement the plan at `PATH_TO_PLAN`. Each wave runs agents in parallel for maximum efficiency, with intelligent coordination between phases.

## Variables

PATH_TO_PLAN: $ARGUMENTS

## Workflow

### 0. Context & Organization Check

**Purpose:** Read organization files to understand project context, build priorities, and strategic goals before starting implementation.

#### Step 0.1: Read Organization Files

Attempt to read the following organization files (if they exist):

**Read TODO.md:**
- Look for active build/implementation tasks `[▶]` related to this build
- Check for blockers `[⚠]` that may affect implementation
- Identify related implementation work in progress
- Note build priorities from task ordering
- Check if this build is connected to a research plan

**Read STATUS.md:**
- Check current project phase and readiness for implementation
- Review test coverage baseline before build
- Check recent implementations and patterns used
- Review quality metrics to establish baseline
- Check for any ongoing work that may conflict

**Read ROADMAP.md:**
- Identify current phase (is this build part of phase goals?)
- Understand strategic goals this build supports
- Check if build aligns with current phase priorities
- Review build dependencies or prerequisites
- Note success criteria for implementation work

#### Step 0.2: Extract Context Summary

Compile extracted information into a context summary:

```
Organization Context:
- Current Phase: [from ROADMAP or "Unknown"]
- Build Priority: [High/Medium/Low based on TODO/ROADMAP]
- Active Build Tasks: [list from TODO or "None found"]
- Blockers: [list from TODO or "None"]
- Test Coverage Baseline: [from STATUS or "Unknown"]
- Quality Metrics Baseline: [from STATUS]
- Related Work: [any similar implementations from STATUS]
- Strategic Alignment: [which ROADMAP objective this supports]
- Prerequisites: [any dependencies from ROADMAP]
- Success Criteria: [from ROADMAP phase goals]
```

#### Step 0.3: Apply Context to Build Planning

Use the context summary to inform build execution:
- **If related implementations exist**: Review patterns and approaches used
- **If blockers exist**: Address blockers first or note limitations
- **If phase goals clear**: Ensure build aligns with phase objectives
- **If test coverage low**: Prioritize test coverage during build
- **If prerequisites missing**: Flag missing prerequisites before proceeding
- **If quality baseline known**: Set improvement targets for this build

**Note**: If organization files don't exist, proceed without context (graceful degradation). The build will execute normally but won't have project-wide context.

---

### 0.5. Update Tracking - Build Started

**Purpose:** Mark build as in-progress in organization files and record build plan.

#### Step 0.5.1: Update TODO.md (if exists)

Find and update TODO item:
- If TODO item exists for this build: Change `[ ]` to `[▶]` (mark as in progress)
- If no TODO item exists: Add new item:
  ```markdown
  ## 🔥 In Progress
  - [▶] Build implementation from plan: [plan path] (Started: [timestamp])
    - Plan: [PATH_TO_PLAN]
    - Scope: [brief description from plan]
    - Phase: [current phase from ROADMAP]
    - Estimated: [duration estimate based on plan complexity]
  ```

#### Step 0.5.2: Update STATUS.md (if exists)

Add to current work section:
```markdown
## 🔨 Active Builds
- **Implementation from [plan name]** - In Progress
  - Started: [timestamp]
  - Plan: [PATH_TO_PLAN]
  - Wave: Research & Planning
  - Scope: [brief description]
  - Phase: [current phase from ROADMAP]
  - Strategic Goal: [from ROADMAP context]
```

**Note**: If organization files don't exist, skip this step (graceful degradation).

---

### 1. Validate Plan

- If no `PATH_TO_PLAN` is provided, STOP immediately and ask the user to provide it.
- Read the plan at `PATH_TO_PLAN` and analyze its requirements, scope, and complexity.
- Identify the key components, dependencies, and architectural decisions required.

### 2. Research Wave (Parallel Intelligence Gathering)

Launch multiple general-purpose research agents **IN PARALLEL** (single message with multiple Task calls) to scout the codebase:

**Agent 1 - Pattern Scout**: Search for existing code patterns, similar implementations, and architectural precedents relevant to the plan. Focus on identifying reusable patterns and anti-patterns to avoid.

**Agent 2 - Dependency Mapper**: Identify all relevant files, modules, and dependencies that will be affected. Map out the dependency graph and integration points.

**Agent 3 - API & Interface Explorer**: Catalog existing APIs, interfaces, type definitions, and contracts that need to be maintained or modified.

**Agent 4 - Context Gatherer**: Gather broader architectural context, coding standards, testing patterns, and project conventions from the codebase.

**Critical**: Wait for ALL research agents to complete. Synthesize their findings into a comprehensive understanding of the codebase landscape.

### 3. Planning Wave (Parallel Strategic Planning)

Launch multiple general-purpose planning agents **IN PARALLEL** based on research findings:

**Agent 1 - Architecture Planner**: Design the high-level architecture, component boundaries, and integration strategy. Leverage research findings to ensure consistency with existing patterns.

**Agent 2 - Task Decomposer**: Break down the plan into discrete, parallelizable implementation units. Identify dependencies and optimal build order.

**Agent 3 - Risk Analyzer**: Identify potential risks, edge cases, breaking changes, and migration strategies. Plan for backwards compatibility.

**Agent 4 - Test Strategist**: Design comprehensive test strategy including unit tests, integration tests, and validation approaches.

**Critical**: Wait for ALL planning agents to complete. Consolidate their outputs into a unified, actionable implementation strategy with clear task assignments.

### 4. Building Wave (Parallel Implementation)

Based on the consolidated plan, partition implementation work and launch multiple general-purpose building agents **IN PARALLEL**:

**Important**: Each agent gets a dedicated, independent portion of the work to minimize conflicts. Assign based on:
- Module/component boundaries
- Feature isolation
- Minimal file overlap

**Example partitioning**:
- Agent 1: Core data models and types
- Agent 2: Business logic and services
- Agent 3: API endpoints and controllers
- Agent 4: UI components and views
- Agent 5: Utilities and helpers

**Critical**: Wait for ALL building agents to complete. Verify no merge conflicts or integration issues between parallel work streams.

### 5. Review Wave (Parallel Code Quality Assurance)

Launch multiple code-reviewer agents **IN PARALLEL** to review different aspects:

**Agent 1 - Security Reviewer**: Focus on security vulnerabilities, input validation, authentication, authorization, and data protection.

**Agent 2 - Performance Reviewer**: Analyze performance implications, optimization opportunities, memory usage, and scalability concerns.

**Agent 3 - Architecture Reviewer**: Verify architectural consistency, design patterns, separation of concerns, and maintainability.

**Agent 4 - Standards Reviewer**: Check code style, conventions, documentation, error handling, and best practices.

**Critical**: Wait for ALL review agents to complete. If critical issues are found, launch targeted fixing agents in parallel to address them, then re-review.

### 6. Testing Wave (Parallel Quality Verification)

Launch multiple general-purpose testing agents **IN PARALLEL**:

**Agent 1 - Unit Test Runner**: Execute all unit tests, analyze failures, and verify coverage.

**Agent 2 - Integration Test Runner**: Run integration tests and validate component interactions.

**Agent 3 - Build Verifier**: Execute the full build process and ensure no compilation/transpilation errors.

**Agent 4 - Manual Test Executor**: Perform manual testing scenarios outlined in the plan, validate edge cases.

**Critical**: Wait for ALL testing agents to complete. If tests fail, analyze root causes and launch fixing agents, then re-test.

### 7. Final Review Wave (Parallel Final Verification)

Launch final verification agents **IN PARALLEL**:

**Agent 1 - Regression Checker**: Verify no existing functionality was broken by changes.

**Agent 2 - Documentation Reviewer**: Ensure all new code is properly documented, including inline comments, API docs, and README updates if needed.

**Agent 3 - Completeness Auditor**: Cross-reference the original plan to verify ALL requirements are implemented.

**Critical**: Wait for ALL final review agents to complete. Only proceed to Report phase when all verifications pass.

## Execution Guidelines

**Parallelization**: Always launch agents within each wave in a SINGLE message with multiple Task tool calls. This is critical for performance.

**Context Management**: After each wave completes, synthesize findings into a concise summary to inform the next wave. Avoid context bloat.

**Error Handling**: If any agent reports critical failures, pause the workflow, address issues, and restart from the appropriate wave.

**Adaptive Scaling**: For small plans, reduce the number of agents per wave. For complex plans, increase agent count and specialization.

## Report

Once all waves complete successfully, provide:

1. **Executive Summary**: High-level overview of what was built (2-3 sentences)

2. **Implementation Details**:
   - Key components created/modified
   - Architectural decisions made
   - Any deviations from the original plan and why

3. **Quality Metrics**:
   - Code review findings and resolutions
   - Test coverage and results
   - Build status

4. **Git Statistics**: Run `git diff --stat` and report files changed and total lines modified

5. **Next Steps**: Recommended follow-up actions, if any

## Success Criteria

The build is only complete when:
-  All plan requirements are implemented
-  All code reviews pass with no critical issues
-  All tests pass successfully
-  Build completes without errors
-  Documentation is up to date
-  No regressions detected

---

### 8. Update Organization Files & Summary

**Purpose:** Update TODO.md, STATUS.md, and ROADMAP.md with complete build results and generate integrated summary.

#### Step 8.1: Update TODO.md (if exists)

Mark build task as completed and add follow-up tasks:

```markdown
## ✅ Completed Recently
- [x] Build implementation from plan: [plan path] (Completed: [timestamp])
  - Plan: [PATH_TO_PLAN]
  - Scope: [brief description]
  - Duration: [total time]
  - Status: [✓ SUCCESS / ⚠ SUCCESS WITH ISSUES / ✗ INCOMPLETE]
  - Implementation details:
    * Components created/modified: [count]
    * Files changed: [count from git diff --stat]
    * Tests added: [count]
    * Test coverage: [before]% → [after]%
  - Quality metrics:
    * Code review: [issues found and resolved]
    * Build status: [✓ Success / ⚠ With warnings]
    * Test results: [X passing / Y total]

## 📋 Up Next
[Add new tasks discovered during build:]
- [ ] [Follow-up task 1 from review findings]
- [ ] [Follow-up task 2 from testing]
- [ ] [Address any deferred issues or TODOs]
- [ ] [Integration or deployment tasks if applicable]
```

#### Step 8.2: Update STATUS.md (if exists)

Remove from active builds and add to completed work:

```markdown
## 🔨 Active Builds
[Remove this build entry]

## ✅ Builds Completed
- **Implementation from [plan name]** - Completed [date]
  - Plan: [PATH_TO_PLAN]
  - Duration: [total time]
  - Scope: [brief description of what was built]
  - Implementation metrics:
    * Components created: [count and list key components]
    * Components modified: [count and list key files]
    * Total files changed: [count from git diff --stat]
    * Lines added: [count] | Lines removed: [count]
  - Quality results:
    * Code reviews: [4 waves completed, X issues found, Y resolved]
    * Security review: [✓ Pass / ⚠ Issues found and fixed]
    * Performance review: [✓ Pass / ⚠ Optimizations needed]
    * Architecture review: [✓ Pass / ⚠ Concerns noted]
    * Standards review: [✓ Pass / ⚠ Minor issues]
  - Testing results:
    * Test coverage: [before]% → [after]% ([+/-N%])
    * Unit tests: [X passing / Y total]
    * Integration tests: [X passing / Y total]
    * Build verification: [✓ Success / ✗ Failed]
    * Regression check: [✓ No regressions / ⚠ Issues found]
  - Documentation:
    * Inline comments: [✓ Complete / ⚠ Needs improvement]
    * API documentation: [✓ Updated / ⚠ Needs update]
    * README updates: [✓ Updated / N/A]
  - Status: [✓ All success criteria met / ⚠ Some follow-up needed]
  - Deviations from plan: [list any or "None"]
```

#### Step 8.3: Update ROADMAP.md (if exists)

Check if build completed any phase objectives:

**If build was a phase objective:**
```markdown
### Phase [N]: [Phase Name]
**Progress:** [X/Y] ([old%]) → [(X+1)/Y] ([new%])  ← Updated!
- [x] [Objective that was completed] (Completed: [date])  ← Marked complete!
  - Via: /build [plan path]
  - Implementation: [brief summary]
  - Quality: [review pass rate], [test coverage]%
  - Status: [✓ Success / ⚠ With minor issues]
```

**If build was implementation work (not explicit objective):**
Add to phase notes or implementations section:
```markdown
### Recent Implementations
- [date] Built [component/feature name] (/build command)
  - From plan: [plan path]
  - Supports phase: [current phase]
  - Enables: [features or capabilities unlocked]
  - Quality: [coverage]% tests, [X] reviews passed
```

#### Step 8.4: Generate Integrated Summary Report

Create comprehensive summary that references all three organization files:

```markdown
═══════════════════════════════════════════════════════════
✓ BUILD COMPLETE: [Plan name/description]
═══════════════════════════════════════════════════════════

📊 BUILD SUMMARY:
   • Plan: [PATH_TO_PLAN]
   • Scope: [brief description]
   • Duration: [total time]
   • Overall Status: [✓ SUCCESS / ⚠ SUCCESS WITH ISSUES / ✗ INCOMPLETE]

🏗️ IMPLEMENTATION DETAILS:
   • Components created: [count and key components]
   • Components modified: [count and key files]
   • Architectural decisions: [key decisions made]
   • Patterns used: [design patterns and approaches]
   • Deviations from plan: [any or "None"]

📈 QUALITY METRICS:
   • Code Review Results:
     - Security review: [✓/⚠/✗] ([X issues found, Y resolved])
     - Performance review: [✓/⚠/✗] ([optimizations made])
     - Architecture review: [✓/⚠/✗] ([consistency verified])
     - Standards review: [✓/⚠/✗] ([conventions followed])

   • Testing Results:
     - Unit tests: [X passing / Y total] ([pass rate]%)
     - Integration tests: [X passing / Y total] ([pass rate]%)
     - Test coverage: [before]% → [after]% ([+/-N%])
     - Build verification: [✓ Success / ✗ Failed]
     - Regression check: [✓ Pass / ⚠ Issues]

📁 GIT STATISTICS:
   • Files changed: [count]
   • Lines added: [count]
   • Lines removed: [count]
   • Net change: [+/-N lines]

📁 ORGANIZATION FILES UPDATED:
   • TODO.md: Build marked complete, [N] follow-up tasks added
   • STATUS.md: Build results recorded, quality metrics updated
   • ROADMAP.md: [Phase progress updated / Implementation logged]

🎯 STRATEGIC ALIGNMENT:
   • Current Phase: [from ROADMAP]
   • Phase Progress: [X%] [→ Y%] (if objective completed)
   • Build supports: [strategic goal from ROADMAP]
   • Enables: [features or work unlocked by this build]
   • Success criteria: [✓ Met / ⚠ Partially met]

⚠️ REMAINING WORK (if any):
   [List follow-up tasks and unresolved issues]
   1. [TODO item 1]
   2. [TODO item 2]
   ...

🚀 NEXT STEPS:
   1. [Immediate next action from TODO.md]
   2. [Follow-up task from review findings]
   3. [Strategic next step from ROADMAP]

═══════════════════════════════════════════════════════════
```

**Note**: If organization files don't exist, generate standard build report without organization context.

---

## Execution Start

Begin with **Step 0: Context & Organization Check**, then proceed through each step sequentially.
