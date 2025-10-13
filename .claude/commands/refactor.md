---
description: Intelligently refactor code to improve quality and maintainability
argument-hint: [target-path]
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
model: claude-sonnet-4-5-20250929
---

# Refactor

Orchestrate a sophisticated multi-wave agent workflow to systematically improve code quality through intelligent refactoring. This command detects code smells, plans safe refactorings, executes behavior-preserving transformations, and validates that no functionality is broken.

## Variables

TARGET_PATH: $ARGUMENTS (defaults to current directory if not provided)

## Workflow

### 1. Validation & Initialization

**Purpose**: Validate inputs, assess codebase size, and verify test coverage before proceeding.

**Steps**:
1. If `TARGET_PATH` is empty, use current working directory (`.`)
2. Verify target path exists and is readable
3. If path doesn't exist or lacks permissions:
   - Display clear error: "Path '[path]' not found or unreadable. Please verify the path."
   - STOP immediately
4. Estimate project size (file count, LOC) using `find` and `wc`
5. If project is extremely large (>100K LOC):
   - Warn user: "Large project detected (~NLOC). Refactoring may take 30-40 minutes. Consider targeting specific subdirectories."
   - Suggest: "Example: /refactor src/services"
6. Check for test infrastructure:
   - Search for test files (*.test.*, *.spec.*, test_*.py, *_test.go)
   - Search for test configuration (jest.config.*, pytest.ini, go.mod test packages)
   - Count test files found
   - If no tests found:
     - Warn: "⚠ No test files detected. Refactoring without tests is risky."
     - Suggest: "Consider running /testgen first to create tests, or proceed with caution."
     - Ask user: "Continue without test coverage? (y/n)"
     - If user declines, STOP immediately
7. Display refactoring scope: "Analyzing [N] files in [path]. Test files found: [M]. Estimated time: [X] minutes."

---

### 2. Code Smell Detection Wave (Parallel Reconnaissance)

**Purpose**: Systematically detect code smells across multiple dimensions to identify refactoring opportunities.

Launch 4 agents **IN PARALLEL** (single message with multiple Task calls):

**Agent 1 - Size & Complexity Analyzer**

Focus on detecting overly large and complex code structures:

- **God Classes**: Search for classes/modules with excessive lines of code
  - Glob patterns: all source files by language
  - Use Bash: `wc -l` to count lines per file
  - Look for: files >500 lines (high priority), >300 lines (medium priority)
  - Identify: Classes with too many responsibilities, low cohesion

- **Long Methods**: Search for functions/methods with too many lines
  - Use Grep with context to find function definitions
  - Patterns: `function `, `def `, `func `, `public `, `private `, method signatures
  - Count lines between function start and end
  - Look for: methods >50 lines (high priority), >30 lines (medium priority)

- **Deep Nesting**: Search for excessive conditional nesting
  - Grep patterns: count consecutive indentation levels
  - Look for: nesting depth >4 levels (high priority), >3 levels (medium priority)
  - Identify: Arrow anti-pattern, callback hell, nested if-else chains

- **High Cyclomatic Complexity**: Search for functions with many decision points
  - Count: if/else, switch/case, for/while loops, ternary operators, && and || operators
  - Look for: functions with >10 decision points (high priority), >7 (medium)
  - Identify: Functions doing too many things

Output: List of size/complexity code smells with:
- Type (God class, long method, deep nesting, high complexity)
- File path and line number
- Metrics (LOC, nesting depth, cyclomatic complexity)
- Severity (HIGH/MEDIUM/LOW)
- Suggested refactoring pattern (Extract Method, Extract Class, Simplify Conditional)

**Agent 2 - Duplication Detective**

Focus on detecting code duplication and copy-paste violations:

- **Exact Duplicates**: Search for identical code blocks
  - Strategy: Extract functions/methods into temporary files, compute checksums
  - Look for: 10+ identical lines across files
  - Identify: Copy-paste code, missing abstractions

- **Near Duplicates**: Search for similar code with minor variations
  - Strategy: Pattern matching for similar function signatures and structure
  - Grep patterns: function names with similar prefixes/suffixes (e.g., `getUserById`, `getProductById`, `getOrderById`)
  - Look for: Functions with 80%+ similarity
  - Identify: Template method opportunities, missing base classes/functions

- **Magic Number Duplication**: Search for repeated numeric/string literals
  - Grep patterns: numeric literals (excluding 0, 1, -1), string literals in quotes
  - Look for: same number/string appearing 3+ times across files
  - Identify: Missing named constants, configuration drift

- **Duplicate Logic**: Search for repeated conditional patterns
  - Look for: identical if-else chains, switch statements with same cases
  - Identify: Missing polymorphism, strategy pattern opportunities

Output: List of duplication code smells with:
- Type (exact duplicate, near duplicate, magic number, duplicate logic)
- File paths and line numbers for all occurrences
- Similarity percentage (for near duplicates)
- Number of occurrences
- Code snippet showing duplication
- Suggested refactoring pattern (Extract Function, Extract Constant, Template Method, Strategy Pattern)

**Agent 3 - Conditional Complexity Scanner**

Focus on detecting overly complex conditional logic:

