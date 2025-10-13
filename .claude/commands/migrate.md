# /migrate - Framework & Dependency Migration Command

## Purpose
Intelligently migrate frameworks, dependencies, and major version upgrades with risk assessment, automated refactoring, and comprehensive validation. Handles complex migrations like framework upgrades (React 17→18, Vue 2→3), language versions (Node 14→20, Python 3.8→3.12), and dependency modernization.

## Usage
```
/migrate <migration-target>
```

**Examples:**
- `/migrate react 18` - Migrate to React 18
- `/migrate node 20` - Upgrade to Node 20
- `/migrate vue3` - Migrate from Vue 2 to Vue 3
- `/migrate typescript 5` - Upgrade TypeScript to v5
- `/migrate package.json` - Analyze and migrate all outdated dependencies

## Allowed Tools
`*` (all tools available)

## Model
Use `high` model for all waves requiring complex reasoning.

---

## Execution Pattern

This command uses a **7-wave parallel agent execution pattern** with iterative validation after each critical wave, plus organization file integration.

---

### Wave 0: Context & Organization Check

**Purpose:** Read organization files to understand project context, migration priorities, and strategic goals before starting migration.

#### Step 0.1: Read Organization Files

Attempt to read the following organization files (if they exist):

**Read TODO.md:**
- Look for active migration tasks `[▶]` related to this migration
- Check for blockers `[⚠]` that may affect migration
- Identify related dependency upgrade tasks
- Note migration priorities from task ordering

**Read STATUS.md:**
- Check current project phase and migration readiness
- Review command availability (is /migrate already tested?)
- Check test coverage baseline before migration
- Review recent migration or upgrade work completed
- Check for any ongoing work that may conflict

**Read ROADMAP.md:**
- Identify current phase (is this migration part of phase goals?)
- Understand strategic goals this migration supports
- Check if migration aligns with current phase priorities
- Review migration dependencies or prerequisites
- Note success criteria for migration work

#### Step 0.2: Extract Context Summary

Compile extracted information into a context summary:

```
Organization Context:
- Current Phase: [from ROADMAP or "Unknown"]
- Migration Priority: [High/Medium/Low based on TODO/ROADMAP]
- Active Migration Tasks: [list from TODO or "None found"]
- Blockers: [list from TODO or "None"]
- Test Coverage Baseline: [from STATUS or "Unknown"]
- Related Migrations: [any similar work from STATUS]
- Strategic Alignment: [which ROADMAP objective this supports]
- Prerequisites: [any dependencies from ROADMAP]
- Success Criteria: [from ROADMAP phase goals]
```

#### Step 0.3: Apply Context to Migration Planning

Use the context summary to inform migration execution:
- **If related migrations exist**: Review approach and lessons learned
- **If blockers exist**: Address blockers first or note limitations
- **If phase goals clear**: Ensure migration aligns with phase objectives
- **If test coverage low**: Prioritize test coverage improvements during migration
- **If prerequisites missing**: Flag missing prerequisites before proceeding

**Note**: If organization files don't exist, proceed without context (graceful degradation). The migration will execute normally but won't have project-wide context.

---

### Wave 0.5: Update Tracking - Migration Started

**Purpose:** Mark migration as in-progress in organization files and record migration plan.

#### Step 0.5.1: Update TODO.md (if exists)

Find and update TODO item:
- If TODO item exists for this migration: Change `[ ]` to `[▶]` (mark as in progress)
- If no TODO item exists: Add new item:
  ```markdown
  ## 🔥 In Progress
  - [▶] Migrate [target] to [new version] (Started: [timestamp])
    - Migration type: [Framework/Language/Dependency]
    - Risk level: [will be assessed in Wave 2]
    - Phase: [current phase from ROADMAP]
    - Estimated: 2-6 hours depending on complexity
  ```

#### Step 0.5.2: Update STATUS.md (if exists)

