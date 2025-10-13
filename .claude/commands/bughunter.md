---
description: Hunt for bugs across the codebase with multi-wave analysis
argument-hint: [target-directory]
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
model: claude-sonnet-4-5-20250929
---

# Bug Hunter

Orchestrate a sophisticated multi-wave agent workflow to systematically discover, analyze, validate, and report bugs across a codebase. This command uses parallel agent execution within waves, with synchronization points between phases to ensure comprehensive coverage and accuracy.

## Variables

TARGET_DIRECTORY: $ARGUMENTS (defaults to current directory if not provided)

## Workflow

### 0. Context & Organization Check

**Purpose:** Read organization files to understand project context, bug tracking priorities, and quality goals before starting analysis.

#### Step 0.1: Read Organization Files

Attempt to read the following organization files (if they exist):

**Read TODO.md:**
- Look for active bug hunt tasks `[▶]` related to code quality
- Check for known issues or bugs `[⚠]` documented
- Identify quality improvement priorities
- Note areas of codebase flagged for review

**Read STATUS.md:**
- Check current quality metrics baseline (bugs, code smells)
- Review recent bug fixes or security improvements
- Check test coverage baseline
- Review security audit history if any
- Identify bug-prone areas from past work

**Read ROADMAP.md:**
- Identify current phase quality goals
- Check if bug hunting aligns with phase priorities
- Review quality standards for current phase
- Note any security or quality objectives

#### Step 0.2: Extract Context Summary

Compile extracted information into a context summary:

```
Organization Context:
- Current Phase: [from ROADMAP or "Unknown"]
- Quality Priority: [High/Medium/Low based on TODO/ROADMAP]
- Known Issues: [list from TODO or "None documented"]
- Quality Baseline: [bugs/smells from STATUS or "Unknown"]
- Test Coverage: [from STATUS or "Unknown"]
- Recent Security Work: [from STATUS or "None"]
- Focus Areas: [bug-prone areas from STATUS or "All"]
- Strategic Goal: [quality objectives from ROADMAP]
```

#### Step 0.3: Apply Context to Bug Hunting

Use the context summary to inform analysis:
- **If known issues exist**: Verify they're still present and assess severity
- **If focus areas identified**: Prioritize those directories/files
- **If quality baseline known**: Compare findings against baseline
- **If phase goals clear**: Align bug severity with phase priorities
- **If test coverage low**: Flag untested code as higher risk

**Note**: If organization files don't exist, proceed without context (graceful degradation). Bug hunting will execute normally but won't have historical context.

---

### 0.5. Update Tracking - Bug Hunt Started

**Purpose:** Mark bug hunt as in-progress in organization files.

#### Step 0.5.1: Update TODO.md (if exists)

Find and update TODO item:
- If TODO item exists for bug hunt: Change `[ ]` to `[▶]` (mark as in progress)
- If no TODO item exists: Add new item:
  ```markdown
  ## 🔥 In Progress
  - [▶] Bug hunt analysis: [target directory] (Started: [timestamp])
    - Target: [TARGET_DIRECTORY]
    - Scope: [estimated file count and LOC]
    - Phase: [current phase from ROADMAP]
    - Estimated: 10-30 minutes depending on codebase size
  ```

#### Step 0.5.2: Update STATUS.md (if exists)

Add to current work section:
```markdown
## 🔬 Active Analysis
- **Bug Hunt: [target directory]** - In Progress
  - Started: [timestamp]
  - Scope: [N files, ~X LOC]
  - Wave: Discovery & Analysis
  - Focus: [Security, Memory, Logic, Concurrency, Quality]
  - Phase: [current phase from ROADMAP]
```

**Note**: If organization files don't exist, skip this step (graceful degradation).

---

### 1. Validation & Initialization

**Purpose**: Validate inputs and establish analysis scope before proceeding.

**Steps**:
1. If `TARGET_DIRECTORY` is empty, use current working directory (`.`)
2. Verify target directory exists and is readable
3. If directory doesn't exist or lacks permissions:
   - Display clear error: "Directory '[path]' not found or unreadable. Please verify the path."
   - STOP immediately