- **Long If-Else Chains**: Search for excessive if-else statements
  - Grep patterns: consecutive `if`, `else if`, `elif`, `elsif`
  - Look for: chains with 5+ branches (high priority), 3-4 branches (medium)
  - Identify: Missing polymorphism, strategy pattern, lookup tables

- **Complex Boolean Expressions**: Search for hard-to-read boolean logic
  - Grep patterns: multiple `&&` and `||` operators in single expression
  - Look for: expressions with 4+ boolean operators
  - Identify: Missing guard clauses, explain variable opportunities

- **Switch Statement Sprawl**: Search for large switch/case statements
  - Grep patterns: `switch`, `case`, `match`
  - Count: number of cases in each switch
  - Look for: switches with 7+ cases (high priority), 5-6 cases (medium)
  - Identify: Polymorphism opportunities, command pattern

- **Nested Ternaries**: Search for nested ternary operators
  - Grep patterns: `?` and `:` on same line or nested
  - Look for: any nested ternaries (all high priority)
  - Identify: Convert to if-else or extract function

- **Absence of Guard Clauses**: Search for deep nesting that could use guard clauses
  - Look for: single large if block containing entire function body
  - Identify: Invert conditions, early return opportunities

Output: List of conditional complexity smells with:
- Type (long if-else, complex boolean, large switch, nested ternary, missing guard)
- File path and line number
- Complexity metrics (branch count, boolean operator count, nesting depth)
- Code snippet showing complexity
- Suggested refactoring pattern (Replace Conditional with Polymorphism, Decompose Conditional, Introduce Guard Clause, Replace Nested Conditional with Guard Clauses)

**Agent 4 - Naming & Clarity Auditor**

Focus on detecting poor naming and code clarity issues:

- **Poor Variable Names**: Search for unclear, cryptic, or misleading names
  - Grep patterns: single-letter variables (excluding loop counters i, j, k), abbreviations, Hungarian notation
  - Look for: `tmp`, `temp`, `data`, `obj`, `val`, `x`, `y`, single letters, numbers in names (`data1`, `data2`)
  - Identify: Non-descriptive names that don't reveal intent

- **Poor Function Names**: Search for vague or incorrect function names
  - Look for: generic verbs (`process`, `handle`, `manage`, `doStuff`), names not matching behavior
  - Grep patterns: `function do`, `def handle`, `func process`
  - Identify: Functions that don't clearly describe what they do

- **Magic Numbers**: Search for unexplained numeric literals
  - Grep patterns: numeric literals (excluding common: 0, 1, -1, 2, 10, 100)
  - Look for: array indices, timeouts, thresholds, status codes without context
  - Identify: Missing named constants with semantic meaning

- **Magic Strings**: Search for unexplained string literals
  - Grep patterns: string literals in comparisons, assignments, conditionals
  - Look for: repeated strings, status values, type names, configuration values
  - Identify: Missing enums or named constants

- **Dead Code**: Search for unused or unreachable code
  - Look for: code after `return` statements, unused functions (if linter available)
  - Grep patterns: `return.*\n.*[^\s]` (code after return), commented-out code blocks
  - Use Bash: language-specific tools (eslint, pylint, go vet) if available
  - Identify: Code that can be safely deleted

- **Commented-Out Code**: Search for large blocks of commented code
  - Grep patterns: `//.*`, `#.*`, `/* */` blocks spanning multiple lines
  - Look for: 5+ consecutive commented lines of code
  - Identify: Code that should be deleted (rely on version control)

Output: List of naming/clarity code smells with:
- Type (poor variable name, poor function name, magic number, magic string, dead code, commented code)
- File path and line number
- Current name/value
- Suggested improvement
- Severity (HIGH for magic numbers/strings in critical logic, MEDIUM for poor names, LOW for commented code)
- Suggested refactoring pattern (Rename Variable, Rename Method, Extract Constant, Remove Dead Code)

**Critical**: Wait for ALL 4 agents to complete before proceeding. Consolidate all code smell findings (potentially 100-300+ findings) into a unified list with severity ratings. Remove obvious duplicates. Categorize by type and prioritize by impact and risk.

---

### 3. Refactoring Strategy Wave (Parallel Planning)

**Purpose**: Analyze detected code smells, prioritize refactoring opportunities, and create a safe execution plan.

Launch 3 agents **IN PARALLEL** (single message with multiple Task calls):

**Agent 1 - Test Coverage Analyzer**

Identify existing test coverage to assess refactoring safety:

- **Test File Mapping**: Map test files to source files
  - Search for test files by naming convention
  - Parse test imports/requires to identify tested modules
  - Build coverage map: which source files have tests, which don't
  - Estimate coverage percentage (files with tests / total files)

- **Test Type Classification**: Identify what kinds of tests exist
  - Unit tests: test individual functions/methods
  - Integration tests: test component interactions
  - End-to-end tests: test full user workflows
  - Count by type

- **Test Quality Assessment**: Evaluate test thoroughness
  - Count: number of test cases per file
  - Look for: assertion statements, mocking, edge case coverage
  - Identify: well-tested vs. poorly-tested areas

- **Test Execution Capability**: Verify tests can be run
  - Check for test runner configuration
  - Identify test commands (npm test, pytest, go test, etc.)
  - Verify: can tests be executed as pre/post-refactor validation?

