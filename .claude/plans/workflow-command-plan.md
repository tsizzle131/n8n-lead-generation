# Plan: /workflow - Intelligent Command Orchestration

## Objective

Create a powerful meta-command `/workflow` that intelligently orchestrates all existing commands (`/research`, `/build`, `/testgen`, `/bughunter`, `/refactor`, `/optimize`, `/explain`, `/document`) in an optimal order to complete tasks and projects in a single execution.

## Concept

The `/workflow` command acts as an intelligent conductor that:
1. Analyzes the user's request
2. Determines which commands are needed
3. Executes them in optimal order
4. Passes outputs between commands
5. Provides comprehensive final results

## Command Design

### Name
`/workflow` - Complete end-to-end task execution

### Arguments
`TASK: $ARGUMENTS` - Can be:
- Feature request: "implement user authentication"
- Improvement request: "improve performance of dashboard"
- Bug fix request: "fix memory leak in API"
- Onboarding request: "explain the codebase"
- Quality request: "improve code quality"
- General request: "build a REST API"

### Intelligence Layer

The command includes a smart router that determines the optimal workflow based on task type:

**1. New Feature Development**
```
/research → /build → /testgen → /refactor → /optimize → /document
```

**2. Bug Fixing**
```
/bughunter → /explain (context) → /build (fix) → /testgen → /document
```

**3. Code Quality Improvement**
```
/bughunter → /refactor → /testgen → /optimize → /document
```

**4. Performance Optimization**
```
/optimize → /testgen → /bughunter → /document
```

**5. Onboarding/Learning**
```
/explain → /document
```

**6. Legacy Code Modernization**
```
/explain → /bughunter → /refactor → /testgen → /optimize → /document
```

## Workflow Structure

### Wave 1: Task Analysis & Planning
- Parse TASK to understand intent
- Classify task type (feature, bug, quality, performance, learning)
- Determine command sequence
- Estimate duration and complexity
- Display execution plan to user

### Wave 2: Research & Understanding (if needed)
- Execute `/research` or `/explain` based on task type
- Gather context about the codebase
- Output: Research summary or explanation

### Wave 3: Issue Detection (if needed)
- Execute `/bughunter` to identify issues
- Output: Bug report, prioritized issues

### Wave 4: Implementation
- Execute `/build` with research/bug findings
- Output: Implemented code

### Wave 5: Quality Assurance
- Execute `/testgen` to generate tests
- Execute `/refactor` to improve code quality
- Execute `/optimize` for performance
- Output: Quality improvements

### Wave 6: Documentation & Knowledge
- Execute `/document` to generate docs
- Output: Comprehensive documentation

### Wave 7: Final Report
- Consolidate all command outputs
- Generate comprehensive summary
- Provide next steps

## Key Features

### Intelligent Routing
- Analyzes task intent using NLP-like classification
- Determines optimal command sequence
- Skips unnecessary commands
- Adapts based on codebase state

### Command Chaining
- Passes outputs between commands
- Uses research findings in build
- Uses bug findings to guide fixes
- Uses explanations to inform refactoring

### Progress Tracking
- Shows current command execution
- Displays overall progress (Step 3/6)
- Estimates time remaining
- Allows cancellation

### Error Recovery
- Graceful degradation if a command fails
- Continues with remaining workflow
- Reports what was completed vs. skipped

### Adaptive Execution
- Small tasks: Fast track (fewer commands)
- Large tasks: Full workflow
- Critical bugs: Priority on fixes
- Performance issues: Focus on optimization

## Task Type Detection

### Feature Development Pattern
Keywords: "implement", "add", "create", "build", "new feature"
Workflow: Research → Build → Test → Refactor → Optimize → Document

### Bug Fix Pattern
Keywords: "fix", "bug", "error", "issue", "broken", "not working"
Workflow: BugHunter → Explain → Build (fix) → Test → Document