Add to current work section:
```markdown
## 🔄 Active Migrations
- **[target] → [new version]** - In Progress
  - Started: [timestamp]
  - Migration type: [Framework/Language/Dependency]
  - Phase: Wave 1 - Discovery & Analysis
  - Risk: [TBD after Wave 2]
  - Phase alignment: [from ROADMAP context]
```

**Note**: If organization files don't exist, skip this wave (graceful degradation).

---

### Wave 1: Discovery & Analysis (Parallel Reconnaissance)

**Objective:** Understand current state, dependencies, and migration scope.

Launch 4 agents **IN PARALLEL** (single message with multiple Task calls):

#### Agent 1 - Current State Analyzer
**Task:** Analyze the current dependency state and project configuration.

Search for and analyze:
- **Package manifests**: `package.json`, `requirements.txt`, `Cargo.toml`, `pom.xml`, `Gemfile`, `go.mod`
- **Lock files**: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `poetry.lock`, `Cargo.lock`
- **Configuration files**: `tsconfig.json`, `.babelrc`, `webpack.config.js`, `vite.config.js`
- **Version constraints**: Current versions, version ranges, peer dependencies
- **Build scripts**: `npm scripts`, `Makefile`, CI/CD configurations

Report:
- Current versions of all dependencies
- Dependency tree structure
- Configuration files that may need updates
- Build tools and their versions

#### Agent 2 - Codebase Usage Analyzer
**Task:** Identify how the migration target is used throughout the codebase.

Search for:
- **Import patterns**: How is the target package/framework imported?
- **API usage**: Which APIs, functions, components are being used?
- **Deprecated patterns**: Usage of deprecated APIs or patterns
- **Version-specific features**: Features that may not work in the new version
- **Integration points**: Where the target integrates with other systems

Use grep/glob extensively:
- Search for import statements: `import ... from 'target-package'`
- Search for require statements: `require('target-package')`
- Search for API calls to the target
- Search for configuration of the target

Report:
- List of files using the migration target (with line numbers)
- Specific APIs/patterns being used
- Deprecated API usage count
- Integration complexity estimate (0-100)

#### Agent 3 - Migration Guide Researcher
**Task:** Research official migration guides and breaking changes.

Web search for:
- Official migration guides (e.g., "React 17 to 18 migration guide")
- Breaking changes documentation
- Community migration experiences and gotchas
- Automated migration tools (codemods, CLI tools)
- Known compatibility issues

Report:
- Breaking changes summary
- Recommended migration steps from official docs
- Available automated migration tools
- Common pitfalls and solutions
- Estimated migration complexity (0-100)

#### Agent 4 - Dependency Compatibility Analyzer
**Task:** Analyze compatibility of other dependencies with the migration target.

Search and analyze:
- **Peer dependency constraints**: Check if other packages require specific versions
- **Transitive dependencies**: Identify potential conflicts in the dependency tree
- **Plugin ecosystem**: Check if plugins/extensions are compatible
- **Build tool compatibility**: Verify build tools support the new version

Use package manifest analysis:
- Parse `peerDependencies` sections
- Check for version conflicts
- Identify packages that may need concurrent upgrades

Report:
- List of compatible dependencies
- List of incompatible dependencies (with versions needed)
- Suggested concurrent upgrades
- Risk level for dependency conflicts (0-100)

**Wave 1 Completion:** Wait for all 4 agents to complete. Synthesize findings into a **Current State Report**.

---

### Wave 2: Risk Assessment & Planning (Sequential Analysis)

**Objective:** Evaluate migration risk and create a comprehensive migration plan.

#### Step 2.1: Risk Scoring

Analyze the Wave 1 reports and calculate risk scores:

**Breaking Change Risk (0-100):**
- Count deprecated APIs used in codebase
- Severity of breaking changes from migration guide
- Number of files affected

**Dependency Conflict Risk (0-100):**
- Number of incompatible dependencies
- Severity of peer dependency mismatches
- Availability of compatible versions

**Test Coverage Risk (0-100):**
- Current test coverage percentage (higher coverage = lower risk)
- Number of tests that may break
- Test suite comprehensiveness