4. Estimate project size (file count, LOC) using `find` and `wc`
5. If project is extremely large (>100K LOC):
   - Warn user: "Large project detected (~NLOC). Analysis may take 20-30 minutes. Consider targeting specific subdirectories."
   - Suggest: "Example: /bughunter src/api"
6. Display analysis scope: "Analyzing [N] files in [path]. Estimated time: [X] minutes."

---

### 2. Discovery Wave (Parallel Reconnaissance)

**Purpose**: Survey the codebase landscape and identify potential bug-prone areas.

Launch 3 agents **IN PARALLEL** (single message with multiple Task calls):

**Agent 1 - Codebase Profiler**
- Map project structure, file types, and technology stack
- Identify languages (JavaScript, Python, Java, Go, etc.) using file extensions and configuration files
- Detect frameworks (package.json, requirements.txt, go.mod, Gemfile)
- Catalog entry points and main source directories
- Exclude common patterns: node_modules, .git, dist, build, vendor, target, bin, __pycache__
- Output: Project profile with languages, frameworks, file counts, and recommended focus areas

**Agent 2 - Attack Surface Mapper**
- Search for security-critical code patterns:
  - HTTP endpoints (routes, controllers, API handlers)
  - Database operations (SQL queries, ORM calls)
  - File I/O operations (open, read, write)
  - Authentication/authorization code (login, permissions, tokens)
  - Cryptographic operations (encryption, hashing, key management)
- Use Grep to find: "SELECT", "INSERT", "UPDATE", "DELETE", "query", "execute", "/api/", "@route", "fetch", "axios", "open(", "write("
- Output: Map of high-risk files and line numbers for prioritized analysis

**Agent 3 - Complexity Scanner**
- Use Glob to find all source files
- For each file, estimate complexity (file size, function count, nesting depth)
- Identify complexity hotspots (long files >500 lines, deeply nested code)
- Use Grep to find: high cyclomatic complexity indicators (multiple nested if/for/while)
- Output: List of complex files that warrant detailed scrutiny

**Critical**: Wait for ALL 3 agents to complete before proceeding. Synthesize findings into a prioritized target list focusing on:
1. Security-critical files (authentication, data handling)
2. High-complexity files (likely bug-prone)
3. Entry points and public APIs

---

### 3. Analysis Wave (Parallel Deep Bug Hunting)

**Purpose**: Systematically analyze code for specific bug categories following security-first priority.

Launch 5 agents **IN PARALLEL** (single message with multiple Task calls):

**Agent 1 - Security Vulnerability Hunter**

Focus on OWASP Top 10 and common security vulnerabilities:

- **SQL Injection**: Search for string concatenation in SQL queries
  - Grep patterns: `"SELECT.*\+.*"`, `"INSERT.*\+.*"`, `query.*\+.*user`, `execute.*f".*SELECT`
  - Look for: raw string building, f-strings with user input, string formatting in queries

- **XSS (Cross-Site Scripting)**: Search for unsafe HTML rendering
  - Grep patterns: `innerHTML`, `dangerouslySetInnerHTML`, `document.write`, `eval\(`
  - Look for: unescaped user input in templates, direct DOM manipulation

- **Hardcoded Secrets**: Search for credentials and API keys in code
  - Grep patterns: `password.*=.*["'].*["']`, `api_key.*=.*["']`, `secret.*=.*["']`, `token.*=.*["']`
  - Look for: hardcoded passwords, API keys, tokens, private keys

- **Command Injection**: Search for shell command execution with user input
  - Grep patterns: `exec\(`, `system\(`, `shell_exec`, `subprocess.*shell=True`, `os.system`

- **Insecure Deserialization**: Search for unsafe object deserialization
  - Grep patterns: `pickle.loads`, `eval\(`, `yaml.load\(`, `unserialize\(`

Output: List of security bug candidates with:
- Type (SQL injection, XSS, hardcoded secret, etc.)
- File path and line number
- Code snippet (5 lines context)
- Preliminary severity (HIGH/CRITICAL for all security issues)
- Brief explanation of the vulnerability