### Quality Improvement Pattern
Keywords: "improve", "refactor", "clean up", "code quality", "technical debt"
Workflow: BugHunter → Refactor → Test → Optimize → Document

### Performance Pattern
Keywords: "slow", "performance", "optimize", "faster", "speed up"
Workflow: Optimize → Test → BugHunter → Document

### Learning/Onboarding Pattern
Keywords: "explain", "understand", "how does", "what is", "documentation"
Workflow: Explain → Document

### Comprehensive Pattern
Keywords: "complete", "full", "end-to-end", "everything", "all"
Workflow: All commands in sequence

## Example Workflows

### Example 1: "implement user authentication"
```
Step 1: Task Classification → Feature Development
Step 2: /research "user authentication patterns" → Generate plan
Step 3: /build <plan> → Implement auth
Step 4: /testgen src/auth/ → Generate tests
Step 5: /refactor src/auth/ → Improve code quality
Step 6: /optimize src/auth/ → Optimize performance
Step 7: /document src/auth/ → Generate docs
Result: Complete, tested, optimized, documented auth system
```

### Example 2: "fix memory leak in dashboard"
```
Step 1: Task Classification → Bug Fix
Step 2: /bughunter src/dashboard/ → Find memory leaks
Step 3: /explain src/dashboard/ → Understand component
Step 4: /build <fix plan> → Implement fix
Step 5: /testgen src/dashboard/ → Add regression tests
Step 6: /document src/dashboard/ → Document fix
Result: Fixed, tested, documented memory leak
```

### Example 3: "improve code quality"
```
Step 1: Task Classification → Quality Improvement
Step 2: /bughunter src/ → Find all issues
Step 3: /refactor src/ → Fix code smells
Step 4: /testgen src/ → Increase coverage
Step 5: /optimize src/ → Improve performance
Step 6: /document src/ → Update docs
Result: High-quality, tested, optimized, documented codebase
```

## Implementation Requirements

### Multi-Wave Structure
- 7 waves minimum
- Each wave can execute 1-3 commands
- Clear synchronization between waves
- Output consolidation after each wave

### Command Execution
- Use SlashCommand tool to execute other commands
- Capture command outputs
- Pass relevant context to next command
- Handle command failures gracefully

### Progress Reporting
- Real-time status updates
- Command completion notifications
- Overall progress percentage
- ETA for completion

### Final Report Format
```markdown
# Workflow Execution Report

## Task
[Original task description]

## Execution Plan
[Commands executed in order]

## Results Summary
- Research: [Key findings]
- Build: [What was built]
- Testing: [Coverage and results]
- Refactoring: [Improvements made]
- Optimization: [Performance gains]
- Documentation: [Docs generated]

## Quality Metrics
- Test Coverage: [percentage]
- Code Quality Score: [before → after]
- Performance Improvement: [percentage]
- Bugs Fixed: [count]

## Files Modified
[List of changed files]

## Next Steps
[Recommended follow-up actions]
```

## Success Criteria

- Correctly classifies 90%+ of task types
- Executes commands in logical order
- Passes context between commands
- Handles errors gracefully
- Provides comprehensive final report
- Saves 80%+ of manual workflow orchestration time
- Works for simple and complex tasks
- Adapts to different project types

## Target Specifications

- **File**: `.claude/commands/workflow.md`
- **Size**: 1200-1500 lines (comprehensive)
- **Waves**: 7-8 waves
- **Command Integration**: All 8 existing commands
- **Error Handling**: Comprehensive
- **Documentation**: Extensive examples

## Estimated Impact

**Time Savings**:
- Feature development: 2-3 hours → 15-30 minutes
- Bug fixing: 1-2 hours → 10-20 minutes
- Code quality: 3-5 hours → 20-40 minutes
- Onboarding: 2-4 hours → 10-15 minutes

**Productivity Gain**: 5-10x for complete workflows

This meta-command will be the **most powerful** command in the system, orchestrating all others for maximum efficiency.