**Implementation Complexity (0-100):**
- Codebase size (lines of code affected)
- Number of integration points
- Availability of automated migration tools

**Overall Migration Risk Score:** Average of the above four scores.

**Risk Levels:**
- 0-30: Low Risk (straightforward migration)
- 31-60: Medium Risk (some manual intervention needed)
- 61-85: High Risk (significant refactoring required)
- 86-100: Critical Risk (major breaking changes, consider alternatives)

#### Step 2.2: Create Migration Plan

Based on risk assessment, create a detailed migration plan:

**Phase 1: Preparation**
- [ ] Update all dependencies to latest compatible versions (pre-migration)
- [ ] Run full test suite to establish baseline
- [ ] Create git branch for migration work
- [ ] Back up critical configuration files

**Phase 2: Automated Migration**
- [ ] Run automated migration tools (codemods, CLI tools) if available
- [ ] Update package versions in manifest files
- [ ] Update lock files
- [ ] Update configuration files

**Phase 3: Manual Refactoring**
- [ ] Fix deprecated API usage (list specific files)
- [ ] Update import statements if needed
- [ ] Refactor breaking changes (list specific patterns)
- [ ] Update type definitions if applicable

**Phase 4: Dependency Resolution**
- [ ] Upgrade incompatible dependencies (list packages)
- [ ] Resolve peer dependency conflicts
- [ ] Update transitive dependencies
- [ ] Verify no security vulnerabilities introduced

**Phase 5: Testing & Validation**
- [ ] Fix failing tests
- [ ] Add tests for new patterns
- [ ] Run integration tests
- [ ] Perform smoke testing

**Phase 6: Documentation & Cleanup**
- [ ] Document migration decisions
- [ ] Update README with new requirements
- [ ] Clean up temporary migration artifacts
- [ ] Update CI/CD configurations

**Rollback Plan:**
- Git branch: easy rollback via `git checkout`
- Lock files: saved for exact version restoration
- Configuration backups: for manual restoration
- Database migrations: (if applicable) provide rollback scripts

---

### Wave 2 Validation: Migration Plan Quality Gate

**Validation Criteria (0-100 points):**

1. **Plan Completeness (30 points):**
   - All 6 phases addressed: 30 points
   - Missing phases: -5 points per missing phase

2. **Risk Assessment Detail (25 points):**
   - All 4 risk dimensions scored: 15 points
   - Overall risk score calculated: 10 points

3. **Actionable Steps (25 points):**
   - Each phase has specific, actionable checklist items: 25 points
   - Vague or generic steps: -5 points per phase

4. **Rollback Strategy (20 points):**
   - Clear rollback plan documented: 20 points
   - Partial rollback plan: 10 points
   - No rollback plan: 0 points

**Threshold:** ≥75 points to proceed

**If validation fails (<75 points):**
- **First Retry:** Enhance plan with missing details, break down vague steps
- **Second Retry:** Simplify plan, focus on critical steps only
- **Fallback:** Proceed with reduced scope migration (core changes only)

---

### Wave 3: Pre-Migration Preparation (Parallel Execution)

**Objective:** Prepare the codebase for migration.

Launch 3 agents **IN PARALLEL**:

#### Agent 1 - Baseline Test Runner
**Task:** Run the full test suite and establish a baseline.

Execute:
- Run test command (npm test, pytest, cargo test, etc.)
- Capture test results, passing/failing counts
- Identify flaky tests that might interfere
- Generate test coverage report

Report:
- Total tests: X passing, Y failing
- Current test coverage: Z%
- Failing test details (if any)
- Baseline established for post-migration comparison

#### Agent 2 - Dependency Pre-Updater
**Task:** Update dependencies to latest compatible versions before migration.

Execute:
- Update dependencies that are compatible with both old and new versions
- Update dev dependencies to latest versions
- Run `npm update`, `yarn upgrade`, or equivalent
- Verify no breaking changes from these updates