Output: Test coverage report with:
- Coverage percentage by file
- Files with good coverage (safe to refactor)
- Files with poor/no coverage (risky to refactor)
- Test execution commands
- Risk assessment for refactoring

**Agent 2 - Priority Ranker & Impact Analyzer**

Prioritize code smells by impact and effort:

- **Impact Scoring**: Calculate benefit of fixing each smell
  - Maintainability impact: How much easier will code be to understand? (1-10)
  - Bug risk reduction: How likely is current code to cause bugs? (1-10)
  - Performance impact: Will refactoring improve performance? (0-5)
  - Developer velocity: Will refactoring speed up future development? (1-10)
  - Total impact = sum of scores

- **Effort Estimation**: Calculate cost of refactoring
  - Lines of code affected (1 point per 10 LOC)
  - Number of files affected (5 points per file)
  - Test coverage (0 points if good coverage, 10 points if none)
  - Breaking change risk (0 if internal, 20 if public API)
  - Total effort score

- **Risk Assessment**: Evaluate refactoring risk
  - Test coverage: LOW risk if >80% coverage, MEDIUM if 30-80%, HIGH if <30%
  - Public API impact: HIGH risk if public, LOW if internal
  - Dependency count: HIGH risk if many dependents
  - Code stability: HIGH risk if frequently changing
  - Overall risk: highest individual risk factor

- **Priority Calculation**: Combine impact, effort, and risk
  - Formula: Priority Score = (Impact / Effort) * Risk Multiplier
  - Risk multipliers: LOW=1.0, MEDIUM=0.5, HIGH=0.25
  - Rank all smells by priority score (highest first)

- **Refactoring Waves**: Group smells into sequential refactoring waves
  - Wave 1: High priority, low risk, well-tested (safe quick wins)
  - Wave 2: High priority, medium risk (requires careful testing)
  - Wave 3: Medium priority, low risk (nice-to-haves if time permits)
  - Defer: Low priority, high risk, or requires architecture changes

Output: Prioritized refactoring plan with:
- All code smells ranked by priority score
- Impact/effort/risk breakdown for each
- Recommended refactoring waves (which smells to fix in which order)
- Estimated time per wave
- Deferred items requiring architecture discussion

**Agent 3 - Refactoring Pattern Selector**

Map each code smell to specific refactoring patterns:

- **Size & Complexity Refactorings**:
  - God Class → Extract Class, Extract Module, Split Responsibilities
  - Long Method → Extract Method, Extract Function, Decompose Conditional
  - Deep Nesting → Replace Nested Conditional with Guard Clauses, Decompose Conditional
  - High Cyclomatic Complexity → Extract Method, Replace Conditional with Polymorphism

- **Duplication Refactorings**:
  - Exact Duplicates → Extract Function, Extract Method
  - Near Duplicates → Form Template Method, Pull Up Method, Extract Superclass
  - Magic Number Duplication → Replace Magic Number with Symbolic Constant
  - Duplicate Logic → Replace Conditional with Polymorphism, Introduce Strategy Pattern

- **Conditional Complexity Refactorings**:
  - Long If-Else Chains → Replace Conditional with Polymorphism, Replace with Lookup Table
  - Complex Boolean Expressions → Decompose Conditional, Introduce Explaining Variable
  - Switch Statement Sprawl → Replace Conditional with Polymorphism, Introduce Command Pattern
  - Nested Ternaries → Replace Ternary with If-Else, Extract Method
  - Missing Guard Clauses → Replace Nested Conditional with Guard Clauses

- **Naming & Clarity Refactorings**:
  - Poor Variable/Function Names → Rename Variable, Rename Method
  - Magic Numbers/Strings → Extract Constant, Introduce Named Constant
  - Dead Code → Remove Dead Code, Delete Unused Code
  - Commented-Out Code → Remove Dead Code

- **Refactoring Steps**: For each pattern, define concrete steps
  - Example: Extract Method
    1. Identify code block to extract
    2. Check for local variables used in block
    3. Create new method with descriptive name
    4. Pass necessary variables as parameters
    5. Return necessary values
    6. Replace original block with method call
    7. Run tests to verify behavior unchanged

Output: Refactoring pattern map with:
- Each code smell mapped to 1-3 applicable patterns
- Step-by-step instructions for applying each pattern
- Expected outcome and verification criteria
- Dependencies between refactorings (some must be done before others)

**Critical**: Wait for ALL 3 agents to complete. Synthesize findings into a comprehensive refactoring strategy document that includes:
- Test coverage assessment and risk areas
- Prioritized list of refactorings to perform
- Specific patterns to apply for each smell
- Execution order (waves, dependencies)
- Success criteria and rollback plan

---

### 4. Safe Refactoring Execution Wave (Parallel Transformation)

**Purpose**: Execute high-priority refactorings while maintaining functionality and validating no regressions.