**Agent 2 - Memory & Resource Analyzer**

Focus on resource leaks and memory issues:

- **Unclosed Resources**: Search for opened but not closed resources
  - Grep patterns: `open\(.*\)` without corresponding `close()`, missing `with` statements (Python), missing `finally` blocks
  - Look for: file handles, database connections, network sockets

- **Memory Leaks**: Search for allocations without cleanup
  - Grep patterns: `new .*\[` without `delete`, event listeners without removal, circular references
  - Look for: JavaScript: `addEventListener` without `removeEventListener`, Python: circular refs in classes

- **Infinite Loops**: Search for loops without break conditions
  - Grep patterns: `while.*True`, `while\(true\)`, `for\(;;`
  - Look for: loops without exit conditions or timeout mechanisms

- **Buffer Issues**: Search for array access without bounds checking
  - Grep patterns: array access with variables, `buffer.*\[.*\]`, unchecked array indices

Output: List of memory/resource bug candidates with file paths, line numbers, resource type, and fix suggestions.

**Agent 3 - Logic & Correctness Analyzer**

Focus on logic errors and correctness issues:

- **Null Pointer Dereferences**: Search for property access without null checks
  - Grep patterns: `\..*\(` on potentially null objects, missing null guards
  - Look for: accessing properties/methods without validating object exists

- **Off-by-One Errors**: Search for suspicious loop bounds and array access
  - Grep patterns: `< length`, `<= length`, array access patterns
  - Look for: loops using `<=` where `<` expected, array\[length\] access

- **Division by Zero**: Search for division without denominator validation
  - Grep patterns: `/.*[^/]` (division operations), `%` (modulo)
  - Look for: division by variables without zero checks

- **Type Coercion Issues**: Search for loose equality and implicit conversions
  - Grep patterns: `==` (JavaScript loose equality), implicit type conversions

- **Empty Error Handlers**: Search for swallowed exceptions
  - Grep patterns: `except:.*pass`, `catch.*\{\s*\}`, empty catch blocks
  - Look for: exceptions caught but not logged or handled

Output: List of logic bug candidates with file paths, line numbers, bug type, and potential impact.

**Agent 4 - Concurrency & Race Condition Detective**

Focus on thread safety and concurrency issues (if applicable):

- **Shared State Without Synchronization**: Search for shared variables without locks
  - Grep patterns: global variables, class-level mutable state, shared collections
  - Look for: variables accessed by multiple threads without mutex/lock

- **Deadlock Potential**: Search for nested lock acquisition
  - Grep patterns: multiple `lock()`, `synchronized`, `mutex` calls in same function

- **Race Conditions**: Search for check-then-act patterns
  - Grep patterns: `if.*exists.*then.*create`, time-of-check-time-of-use (TOCTOU)

Note: Skip this analysis if no concurrency/threading detected in codebase.

Output: List of concurrency bug candidates (if applicable).

**Agent 5 - Code Quality & Maintainability Scanner**

Focus on code smells and quality issues:

- **Dead Code**: Search for unreachable code
  - Grep patterns: code after `return`, unused functions/variables
  - Use Bash: language-specific linters if available (eslint, pylint)

- **Code Duplication**: Search for repeated code blocks
  - Look for: similar function signatures, repeated logic patterns

- **High Complexity**: Identify overly complex functions
  - Look for: deeply nested conditionals (>4 levels), long functions (>100 lines)
  - Grep patterns: multiple nested `if`/`for`/`while`

- **Magic Numbers**: Search for unexplained constants
  - Grep patterns: numeric literals in comparisons and calculations (exclude 0, 1, -1)

- **Inconsistent Error Handling**: Search for inconsistent patterns
  - Look for: some functions throw exceptions, others return error codes

Output: List of quality issues with file paths, line numbers, severity (MEDIUM/LOW), and refactoring suggestions.