Report:
- Dependencies updated (list)
- Dependencies skipped (waiting for migration)
- Test suite still passing after updates

#### Agent 3 - Configuration Backup Agent
**Task:** Back up critical configuration files.

Execute:
- Create `.migration-backup/` directory
- Copy all configuration files (package.json, tsconfig.json, webpack.config.js, etc.)
- Copy lock files
- Document current git commit hash

Report:
- Files backed up (list)
- Backup location
- Git commit hash for reference

**Wave 3 Completion:** Wait for all agents. Verify baseline tests are passing and backups are complete.

---

### Wave 4: Migration Implementation (Sequential with Validation)

**Objective:** Execute the migration plan.

#### Step 4.1: Automated Migration Tools

If automated migration tools are available (codemods, CLI tools):
- Run the automated migration tool
- Review and commit changes from automation
- Note any warnings or errors from the tool

Examples:
- React: `npx react-codemod <migration-name>`
- Vue: `vue-cli-service migrate`
- Node: Often manual, but check for LTS upgrade scripts

#### Step 4.2: Update Package Manifests

Update version numbers:
- Main migration target (e.g., react: 17.0.0 → 18.0.0)
- Related packages (e.g., react-dom, @types/react)
- Incompatible dependencies identified in Wave 1
- Peer dependencies as needed

Execute:
- Update package.json (or equivalent)
- Run package manager install (npm install, yarn, pnpm install)
- Regenerate lock file
- Resolve any installation errors

#### Step 4.3: Configuration Updates

Update configuration files based on migration guide:
- TypeScript: `tsconfig.json` (update target, lib, types)
- Build tools: webpack, vite, rollup configs
- Babel: `.babelrc` presets and plugins
- Framework configs: framework-specific configuration files

#### Step 4.4: Code Refactoring

Launch a **refactoring specialist agent**:

**Task:** Refactor code to fix breaking changes and deprecated API usage.

Provide the agent with:
- List of files using deprecated APIs (from Wave 1, Agent 2)
- Breaking changes documentation (from Wave 1, Agent 3)
- Migration guide patterns

Agent should:
- Fix deprecated API usage systematically
- Update import statements if paths changed
- Refactor patterns that are no longer supported
- Update type definitions for TypeScript projects
- Add new required configurations

**Expected Output:**
- All deprecated API usages fixed
- Code compiles without migration-related errors
- Changes follow new version's best practices

#### Step 4.5: Run Tests After Migration

Execute:
- Run full test suite
- Compare results to baseline from Wave 3
- Identify newly failing tests
- Categorize failures (migration-related vs. unrelated)

---

### Wave 4 Validation: Migration Success Quality Gate

**Validation Criteria (0-100 points):**

1. **Installation Success (20 points):**
   - Dependencies install without errors: 20 points
   - Warning messages only: 15 points
   - Errors requiring manual fixes: 0 points

2. **Build/Compilation Success (25 points):**
   - Code compiles/builds without errors: 25 points
   - Type errors only: 15 points
   - Syntax or critical errors: 0 points

3. **Test Suite Status (35 points):**
   - All baseline passing tests still pass: 35 points
   - 90-99% of baseline tests passing: 25 points
   - 80-89% passing: 15 points
   - <80% passing: 0 points

4. **Deprecated API Removal (20 points):**
   - All deprecated API usage removed: 20 points
   - <5 deprecated APIs remaining: 10 points
   - ≥5 deprecated APIs remaining: 0 points

**Threshold:** ≥75 points to proceed

**If validation fails (<75 points):**

- **First Retry (Refined Strategy):**
  - Focus on fixing the lowest-scoring criteria
  - If tests failing: Debug and fix failing tests
  - If build errors: Fix compilation issues
  - If deprecated APIs remain: Refactor remaining usages
  - Re-run validation

- **Second Retry (Fallback Strategy):**
  - Implement minimal viable migration
  - Fix critical breaking changes only
  - Document remaining issues as TODOs
  - Ensure build and critical tests pass
  - Re-run validation with reduced threshold (≥60 points)