**Pre-Refactoring Validation**:
1. Run existing test suite to establish baseline
   - Identify test command from Strategy Wave (npm test, pytest, go test, etc.)
   - Execute: `[test_command]` and capture output
   - If tests fail pre-refactor:
     - STOP immediately
     - Display: "❌ Existing tests are failing. Fix tests before refactoring."
     - List failing tests
     - Exit refactoring workflow
   - If no test command found:
     - Warn: "⚠ Cannot run automated tests. Manual verification required after each refactoring."
     - Proceed with caution
   - If tests pass:
     - Display: "✓ Baseline established: [N] tests passing"
     - Record test count and timing
     - Proceed to refactoring

2. Create backup/checkpoint
   - Use Git if available: `git stash push -m "Pre-refactor checkpoint"`
   - Record current git hash for rollback
   - Display: "✓ Checkpoint created"

**Parallel Refactoring Execution**:

Based on Strategy Wave output, launch parallel refactoring agents for Wave 1 (high priority, low risk) items:

**Important**: Partition refactorings to minimize file conflicts. Assign non-overlapping file sets to each agent.

Launch 3-5 agents **IN PARALLEL** (single message with multiple Task calls):

**Agent Templates** (customize based on specific smells detected):

**Agent N - [Refactoring Type] Executor**

For each assigned code smell:

1. **Read Context**: Use Read tool to fetch full file content and understand context
   - Read target file completely
   - Identify function/class boundaries
   - Check dependencies and imports
   - Note any edge cases or special handling

2. **Apply Refactoring Pattern**: Execute specific transformation
   - Follow pattern steps from Strategy Wave
   - Use Edit tool for targeted changes (preferred) or Write for large rewrites
   - Maintain exact behavior (no functionality changes)
   - Preserve error handling and edge cases
   - Update comments and documentation

3. **Verify Syntax**: Ensure code is syntactically valid
   - Language-specific: run linter or syntax checker if available
   - JavaScript/TypeScript: `npx eslint [file]` or `tsc --noEmit`
   - Python: `python -m py_compile [file]`
   - Go: `go build [file]`
   - If syntax errors: fix immediately, don't proceed

4. **Update Related Tests**: Modify tests if refactoring changes interfaces
   - If function signature changed: update test calls
   - If class extracted: update test imports
   - If constant introduced: use constant in tests
   - Maintain test coverage

5. **Document Changes**: Add comments explaining non-obvious refactorings
   - Brief comment if code structure significantly changed
   - JSDoc/docstring updates if function signatures changed

**Example Agent Assignments**:

**Agent 1 - Extract Method Executor**: Focus on breaking down long methods in files A, B, C
**Agent 2 - Magic Number Replacer**: Focus on replacing magic numbers with constants in files D, E, F
**Agent 3 - Rename Clarity Improver**: Focus on renaming poorly-named variables/functions in files G, H, I
**Agent 4 - Duplicate Code Eliminator**: Focus on extracting duplicate code in files J, K, L
**Agent 5 - Conditional Simplifier**: Focus on simplifying complex conditionals in files M, N, O

**Critical**: Wait for ALL refactoring agents to complete before proceeding to validation.

**Post-Refactoring Validation**:

1. Run test suite again to verify no regressions
   - Execute: `[test_command]` and capture output
   - Compare results to pre-refactor baseline
   - If same tests pass: ✓ Success, no regressions
   - If new test failures:
     - Display: "❌ Refactoring introduced regressions: [N] new test failures"
     - List newly failing tests
     - Analyze which refactorings likely caused failures
     - Options:
       a) Rollback: restore from checkpoint, report issue, STOP
       b) Fix: attempt to fix failing tests (if obvious issue)
       c) Investigate: launch debug agent to analyze root cause
     - Default: Rollback if >3 failures or critical tests fail

2. Check build process (if applicable)
   - Execute build command (npm run build, make, go build, etc.)
   - If build fails:
     - Display: "❌ Build broken by refactoring"
     - Show build errors
     - Rollback to checkpoint
   - If build succeeds:
     - Display: "✓ Build successful"

3. Verify code compiles/runs (quick sanity check)
   - Language-specific validation
   - JavaScript/TypeScript: run linter, type checker
   - Python: syntax check all modified files
   - Go: go build/go vet
   - If errors: rollback

4. Generate before/after comparison
   - Use Bash: `git diff --stat` to show file changes
   - Show lines added/removed per file
   - Summarize: "Refactored [N] files, +[X] lines, -[Y] lines"

Output: Refactoring execution report with:
- List of all refactorings applied
- Files modified
- Test results (pass/fail)
- Build status
- Before/after comparison
- Any issues encountered and resolutions

---

### 5. Validation & Quality Check Wave (Parallel Verification)

**Purpose**: Comprehensively verify refactoring improved code quality without breaking functionality.

Launch 3 agents **IN PARALLEL** (single message with multiple Task calls):

**Agent 1 - Functional Verification Engineer**

Ensure all functionality still works correctly:

- **Test Suite Validation**:
  - Re-run complete test suite (already done in Wave 4, verify results)
  - Check test coverage: did it improve, stay same, or decrease?
  - Use coverage tools if available: `npm run coverage`, `pytest --cov`, `go test -cover`
  - Verify: 100% of original tests still pass
  - Bonus: check if any previously-failing tests now pass

- **Build Validation**:
  - Verify full build succeeds (already done in Wave 4, verify results)
  - Check for any new warnings (compare to pre-refactor warnings)
  - Validate: no new linter errors or type errors