**Critical**: Wait for ALL 5 agents to complete before proceeding. Consolidate all bug candidates (potentially 50-200+ findings) into a unified list with preliminary severity ratings. Remove obvious duplicates (same file + line + issue type).

---

### 4. Validation & Triage Wave (Parallel False Positive Reduction)

**Purpose**: Reduce false positives through contextual validation and severity assessment.

Launch 3 agents **IN PARALLEL** (single message with multiple Task calls):

**Agent 1 - Context Enricher**

For each bug candidate from Wave 3:
- Use Read tool to fetch 30-50 lines of context around each finding
- Capture: function signature, imports, surrounding logic
- Identify: Is this in test code? Is this in production code? Are there mitigating controls nearby?
- Check for: Input validation, sanitization, error handling in surrounding code
- Output: Enriched findings with full context for validation

**Agent 2 - LLM Validator & Severity Adjuster**

For each enriched finding from Agent 1:
- Analyze with full context: Is this a true positive or false positive?
- Consider:
  - Is user input actually unsanitized? (check for validation)
  - Is this a test file or example code? (lower priority)
  - Are there framework protections? (ORMs prevent SQL injection)
  - Is the resource cleanup in a different code path? (not visible in grep)
- Assign confidence score: HIGH (80-100%), MEDIUM (50-79%), LOW (0-49%)
- Adjust severity based on real-world impact:
  - CRITICAL: Easily exploitable security vulnerabilities, data corruption
  - HIGH: Memory leaks, authentication bypasses, logic errors affecting core functionality
  - MEDIUM: Code quality issues, moderate inefficiencies, error handling gaps
  - LOW: Style violations, minor code smells, optimization suggestions
- Filter out: Findings with confidence < 30% (likely false positives)
- Output: Validated bug list with confidence scores and adjusted severity

**Agent 3 - Priority Ranker**

For each validated finding from Agent 2:
- Calculate priority score using multi-factor formula:
  - Severity weight: CRITICAL=10, HIGH=7, MEDIUM=4, LOW=2
  - Confidence multiplier: confidence_score (0.0-1.0)
  - Exposure multiplier: public API=2x, internal=1x
  - Fix complexity: easy=1.5x, hard=0.5x
- Rank all findings by priority score (highest first)
- Group related findings by type and root cause
- Output: Prioritized bug list ready for reporting

**Critical**: Wait for ALL 3 agents to complete. Produce a final, validated bug list with accurate severity ratings and priority rankings. Each bug should include:
- ID (e.g., SEC-001, MEM-003, LOG-012)
- Type and category
- Severity (CRITICAL/HIGH/MEDIUM/LOW)
- Confidence (percentage)
- File path and line number
- Description of issue
- Impact assessment
- Suggested fix

---

### 5. Reporting Wave (Parallel Report Generation)

**Purpose**: Generate comprehensive bug report and verify completeness.

Launch 2 agents **IN PARALLEL** (single message with multiple Task calls):

**Agent 1 - Report Generator**

Create a structured markdown report:

```markdown
# Bug Hunter Report

**Generated**: [timestamp]
**Target**: [directory path]
**Files Analyzed**: [count]
**Lines of Code**: [count]
**Total Issues Found**: [count]

---

## Executive Summary

[2-3 sentence overview of findings, highlighting most critical issues]

**Severity Breakdown**:
- CRITICAL: [count] - Immediate attention required
- HIGH: [count] - Address in current sprint
- MEDIUM: [count] - Schedule for upcoming sprint
- LOW: [count] - Technical debt / code quality

**Category Breakdown**:
- Security Vulnerabilities: [count]
- Memory/Resource Issues: [count]
- Logic Errors: [count]
- Concurrency Issues: [count]
- Code Quality: [count]

---

## Critical Issues (Immediate Action Required)

[For each CRITICAL severity bug:]

### [ID]: [Bug Type] - [File Path]:[Line]

**Severity**: CRITICAL | **Confidence**: [percentage]
**Category**: [Security/Memory/Logic/etc.]

**Description**: [What the bug is and why it's critical]

**Impact**: [User-facing consequences, security risk, data integrity]

**Location**:
```
[Language]
[File path]:[line number]