- **If still failing:**
  - Flag migration as requiring manual intervention
  - Provide detailed report of blockers
  - Suggest rollback and alternative approaches

---

### Wave 5: Post-Migration Validation (Parallel Testing)

**Objective:** Comprehensive testing and validation of the migrated codebase.

Launch 3 agents **IN PARALLEL**:

#### Agent 1 - Test Coverage Analyzer
**Task:** Verify test coverage is maintained or improved.

Execute:
- Generate test coverage report
- Compare to baseline coverage from Wave 3
- Identify uncovered code introduced by migration
- Run test suite multiple times to check for flaky tests

Report:
- Coverage percentage: before vs. after migration
- Coverage delta: +/- X%
- Newly uncovered code (if any)
- Flaky tests detected (if any)

#### Agent 2 - Integration Test Runner
**Task:** Run integration and end-to-end tests.

Execute:
- Run integration test suite (if separate from unit tests)
- Run end-to-end tests (Cypress, Playwright, Selenium, etc.)
- Test critical user flows
- Verify external integrations still work

Report:
- Integration tests: X passing, Y failing
- E2E tests: X passing, Y failing
- Critical flows status: ✓ or ✗
- Any new integration issues

#### Agent 3 - Static Analysis & Linting
**Task:** Run static analysis tools to catch potential issues.

Execute:
- Run linter (ESLint, Pylint, Clippy, etc.)
- Run type checker (TypeScript, mypy, etc.)
- Run security audits (npm audit, safety, etc.)
- Check for code smells with complexity analysis

Report:
- Lint errors: X errors, Y warnings
- Type errors: X errors
- Security vulnerabilities: X critical, Y high, Z medium
- Code quality metrics vs. baseline

**Wave 5 Completion:** Synthesize all validation results into a **Migration Validation Report**.

---

### Wave 5 Validation: Post-Migration Quality Gate

**Validation Criteria (0-100 points):**

1. **Test Coverage (25 points):**
   - Coverage maintained or improved (≥0% delta): 25 points
   - Coverage decreased 1-5%: 15 points
   - Coverage decreased >5%: 0 points

2. **Integration Tests (25 points):**
   - All integration tests passing: 25 points
   - 90-99% passing: 15 points
   - <90% passing: 0 points

3. **Static Analysis (25 points):**
   - No new lint/type errors: 25 points
   - <5 new errors: 15 points
   - ≥5 new errors: 0 points

4. **Security Status (25 points):**
   - No new security vulnerabilities: 25 points
   - New low/medium vulnerabilities only: 15 points
   - New high/critical vulnerabilities: 0 points

**Threshold:** ≥75 points to proceed

**If validation fails (<75 points):**
- **First Retry:** Fix issues in lowest-scoring categories
- **Second Retry:** Accept some issues but document them as follow-up tasks
- **Fallback:** Proceed with documented caveats and required follow-up work

---

### Wave 6: Documentation & Reporting (Parallel Documentation)

**Objective:** Document the migration and provide a comprehensive report.

Launch 2 agents **IN PARALLEL**:

#### Agent 1 - Migration Documentation Writer
**Task:** Create comprehensive migration documentation.

Create/update documentation:
- **MIGRATION.md**: Document migration decisions, breaking changes handled, remaining issues
- **README.md**: Update with new version requirements, setup instructions
- **CHANGELOG.md**: Add migration entry with version changes
- **package.json**: Update `engines` field with new requirements

Document:
- What was migrated (versions before → after)
- Key breaking changes and how they were handled
- Remaining deprecated usage (if any)
- New features now available
- Developer setup steps for new version
- Troubleshooting guide for common issues

#### Agent 2 - Migration Report Generator
**Task:** Generate a comprehensive migration report.

Create a detailed report including:

**Executive Summary:**
- Migration target: [package] [old version] → [new version]
- Overall risk level: [Low/Medium/High/Critical]
- Migration status: [Success/Success with caveats/Requires manual work]
- Time taken: [estimated hours]