- **Smoke Testing**:
  - If application has entry point: attempt to run it
  - Check for: runtime errors, crashes, exceptions on startup
  - Verify: application starts successfully (if applicable)

- **Integration Points**:
  - Verify no breaking changes to public APIs
  - Check: exported functions, classes, interfaces remain compatible
  - Scan for: changes to function signatures in public modules

Output: Functional verification report with:
- Test results: [N]/[N] tests passing
- Test coverage: [X]% (change from baseline)
- Build status: PASS/FAIL
- Warnings: [N] (change from baseline)
- Smoke test: PASS/FAIL
- API compatibility: PASS/FAIL (no breaking changes)
- Overall: ✓ FUNCTIONAL or ❌ REGRESSIONS DETECTED

**Agent 2 - Code Quality Metrics Analyzer**

Measure code quality improvements from refactoring:

- **Code Smell Reduction**: Re-scan for code smells detected in Wave 2
  - Count remaining smells by type
  - Calculate: % reduction per smell type
  - Goal: 50%+ reduction in high-priority smells
  - Compare before/after:
    - Long methods: [Before] → [After]
    - God classes: [Before] → [After]
    - Code duplication: [Before] → [After]
    - Complex conditionals: [Before] → [After]
    - Poor naming: [Before] → [After]

- **Complexity Metrics**: Calculate objective complexity measures
  - **Lines of Code (LOC)**: total, per file, per function
    - Expected: may increase slightly (extracted functions) or decrease (removed duplication)
  - **Cyclomatic Complexity**: decision point count per function
    - Expected: should decrease (simplified conditionals)
  - **Nesting Depth**: maximum indentation level
    - Expected: should decrease (guard clauses, extraction)
  - **Function Length**: average and max function LOC
    - Expected: should decrease (extracted methods)
  - **File Length**: average and max file LOC
    - Expected: may stay same or slightly increase (extracted classes go to new files)
  - Use tools: `radon cc` (Python), `eslint complexity` (JS), `gocyclo` (Go)

- **Maintainability Index**: Calculate composite score (if tools available)
  - Combines: Halstead Volume, Cyclomatic Complexity, LOC
  - Range: 0-100 (higher is better)
  - Goal: index should increase

- **Code Churn**: Measure extent of changes
  - Files modified: [N]
  - Lines added: [X]
  - Lines deleted: [Y]
  - Net change: [X-Y]
  - Functions refactored: [N]

Output: Quality metrics report with before/after comparison:
```
Code Smell Reduction:
  Long Methods (>50 LOC): 15 → 6 (60% reduction) ✓
  God Classes (>500 LOC): 3 → 1 (67% reduction) ✓
  Code Duplication: 45 instances → 12 instances (73% reduction) ✓
  Complex Conditionals: 22 → 10 (55% reduction) ✓
  Poor Naming: 38 → 15 (61% reduction) ✓
  Overall Smell Reduction: 58% ✓

Complexity Metrics:
  Average Cyclomatic Complexity: 8.4 → 4.2 (50% reduction) ✓
  Max Nesting Depth: 6 → 3 (50% reduction) ✓
  Average Function Length: 42 LOC → 24 LOC (43% reduction) ✓
  Max Function Length: 156 LOC → 62 LOC (60% reduction) ✓

Code Churn:
  Files Modified: 23
  Lines Added: 245
  Lines Deleted: 412
  Net Reduction: -167 lines ✓
```

**Agent 3 - Standards & Best Practices Auditor**

Verify refactored code follows best practices:

- **Naming Conventions**: Check names follow project standards
  - Variables: camelCase, snake_case, etc. (per language)
  - Functions: verb-noun, descriptive, no abbreviations
  - Classes: PascalCase, noun-based
  - Constants: UPPER_SNAKE_CASE
  - Files: kebab-case, camelCase, etc. (per convention)
  - Verify: refactored code uses consistent naming

- **Code Style**: Verify formatting and style consistency
  - Run formatter: prettier, black, gofmt
  - Run linter: eslint, pylint, golint
  - Check: 0 new style violations
  - Verify: code is readable and idiomatic

- **Documentation Quality**: Check code is well-documented
  - Functions: have descriptive comments or docstrings
  - Classes: have class-level documentation
  - Complex logic: has explanatory comments
  - Constants: have comments explaining purpose/values
  - Public APIs: have complete documentation
  - Verify: documentation updated to reflect refactorings

- **Error Handling**: Verify proper error handling patterns
  - No swallowed exceptions
  - Errors are logged or propagated appropriately
  - Edge cases are handled
  - Verify: refactoring didn't remove error handling