[Code snippet with 5 lines context, highlighting the problematic line]
```

**Reproduction**: [How to trigger this bug if applicable]

**Suggested Fix**:
[Specific remediation guidance with code example]

**References**: [OWASP link, CVE number, documentation if applicable]

---

## High Severity Issues

[Same structure as Critical Issues]

---

## Medium Severity Issues

[Same structure as Critical Issues, can be more concise]

---

## Low Severity Issues

[Same structure as Critical Issues, can be brief summaries]

---

## Analysis Metadata

**Scope**:
- Target Directory: [path]
- Files Scanned: [count]
- Files Analyzed: [count]
- Files Skipped: [count] (binaries, node_modules, etc.)
- Lines of Code: [count]
- Languages Detected: [list]

**Coverage**:
- Security Analysis: ✓
- Memory/Resource Analysis: ✓
- Logic/Correctness Analysis: ✓
- Concurrency Analysis: [✓ / Skipped - no threading detected]
- Code Quality Analysis: ✓

**Validation**:
- Bug Candidates Identified: [count]
- False Positives Filtered: [count]
- Final Validated Issues: [count]
- Average Confidence Score: [percentage]

---

## Recommendations

1. **Immediate Actions**: [Top 3-5 critical fixes to prioritize]
2. **Short-term** (1-2 sprints): [High severity items]
3. **Long-term**: [Technical debt and quality improvements]
4. **Prevention**: [Process improvements, tooling, code review focus areas]

---

## Limitations & Disclaimers

This analysis uses static code analysis and AI-powered pattern recognition to identify common bug patterns. Please note:

- **Not Exhaustive**: This analysis cannot detect all possible bugs, especially runtime-dependent issues, complex business logic errors, or issues requiring deep domain knowledge.
- **False Positives Possible**: Some findings may not apply to your specific context. Review each finding carefully.
- **Complementary Approach**: Use this analysis alongside other quality assurance methods: unit testing, integration testing, code review, security audits, and dynamic analysis.
- **Best Practices**: Results are best for JavaScript, TypeScript, Python, Java, and Go. Other languages have limited support.

---

## Next Steps

1. Review all CRITICAL issues immediately
2. Triage HIGH severity issues with your team
3. Create tickets for validated bugs
4. Consider running targeted dynamic analysis on security findings
5. Update coding standards to prevent similar issues
6. Re-run analysis periodically to track progress

---

**Report End**
```

Save report to file if requested, otherwise display to user.

**Agent 2 - Coverage Verifier**

Verify analysis completeness:
- Check that all target files were reached (no traversal errors)
- Verify all bug categories were covered
- Identify any gaps in analysis:
  - Were large files skipped?
  - Were certain directories excluded?
  - Did any agents fail silently?
- Validate report accuracy:
  - All file paths exist and are correct
  - Line numbers are accurate
  - No duplicate findings in final report
- Output: Coverage verification summary and any warnings

**Critical**: Wait for both agents to complete. Display final report to user with coverage verification notes.

---

## Execution Guidelines

### Parallelization Rules

**Within Each Wave**: Always launch agents in a SINGLE message with multiple Task tool calls. This is critical for performance.

Example:
```
Launch Wave 2 agents in parallel:
- Agent 1: Security Hunter (searching for SQL injection, XSS...)
- Agent 2: Memory Analyzer (searching for resource leaks...)
- Agent 3: Logic Analyzer (searching for null pointers...)
- Agent 4: Concurrency Detective (searching for race conditions...)
- Agent 5: Quality Scanner (searching for code smells...)
```

**Between Waves**: ALWAYS wait for all agents in current wave to complete before starting the next wave. Synthesize findings between waves.

### Context Management Strategy

**After Each Wave**:
1. Consolidate agent outputs into concise summary (500-1000 tokens max)
2. Remove redundant details, keep only actionable information
3. Pass summaries (not full outputs) to next wave