**Technical Details:**
- Dependencies updated: [list]
- Files modified: [count and key files]
- Breaking changes addressed: [count and summary]
- Test results: before [X passing] → after [Y passing]
- Coverage: before [X%] → after [Y%]

**Validation Results:**
- Wave 2 (Plan Quality): [score]/100
- Wave 4 (Migration Success): [score]/100
- Wave 5 (Post-Migration Quality): [score]/100
- Overall quality score: [average]/100

**Remaining Work:**
- [ ] TODOs introduced during migration
- [ ] Deprecated APIs to remove in future
- [ ] Follow-up optimizations
- [ ] Documentation improvements

**Rollback Information:**
- Backup location: `.migration-backup/`
- Git commit before migration: [hash]
- Rollback command: `git checkout [hash]`

**Recommendations:**
- Suggested next steps
- Performance optimization opportunities
- Security improvements to consider
- Technical debt items

---

## Retry Strategy Framework

### Initial Execution (Expected Success Rate: 75-85%)
- Full automated migration with all available tools
- Comprehensive refactoring of all deprecated usage
- Strict validation thresholds (≥75 points)

### Refined Strategy (Expected Success Rate: 90%)
- Focus on critical breaking changes first
- Incremental migration approach (if applicable)
- Targeted fixes for validation failures
- May involve breaking migration into smaller steps

### Fallback Strategy (Expected Success Rate: 95%)
- Minimal viable migration (core changes only)
- Document remaining issues as TODOs
- Relaxed validation thresholds (≥60 points)
- Ensure build succeeds and critical tests pass
- Provide clear follow-up task list

### Graceful Degradation
If all retries fail:
- Provide detailed analysis of blockers
- Recommend rollback and alternative approaches
- Suggest breaking migration into multiple phases
- Offer to research alternative migration paths

---

## Expected Outputs

1. **Current State Report** (after Wave 1)
2. **Migration Plan with Risk Assessment** (after Wave 2)
3. **Migration Validation Report** (after Wave 5)
4. **MIGRATION.md** documentation file
5. **Final Migration Report** (after Wave 6)

---

## Success Criteria

A migration is considered successful when:
- ✅ All validation quality gates pass (≥75 points each)
- ✅ Build/compilation succeeds without errors
- ✅ Test coverage maintained or improved
- ✅ All critical tests passing
- ✅ No new high/critical security vulnerabilities
- ✅ Documentation updated
- ✅ Rollback plan documented

---

## Common Migration Scenarios

### React 17 → 18
- Breaking: Automatic batching, new root API, Suspense changes
- Tools: React 18 codemods
- Risk: Medium (significant API changes)

### Vue 2 → 3
- Breaking: Complete rewrite, Composition API, breaking changes in many APIs
- Tools: `@vue/compat`, official migration build
- Risk: High (major architectural changes)

### Node 14 → 20
- Breaking: OpenSSL 3.0, V8 updates, deprecated APIs removed
- Tools: Mostly manual, check deprecation warnings
- Risk: Medium (mostly compatibility issues)

### TypeScript 4 → 5
- Breaking: Stricter type checking, decorator changes
- Tools: TSConfig updates, compiler flags
- Risk: Low-Medium (mostly type errors)

### Angular 14 → 17
- Breaking: Standalone components, signals, control flow
- Tools: `ng update` CLI tool
- Risk: Medium-High (significant framework changes)

---

## Best Practices

1. **Always create a new branch** before starting migration
2. **Run baseline tests first** to establish known state
3. **Commit frequently** during migration (atomic commits per change type)
4. **Test incrementally** after each major change
5. **Read the official migration guide** thoroughly
6. **Check for codemods/automated tools** before manual refactoring
7. **Update dependencies** to compatible versions first
8. **Document decisions** and remaining work
9. **Plan for rollback** before starting
10. **Test on staging environment** before production deployment

---

## Troubleshooting