- **DRY Principle**: Verify duplication eliminated
  - No copy-paste code remaining
  - Common logic extracted to shared functions
  - Magic numbers replaced with named constants
  - Verify: code is DRY (Don't Repeat Yourself)

- **SOLID Principles**: Check adherence to SOLID (if applicable)
  - Single Responsibility: each class/function has one purpose
  - Open/Closed: extensible without modification
  - Liskov Substitution: subtypes are substitutable
  - Interface Segregation: no fat interfaces
  - Dependency Inversion: depend on abstractions
  - Verify: refactored code better adheres to SOLID

- **Testability**: Verify code is more testable
  - Functions have clear inputs/outputs
  - Dependencies can be mocked
  - Side effects are isolated
  - Pure functions where possible
  - Verify: refactored code easier to test

Output: Standards compliance report with:
- Naming conventions: PASS/FAIL (issues if any)
- Code style: PASS/FAIL (violations if any)
- Documentation: PASS/FAIL (missing docs if any)
- Error handling: PASS/FAIL (issues if any)
- DRY principle: PASS/FAIL (remaining duplication if any)
- SOLID principles: [rating 1-5] (assessment)
- Testability: [rating 1-5] (assessment)
- Overall: ✓ MEETS STANDARDS or ⚠ NEEDS IMPROVEMENT

**Critical**: Wait for ALL 3 agents to complete. Consolidate validation results into final assessment.

**Final Decision**:
- If Functional Verification = PASS AND Quality Metrics show improvement AND Standards = PASS:
  - ✓ **REFACTORING SUCCESSFUL**
  - Commit changes (if Git available)
  - Proceed to reporting
- If Functional Verification = FAIL (regressions detected):
  - ❌ **ROLLBACK REQUIRED**
  - Restore from checkpoint
  - Report issues
  - Exit workflow
- If Quality Metrics show no improvement:
  - ⚠ **INCONCLUSIVE**
  - Code still works but quality didn't improve
  - Review refactoring choices
  - May keep changes if no harm done

---

## Execution Guidelines

### Parallelization Rules

**Within Each Wave**: Always launch agents in a SINGLE message with multiple Task tool calls. This is critical for performance.

Example:
```
Launch Wave 2 agents in parallel:
- Agent 1: Size & Complexity Analyzer (scanning for god classes, long methods...)
- Agent 2: Duplication Detective (searching for duplicate code...)
- Agent 3: Conditional Complexity Scanner (analyzing if-else chains...)
- Agent 4: Naming & Clarity Auditor (checking variable names...)
```

**Between Waves**: ALWAYS wait for all agents in current wave to complete before starting the next wave. Synthesize findings between waves.

### Context Management Strategy

**After Each Wave**:
1. Consolidate agent outputs into concise summary (500-1000 tokens max)
2. Remove redundant details, keep only actionable information
3. Pass summaries (not full outputs) to next wave

**For Large Codebases**:
1. Focus on high-impact files first (main source directories, not tests)
2. Sample rather than exhaustive analysis if >50K LOC
3. Limit to top 50 highest-priority smells for refactoring
4. Use file size limits (skip files >5K lines unless critical)

**Token Budget Tracking**:
- Reserve 30K tokens for validation and reporting
- If approaching 80% token usage, reduce scope:
  - Wave 2: focus on top 50 smells only
  - Wave 4: refactor top 20 highest-priority items only
  - Prioritize: Duplication > Complexity > Size > Naming

### Error Handling

**If Target Path Invalid**:
- Display clear error message with the invalid path
- Suggest checking spelling or using absolute path
- Exit gracefully (do not proceed with refactoring)

**If No Tests Found**:
- Warn user about risk
- Offer to continue with caution or abort
- If user continues: proceed but warn before each major refactoring
- If user aborts: suggest running /testgen first

**If Tests Fail Pre-Refactor**:
- STOP immediately
- Display failing test details
- Suggest fixing tests before refactoring
- Do not proceed (refactoring unsafe without working test baseline)

**If Tests Fail Post-Refactor**:
- Identify which refactorings likely caused failures
- Attempt automatic rollback to checkpoint
- Report specific failures and suspected causes
- Offer options: rollback all, fix tests, investigate
- Default: rollback if >3 failures or any critical test fails

**If Agent Fails During Wave**:
- Log the failure but continue with other agents
- Note missing analysis in final report
- Do not let single agent failure block entire workflow

**If No Code Smells Found**:
- Valid outcome for high-quality code
- Report: "✓ No significant code smells detected. Code quality is good!"
- Provide basic statistics: file count, LOC, complexity metrics
- Suggest: "Consider running /bughunter for security analysis"

**If Refactoring Causes Build Failure**:
- Rollback immediately to checkpoint
- Report build errors
- Analyze which refactorings likely caused failure
- Suggest manual review of complex refactorings

**If Token Budget Exhausted**:
- Complete current wave
- Skip remaining waves
- Generate partial report noting incomplete refactoring
- Summarize what was completed vs. remaining

### Adaptive Scaling

**Small Projects (<1K LOC, <50 files)**:
- Full analysis of all files
- Refactor all high and medium priority smells
- Detailed metrics and reporting
- Expected time: 5-10 minutes

**Medium Projects (1K-50K LOC, 50-1000 files)**:
- Standard workflow as designed
- Refactor top 50 highest-priority smells
- Comprehensive reporting
- Expected time: 15-30 minutes

**Large Projects (50K-100K LOC, 1000-5000 files)**:
- Focus on main source directories (exclude tests, examples)
- Refactor top 30 highest-priority smells
- Summary reporting for lower-priority items
- Expected time: 30-40 minutes

**Huge Projects (>100K LOC, >5000 files)**:
- Warn user and suggest targeting specific subdirectories
- If user confirms full refactoring:
  - Focus on top 20% most problematic files
  - Refactor only top 20 critical smells
  - High-level reporting only
  - Expected time: 40-60 minutes
- Recommend: run /refactor on subdirectories instead

### Refactoring Safety Guidelines

**Behavior Preservation**:
- All refactorings must be behavior-preserving (no functionality changes)
- Maintain exact same inputs/outputs for functions
- Preserve error handling and edge cases
- Keep performance characteristics similar (no major regressions)

**Test-Driven Refactoring**:
- Always run tests before and after refactoring
- If tests fail post-refactor: rollback immediately
- If no tests: proceed with extreme caution, small changes only

**Incremental Changes**:
- Make small, focused refactorings
- One pattern at a time per code unit
- Validate after each major change
- Don't combine multiple complex refactorings in one file

**Reversibility**:
- Always create checkpoint before refactoring
- Keep rollback option available
- Document all changes for easy reversal

**Public API Safety**:
- Never change public API signatures during refactoring
- Internal changes only
- If API change needed: defer to architecture discussion

---

## Report Format

Upon successful completion, generate comprehensive refactoring report:

```markdown
# Refactoring Report

**Generated**: [timestamp]
**Target**: [path]
**Status**: ✓ SUCCESS / ❌ ROLLED BACK / ⚠ PARTIAL

---

## Executive Summary

[2-3 sentence overview of refactoring results]

**Impact**:
- Files Refactored: [N]
- Code Smells Reduced: [X]% (from [A] to [B])
- Lines of Code Changed: +[X] -[Y] (net [Z])
- Tests: [N]/[N] passing ✓

**Quality Improvement**:
- Average Cyclomatic Complexity: [before] → [after] ([X]% reduction)
- Max Function Length: [before] LOC → [after] LOC ([X]% reduction)
- Code Duplication: [before] instances → [after] instances ([X]% reduction)

---

## Refactorings Applied

### Extract Method
- File: `src/services/userService.js`, Line 45
  - Before: 87-line function with mixed responsibilities
  - After: Extracted 3 helper functions (`validateUser`, `sanitizeInput`, `logUserAction`)
  - Impact: Cyclomatic complexity reduced from 15 to 6

### Replace Magic Number with Constant
- File: `src/utils/cache.js`, Line 12
  - Before: `setTimeout(callback, 3600000)`
  - After: `const ONE_HOUR_MS = 3600000; setTimeout(callback, ONE_HOUR_MS)`
  - Impact: Improved code clarity

[Continue for all refactorings...]

---

## Code Smell Detection Results

### Before Refactoring
- **God Classes**: 3 files >500 LOC
- **Long Methods**: 15 functions >50 LOC
- **Code Duplication**: 45 instances of duplicate code
- **Complex Conditionals**: 22 complex if-else chains
- **Poor Naming**: 38 unclear variable/function names
- **Magic Numbers**: 28 unexplained numeric literals
- **Total Code Smells**: 151

### After Refactoring
- **God Classes**: 1 file >500 LOC (2 refactored)
- **Long Methods**: 6 functions >50 LOC (9 refactored)
- **Code Duplication**: 12 instances (33 eliminated)
- **Complex Conditionals**: 10 complex chains (12 simplified)
- **Poor Naming**: 15 unclear names (23 improved)
- **Magic Numbers**: 8 unexplained literals (20 replaced with constants)
- **Total Code Smells**: 52 (66% reduction) ✓

---

## Quality Metrics

### Complexity Metrics
| Metric | Before | After | Change |
|--------|---------|--------|---------|
| Avg. Cyclomatic Complexity | 8.4 | 4.2 | -50% ✓ |
| Max Cyclomatic Complexity | 23 | 12 | -48% ✓ |
| Avg. Function Length | 42 LOC | 24 LOC | -43% ✓ |
| Max Function Length | 156 LOC | 62 LOC | -60% ✓ |
| Avg. Nesting Depth | 3.2 | 2.1 | -34% ✓ |
| Max Nesting Depth | 6 | 3 | -50% ✓ |

### Test Results
- **Pre-refactor**: 127/127 tests passing ✓
- **Post-refactor**: 127/127 tests passing ✓
- **Test Coverage**: 78% → 78% (maintained)
- **New Test Failures**: 0 ✓

### Build Status
- **Pre-refactor**: Build successful, 3 warnings
- **Post-refactor**: Build successful, 1 warning ✓
- **Linter Errors**: 0 (no new violations)

---

## Files Modified

```
 src/services/userService.js     | 145 ++++++++++++++++++---------
 src/services/productService.js  |  98 ++++++++++---------
 src/utils/cache.js              |  45 +++++-----
 src/utils/validation.js         |  67 ++++++-------
 src/constants/index.js          |  23 ++++++
 src/api/controllers/auth.js     | 112 +++++++++++----------
 [... additional files ...]
 23 files changed, 456 insertions(+), 289 deletions(-)
```

---

## Standards Compliance

### Naming Conventions
✓ PASS - All refactored code follows project naming standards

### Code Style
✓ PASS - 0 new style violations

### Documentation
✓ PASS - All new functions have descriptive comments

### Error Handling
✓ PASS - Error handling preserved in all refactorings

### DRY Principle
✓ PASS - 73% reduction in code duplication

### SOLID Principles
⭐⭐⭐⭐☆ (4/5) - Significant improvement in single responsibility and dependency inversion

### Testability
⭐⭐⭐⭐⭐ (5/5) - Refactored code is highly testable with clear inputs/outputs

---

## Refactorings Deferred

The following code smells were identified but not refactored due to low priority, high risk, or architectural implications:

1. **God Class: `src/core/Application.js` (876 LOC)**
   - Reason: Core application class, requires architectural redesign
   - Recommendation: Schedule architecture review to split responsibilities

2. **Complex Module: `src/parsers/legacyFormat.js`**
   - Reason: Legacy code with no test coverage, high risk
   - Recommendation: Add tests first, then refactor

[... additional deferred items ...]

---

## Recommendations

### Immediate Actions
1. Review and merge refactored code (all tests passing)
2. Update code review guidelines to prevent reintroduction of smells
3. Configure linter to enforce complexity limits (e.g., max cyclomatic complexity: 10)

### Short-term (1-2 sprints)
1. Add test coverage for `src/parsers/legacyFormat.js` (currently 0%)
2. Schedule architecture review for `Application.js` god class
3. Refactor remaining 6 long methods (medium priority)

### Long-term
1. Establish code quality metrics in CI/CD pipeline
2. Run /refactor periodically (monthly) to maintain code quality
3. Consider adopting complexity analysis tools: radon (Python), eslint-plugin-complexity (JS)

### Prevention Strategies
1. Add pre-commit hook to check cyclomatic complexity
2. Code review checklist: check for duplication, magic numbers, long functions
3. Pair programming on complex features to catch smells early
4. Regular refactoring sessions (weekly tech debt time)

---

## Analysis Metadata

**Scope**:
- Target Path: `/Users/user/project/src`
- Files Scanned: 145
- Files Analyzed: 132
- Files Skipped: 13 (test files, configuration)
- Lines of Code: 18,420

**Coverage**:
- Size & Complexity Analysis: ✓
- Duplication Detection: ✓
- Conditional Complexity Analysis: ✓
- Naming & Clarity Audit: ✓

**Execution**:
- Analysis Time: 8 minutes
- Refactoring Time: 12 minutes
- Validation Time: 3 minutes
- Total Time: 23 minutes

**Test Baseline**:
- Test Command: `npm test`
- Pre-refactor: 127/127 passing
- Post-refactor: 127/127 passing
- Regression Tests: ✓ PASS

---

## Limitations & Disclaimers

This refactoring used automated static analysis and AI-powered transformations. Please note:

- **Partial Coverage**: Not all code smells can be automatically fixed. Complex architectural issues require human judgment.
- **Behavior Preservation**: While all tests pass, subtle behavioral changes are possible. Review critical code paths.
- **Test Dependency**: Refactoring safety depends on test coverage. Untested code was refactored conservatively or skipped.
- **Language Support**: Best results for JavaScript, TypeScript, Python, Java, Go. Other languages have limited pattern support.
- **Manual Review Recommended**: Review all changes before merging, especially in critical code paths.

---

## Next Steps

1. ✓ Review refactoring report
2. ✓ Verify tests pass locally: `npm test`
3. ✓ Review git diff: `git diff`
4. ✓ Commit changes: `git add . && git commit -m "refactor: improve code quality [bots]"`
5. ✓ Push and create PR: `git push && gh pr create`
6. Consider running `/bughunter` to check for bugs in refactored code
7. Schedule follow-up for deferred refactorings

---

**Report End**
```

---

## Success Criteria

The refactoring is only complete when:

- ✓ All waves executed successfully (Detection → Strategy → Execution → Validation)
- ✓ Code smell reduction ≥50% (or no major smells detected)
- ✓ All tests pass post-refactor (100% of pre-refactor test count)
- ✓ Build succeeds with no new errors
- ✓ Code quality metrics improved (complexity reduced, duplication reduced)
- ✓ No regressions detected (functionality preserved)
- ✓ Standards compliance verified (naming, style, documentation)
- ✓ Final report generated with comprehensive metrics
- ✓ All changes are behavior-preserving transformations

---

## Usage Examples

**Refactor current directory**:
```
/refactor
```

**Refactor specific directory**:
```
/refactor src/services/
```

**Refactor specific file**:
```
/refactor src/utils/helper.js
```

**Refactor with explicit path**:
```
/refactor /Users/myuser/projects/myapp/src/api
```

---

## Notes

- This command performs **static refactoring only**. It improves code structure and readability without changing functionality.
- **Test coverage is critical** for safe refactoring. Consider running `/testgen` first if test coverage is low.
- Refactoring time scales with codebase size: ~5-10 minutes for small projects, ~15-30 minutes for medium, ~30-40 minutes for large.
- **All refactorings are behavior-preserving**. If tests fail post-refactor, changes are automatically rolled back.
- **Best results** with JavaScript, TypeScript, Python, Java, and Go codebases.
- **Complementary to other commands**: Use alongside `/bughunter` for security analysis and `/testgen` for test coverage.
- **Git recommended**: If using Git, a checkpoint is created before refactoring for easy rollback.
- **CI/CD integration**: Run /refactor in CI to enforce code quality standards and prevent code smell accumulation.