**For Large Codebases**:
1. Focus on high-priority files (security-critical, complex, entry points)
2. Sample rather than exhaustive analysis if >50K LOC
3. Use file size limits (skip files >10MB unless explicitly requested)

**Token Budget Tracking**:
- Reserve 20K tokens for final report generation
- If approaching 80% token usage, skip low-priority quality scans
- Prioritize: Security > Memory > Logic > Quality

### Error Handling

**If Target Directory Invalid**:
- Display clear error message with the invalid path
- Suggest checking spelling or using absolute path
- Exit gracefully (do not proceed with analysis)

**If Project Too Large (>100K LOC)**:
- Warn user about potential long runtime
- Suggest targeting specific subdirectories
- Offer to continue with focused analysis (high-risk files only)

**If Agent Fails During Wave**:
- Log the failure but continue with other agents
- Note missing analysis category in final report
- Do not let single agent failure block entire analysis

**If No Bugs Found**:
- Valid outcome for well-written code
- Report: "No significant issues detected in analyzed files"
- Still provide coverage statistics and analysis metadata
- Suggest: "Consider dynamic testing for comprehensive assurance"

**If Token Budget Exhausted**:
- Immediately finalize analysis with current findings
- Generate partial report noting incomplete analysis
- Provide summary of what was covered vs. skipped

### Adaptive Scaling

**Small Projects (<1K LOC, <50 files)**:
- Use full agent roster
- Comprehensive analysis of all files
- Detailed reporting

**Medium Projects (1K-50K LOC, 50-1000 files)**:
- Use full agent roster as designed
- Standard analysis depth
- Comprehensive reporting

**Large Projects (50K-100K LOC, 1000-5000 files)**:
- Focus on high-risk files (from Attack Surface Mapper)
- Prioritize security and memory analysis
- Summary reporting for low-priority findings

**Huge Projects (>100K LOC, >5000 files)**:
- Warn user and suggest subset
- If user confirms, analyze only:
  - Authentication/authorization code
  - Database interaction code
  - User input handling code
  - Top 20% most complex files
- Brief reporting focused on critical issues only

---

## Report Format

The final report will be a comprehensive markdown document including:

1. **Executive Summary**: High-level findings and severity distribution
2. **Critical Issues**: Detailed breakdown of CRITICAL severity bugs
3. **High Severity Issues**: Detailed breakdown of HIGH severity bugs
4. **Medium Severity Issues**: Summary of MEDIUM severity bugs
5. **Low Severity Issues**: Brief listing of LOW severity bugs
6. **Analysis Metadata**: Scope, coverage, validation statistics
7. **Recommendations**: Prioritized action items and next steps
8. **Limitations**: Clear disclaimers about analysis boundaries

Each bug finding includes:
- Unique ID
- Severity and confidence
- File location and line number
- Code snippet with context
- Impact assessment
- Suggested fix with code example
- References (CVE, OWASP, documentation)

---

## Success Criteria

The bug hunt is only complete when:

- ✓ All 5 waves executed successfully
- ✓ At least Discovery and Analysis waves completed (Validation optional if no bugs found)
- ✓ Final report generated with all required sections
- ✓ All CRITICAL/HIGH findings include specific remediation guidance
- ✓ Coverage verification confirms no major analysis gaps
- ✓ Report accurately reflects codebase reality (no fabricated bugs)
- ✓ User receives actionable insights for improving code quality

---

## Usage Examples

**Analyze current directory**:
```
/bughunter
```

**Analyze specific directory**:
```
/bughunter ~/projects/myapp/src
```

**Analyze specific subdirectory**:
```
/bughunter backend/api
```

---

## Notes

- This command performs **static analysis only**. It cannot detect runtime-dependent bugs or complex business logic errors.
- **Best results** with JavaScript, TypeScript, Python, Java, and Go codebases.
- Analysis time scales with codebase size: ~2-5 minutes for small projects, ~10-20 minutes for medium, ~20-30 minutes for large.
- **False positives are possible**. Each finding includes a confidence score - prioritize HIGH confidence findings.
- **Complementary to other tools**: Use alongside linters, unit tests, integration tests, and security audits for comprehensive quality assurance.
- **Privacy note**: All analysis is performed locally. No code is transmitted externally.