**Issue: Dependency conflicts during installation**
- Solution: Check peer dependency requirements, may need to upgrade multiple packages together
- Try: `npm install --legacy-peer-deps` or `yarn install --ignore-engines` temporarily

**Issue: Type errors after TypeScript migration**
- Solution: Update @types/* packages, adjust tsconfig.json, fix incompatible types
- May need: Stricter type definitions or use of `any` temporarily with TODOs

**Issue: Tests failing after migration**
- Solution: Update test utilities, fix breaking changes in test framework, update mocks
- Check: Test framework version compatibility with new dependencies

**Issue: Build performance degraded**
- Solution: Check for new optimization options in build tool, update build tool version
- Review: Build configuration for deprecated options

**Issue: Runtime errors in development but not caught by tests**
- Solution: Improve integration test coverage, add E2E tests for critical flows
- Check: Environment-specific configurations and feature flags

---

## Wave 7: Update Organization Files & Summary

**Purpose:** Update TODO.md, STATUS.md, and ROADMAP.md with complete migration results and generate integrated summary.

### Step 7.1: Update TODO.md (if exists)

Mark migration task as completed and add follow-up tasks:

```markdown
## ✅ Completed Recently
- [x] Migrate [target] to [new version] (Completed: [timestamp])
  - Migration type: [Framework/Language/Dependency]
  - Risk level: [Low/Medium/High/Critical]
  - Duration: [total time]
  - Status: [✓ SUCCESS / ⚠ SUCCESS WITH CAVEATS / ✗ REQUIRES MANUAL WORK]
  - Validation scores:
    * Wave 2 (Plan): [score]/100
    * Wave 4 (Migration): [score]/100
    * Wave 5 (Validation): [score]/100
  - Files modified: [count]
  - Test results: [X passing] → [Y passing]
  - Documentation: MIGRATION.md created

## 📋 Up Next
[Add new tasks discovered during migration:]
- [ ] [Follow-up task 1 from remaining work]
- [ ] [Follow-up task 2]
- [ ] [Address any caveats or TODOs from migration]
```

### Step 7.2: Update STATUS.md (if exists)

Remove from active migrations and add to completed work:

```markdown
## 🔄 Active Migrations
[Remove this migration entry]

## ✅ Migrations Completed
- **[target] [old version] → [new version]** - Completed [date]
  - Migration type: [Framework/Language/Dependency]
  - Duration: [total time]
  - Risk level: [Low/Medium/High/Critical]
  - Validation scores:
    * Migration Plan Quality (Wave 2): [score]/100
    * Migration Success (Wave 4): [score]/100
    * Post-Migration Quality (Wave 5): [score]/100
    * Average: [average score]/100
  - Changes:
    * Dependencies updated: [count]
    * Files modified: [count]
    * Breaking changes addressed: [count]
    * Deprecated APIs removed: [count]
  - Test results:
    * Before: [X] passing, [Y]% coverage
    * After: [A] passing, [B]% coverage
    * Delta: [+/-N] tests, [+/-N%] coverage
  - Quality metrics:
    * Lint errors: [before] → [after]
    * Type errors: [before] → [after]
    * Security vulnerabilities: [before] → [after]
  - Status: [✓ All objectives met / ⚠ Some follow-up work needed]
  - Documentation: MIGRATION.md, README.md updated
  - Rollback: Available via `.migration-backup/`
```

### Step 7.3: Update ROADMAP.md (if exists)

Check if migration completed any phase objectives:

**If migration was a phase objective:**
```markdown
### Phase [N]: [Phase Name]
**Progress:** [X/Y] ([old%]) → [(X+1)/Y] ([new%])  ← Updated!
- [x] Migrate [target] to [new version] (Completed: [date])  ← Marked complete!
  - Via: /migrate [target] [version]
  - Risk: [Low/Medium/High/Critical]
  - Results: [brief summary]
  - Validation: [average score]/100
  - Status: [✓ Success / ⚠ Success with caveats]
```

**If migration was infrastructure work (not explicit objective):**
Add to phase notes or infrastructure improvements section:
```markdown
### Infrastructure Improvements
- [date] Migrated [target] [old] → [new] (/migrate command)
  - Modernizes dependency stack for [current phase]
  - Enables: [features or improvements unlocked]
  - Quality score: [average]/100
```

### Step 7.4: Generate Integrated Summary Report

Create comprehensive summary that references all three organization files:

```markdown
═══════════════════════════════════════════════════════════
✓ MIGRATION COMPLETE: [target] [old version] → [new version]
═══════════════════════════════════════════════════════════

📊 MIGRATION SUMMARY:
   • Migration Type: [Framework/Language/Dependency]
   • Risk Level: [Low/Medium/High/Critical]
   • Duration: [total time]
   • Validation Attempts: [total retry count across waves]
   • Overall Status: [✓ SUCCESS / ⚠ SUCCESS WITH CAVEATS / ✗ REQUIRES MANUAL WORK]

🎯 RISK ASSESSMENT (Wave 2):
   • Breaking Change Risk: [score]/100
   • Dependency Conflict Risk: [score]/100
   • Test Coverage Risk: [score]/100
   • Implementation Complexity: [score]/100
   • Overall Migration Risk: [average]/100 ([risk level])

🔨 MIGRATION EXECUTION (Wave 4):
   • Dependencies updated: [count] packages
   • Files modified: [count] files
   • Breaking changes addressed: [count] changes
   • Deprecated APIs removed: [count] usages
   • Automated tools used: [list or "Manual migration"]
   • Configuration files updated: [count] files

✅ VALIDATION RESULTS:
   • Wave 2 - Plan Quality: [score]/100 [✓/⚠/✗]
   • Wave 4 - Migration Success: [score]/100 [✓/⚠/✗]
   • Wave 5 - Post-Migration Quality: [score]/100 [✓/⚠/✗]
   • Average Quality Score: [average]/100

📈 TEST RESULTS:
   • Before Migration:
     - Tests: [X] passing, [Y] failing
     - Coverage: [Z%]
   • After Migration:
     - Tests: [A] passing, [B] failing
     - Coverage: [C%]
   • Delta: [+/-N] tests ([+/-N%] coverage)

🔍 QUALITY METRICS:
   • Lint Errors: [before] → [after] ([change])
   • Type Errors: [before] → [after] ([change])
   • Security Vulnerabilities: [before] → [after] ([change])
   • Integration Tests: [X/Y] passing

📁 ORGANIZATION FILES UPDATED:
   • TODO.md: Migration marked complete, [N] follow-up tasks added
   • STATUS.md: Migration results recorded, quality metrics updated
   • ROADMAP.md: [Phase progress updated / Infrastructure improvement noted]

🎯 STRATEGIC ALIGNMENT:
   • Current Phase: [from ROADMAP]
   • Phase Progress: [X%] [→ Y%] (if objective completed)
   • Migration supports: [strategic goal from ROADMAP]
   • Enables: [features or work unlocked by migration]

📚 DOCUMENTATION CREATED:
   • MIGRATION.md: Complete migration documentation
   • README.md: Updated version requirements
   • CHANGELOG.md: Migration entry added
   • Backup: .migration-backup/ (rollback available)

⚠️ REMAINING WORK (if any):
   [List follow-up tasks from Wave 6 report]
   1. [TODO item 1]
   2. [TODO item 2]
   ...

🔄 ROLLBACK INFORMATION:
   • Backup location: .migration-backup/
   • Git commit before migration: [hash]
   • Rollback command: git checkout [hash]
   • Configuration backups: [list]

🚀 NEXT STEPS:
   1. [Immediate next action from TODO.md]
   2. [Follow-up task from remaining work]
   3. [Strategic next step from ROADMAP]

═══════════════════════════════════════════════════════════
```

**Note**: If organization files don't exist, generate standard migration report without organization context.

---

## Execution Start

Begin with **Wave 0: Context & Organization Check**, then proceed to Wave 1.