---

### 6. Update Organization Files & Summary

**Purpose:** Update TODO.md, STATUS.md, and ROADMAP.md with bug hunt results and quality metrics.

#### Step 6.1: Update TODO.md (if exists)

Mark bug hunt task as completed and add follow-up tasks:

```markdown
## ✅ Completed Recently
- [x] Bug hunt analysis: [target directory] (Completed: [timestamp])
  - Target: [TARGET_DIRECTORY]
  - Duration: [total time]
  - Status: [✓ COMPLETE / ⚠ PARTIAL - token limit]
  - Results:
    * Files analyzed: [count]
    * Lines of code: [count]
    * Total issues: [count]
    * Critical: [count] | High: [count] | Medium: [count] | Low: [count]
  - Categories:
    * Security: [count] issues
    * Memory/Resource: [count] issues
    * Logic errors: [count] issues
    * Concurrency: [count] issues
    * Code quality: [count] issues

## 📋 Up Next
[Add critical bug fixes as new tasks:]
- [ ] Fix [SEC-001]: [critical security issue] (HIGH PRIORITY)
- [ ] Fix [MEM-003]: [memory leak in X] (HIGH PRIORITY)
- [ ] Address [count] HIGH severity issues
- [ ] Review and triage [count] MEDIUM severity issues
```

#### Step 6.2: Update STATUS.md (if exists)

Remove from active analysis and update quality metrics:

```markdown
## 🔬 Active Analysis
[Remove bug hunt entry]

## 🐛 Bug Analysis History
- **Bug Hunt: [target directory]** - Completed [date]
  - Scope: [N files, X LOC]
  - Duration: [total time]
  - Languages: [detected languages]
  - Analysis coverage:
    * Security: ✓
    * Memory/Resource: ✓
    * Logic/Correctness: ✓
    * Concurrency: [✓ / Skipped]
    * Code Quality: ✓
  - Findings breakdown:
    * CRITICAL: [count] issues
    * HIGH: [count] issues
    * MEDIUM: [count] issues
    * LOW: [count] issues
  - Category breakdown:
    * Security vulnerabilities: [count]
    * Memory/Resource leaks: [count]
    * Logic errors: [count]
    * Concurrency issues: [count]
    * Code quality smells: [count]
  - Validation:
    * Bug candidates identified: [count]
    * False positives filtered: [count]
    * Final validated issues: [count]
    * Average confidence: [percentage]%
  - Top priority fixes:
    1. [SEC-001]: [critical issue summary]
    2. [MEM-003]: [high severity issue summary]
    3. [LOG-007]: [high severity issue summary]

## 📊 Quality Metrics
[Update quality baseline:]
- **Bugs Identified**: [previous count] → [new total] ([+N] new issues)
- **Critical Issues**: [count]
- **Security Vulnerabilities**: [count]
- **Code Smells**: [count]
- **Test Coverage**: [percentage]% (flagged untested code as higher risk)
```

#### Step 6.3: Update ROADMAP.md (if exists)

Check if bug hunt was a phase objective or quality gate:

**If bug hunt was a phase objective:**
```markdown
### Phase [N]: [Phase Name]
**Progress:** [X/Y] ([old%]) → [(X+1)/Y] ([new%])  ← Updated!
- [x] Code quality audit / Bug hunt (Completed: [date])  ← Marked complete!
  - Via: /bughunter [target]
  - Results: [count] total issues ([count] CRITICAL/HIGH)
  - Quality: [average confidence]% validation
  - Status: [✓ Baseline established / ⚠ Critical issues require fixes]
```

**If bug hunt establishes quality baseline:**
Add to phase notes or quality tracking section:
```markdown
### Quality Baseline Established
- [date] Bug hunt completed: [target] (/bughunter command)
  - Phase: [current phase]
  - Issues identified: [count] ([breakdown by severity])
  - Focus areas: [Security/Memory/Logic priorities]
  - Next: Address [count] CRITICAL/HIGH issues before phase completion
```

#### Step 6.4: Generate Integrated Summary Report

Create comprehensive summary that references organization files:

```markdown
═══════════════════════════════════════════════════════════
✓ BUG HUNT COMPLETE: [Target directory]
═══════════════════════════════════════════════════════════

📊 ANALYSIS SUMMARY:
   • Target: [TARGET_DIRECTORY]
   • Files Analyzed: [count] files
   • Lines of Code: [count] LOC
   • Languages: [detected languages]
   • Duration: [total time]
   • Overall Status: [✓ COMPLETE / ⚠ PARTIAL]

🐛 FINDINGS BREAKDOWN:
   • Total Issues: [count]
     - CRITICAL: [count] (immediate action required)
     - HIGH: [count] (address in current sprint)
     - MEDIUM: [count] (schedule for next sprint)
     - LOW: [count] (technical debt / code quality)

   • By Category:
     - Security Vulnerabilities: [count]
     - Memory/Resource Issues: [count]
     - Logic Errors: [count]
     - Concurrency Issues: [count]
     - Code Quality Smells: [count]

🔍 ANALYSIS COVERAGE:
   • Security Analysis: ✓
   • Memory/Resource Analysis: ✓
   • Logic/Correctness Analysis: ✓
   • Concurrency Analysis: [✓ / Skipped - no threading]
   • Code Quality Analysis: ✓

✅ VALIDATION QUALITY:
   • Bug Candidates Identified: [count]
   • False Positives Filtered: [count] ([percentage]%)
   • Final Validated Issues: [count]
   • Average Confidence Score: [percentage]%

🚨 TOP PRIORITY ISSUES:
   1. [ID]: [Brief description] - [Severity]
      Location: [file]:[line]
      Impact: [brief impact statement]
   
   2. [ID]: [Brief description] - [Severity]
      Location: [file]:[line]
      Impact: [brief impact statement]
   
   3. [ID]: [Brief description] - [Severity]
      Location: [file]:[line]
      Impact: [brief impact statement]

📁 ORGANIZATION FILES UPDATED:
   • TODO.md: Bug hunt marked complete, [N] fix tasks added
   • STATUS.md: Quality metrics updated, bug baseline established
   • ROADMAP.md: [Phase progress updated / Quality baseline logged]

🎯 STRATEGIC ALIGNMENT:
   • Current Phase: [from ROADMAP]
   • Quality Goals: [from ROADMAP]
   • Baseline Established: [YES / Updated from previous]
   • Phase Impact: [how findings affect phase completion]
   • Priority: [whether critical issues block phase goals]

📋 DETAILED REPORT:
   • Full bug report with remediation guidance provided above
   • Each issue includes: ID, severity, confidence, location, fix suggestion
   • Issues grouped by: Severity (CRITICAL → LOW)
   • Categories: Security, Memory, Logic, Concurrency, Quality

⚠️ CRITICAL ACTIONS REQUIRED (if any):
   [List CRITICAL and HIGH severity issues that must be addressed:]
   1. [SEC-001]: Fix SQL injection in [file] (CRITICAL)
   2. [MEM-003]: Fix memory leak in [component] (HIGH)
   3. [LOG-007]: Add null check in [function] (HIGH)

🚀 NEXT STEPS:
   1. Review all CRITICAL issues immediately (from TODO.md)
   2. Triage HIGH severity issues with team
   3. Create tickets for validated bugs
   4. Update coding standards based on findings
   5. Re-run /bughunter periodically to track progress

📈 QUALITY TREND (if baseline exists):
   • Previous Bug Count: [from STATUS.md baseline]
   • Current Bug Count: [new count]
   • Change: [+/-N] bugs ([+/-percentage]%)
   • Security Issues: [previous] → [current]
   • Code Quality: [improving / declining / stable]

═══════════════════════════════════════════════════════════
```

**Note**: If organization files don't exist, generate standard bug report without organization context and trending data.

---

## Execution Start

Begin with **Step 0: Context & Organization Check**, then proceed through each step sequentially.
