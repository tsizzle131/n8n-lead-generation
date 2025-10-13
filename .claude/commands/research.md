---
description: Research a topic, synthesize conclusions, and generate implementation plans
argument-hint: [topic]
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task, WebSearch
model: claude-sonnet-4-5-20250929
---

# Research

Orchestrate a sophisticated multi-wave agent workflow to thoroughly research a topic across codebase and external knowledge sources, synthesize findings into actionable conclusions, and generate a detailed implementation plan. This command uses parallel agent execution within waves, with synchronization points between phases to ensure comprehensive coverage and accurate synthesis.

## Variables

RESEARCH_TOPIC: $ARGUMENTS

## Workflow

### Wave 0: Context & Organization Check

**Purpose**: Read organization files to understand project context and active tasks before researching.

**Steps**:
1. **Read organization files** (if they exist):
   - Read `TODO.md` - Check for active tasks related to RESEARCH_TOPIC
   - Read `STATUS.md` - Understand project state, current phase, existing research
   - Read `ROADMAP.md` - Identify current phase and strategic goals this research serves

2. **Extract context**:
   - **Active Tasks**: Any TODO items mentioning similar research or related work
   - **Project Phase**: Current phase from ROADMAP.md
   - **Related Work**: Prior research or implementations in STATUS.md
   - **Strategic Alignment**: Which ROADMAP objectives this research supports

3. **Store context** for use throughout research workflow

**Note**: If organization files don't exist, proceed without context (graceful degradation).

---

### Wave 1: Validation & Scoping

**Purpose**: Validate input and establish research boundaries before proceeding.

**Steps**:
1. If `RESEARCH_TOPIC` is empty or not provided:
   - Display clear error: "Error: No research topic provided. Please specify what you want to research."
   - Show usage example: "Usage: /research [topic]"
   - Show examples: "/research authentication patterns", "/research database migration strategy", "/research React state management"
   - STOP immediately
2. Analyze the research topic to classify research type:
   - **Codebase-focused**: Topic relates to existing code patterns, architecture, or implementation details (e.g., "authentication flow", "API error handling", "testing patterns")
   - **External knowledge**: Topic requires external information not in codebase (e.g., "OAuth 2.0 best practices", "PostgreSQL connection pooling", "React 18 features")
   - **Hybrid**: Combination of both (e.g., "migrate to React 18", "implement OAuth", "optimize database queries")
3. Display research scope to user:
   - "Researching: [RESEARCH_TOPIC]"
   - "Research Type: [Codebase-focused / External knowledge / Hybrid]"
   - "Context: [Phase from ROADMAP if available]"
   - "Starting multi-domain research across 4 parallel agents..."

---

### Wave 1.5: Update Tracking - Research Started

**Purpose**: Mark research as in-progress in organization files.

**Steps**:
1. **Update TODO.md** (if exists):
   - Find TODO item related to this research
   - If found: Change `[ ]` to `[▶]` (mark as in progress)
   - If not found: Add new item: `[▶] Research [TOPIC] (Started: [timestamp])`

2. **Update STATUS.md** (if exists):
   - Add to current work section:
     ```markdown
     ## 🔬 Active Research
     - **[RESEARCH_TOPIC]** - In Progress
       - Started: [timestamp]
       - Type: [Codebase-focused/External/Hybrid]
       - Phase: [Current phase from ROADMAP]
     ```

**Note**: If organization files don't exist, skip this step.

---

### 2. Multi-Domain Research Wave (Parallel Reconnaissance)

**Purpose**: Conduct comprehensive research across multiple domains simultaneously to gather all relevant information.

Launch 4 agents **IN PARALLEL** (single message with multiple Task calls):

**Agent 1 - Codebase Pattern Agent**

Search source code files for patterns, implementations, and examples related to RESEARCH_TOPIC.

**Tasks**:
- Use Glob to identify relevant source files:
  - Common source patterns: `**/*.js`, `**/*.ts`, `**/*.tsx`, `**/*.jsx`, `**/*.py`, `**/*.java`, `**/*.go`, `**/*.rb`, `**/*.php`, `**/*.cs`, `**/*.cpp`, `**/*.rs`
  - Exclude patterns: `**/node_modules/**`, `**/dist/**`, `**/build/**`, `**/.git/**`, `**/vendor/**`, `**/target/**`, `**/__pycache__/**`
- Use Grep with topic-relevant patterns to find implementations:
  - For authentication research: `auth`, `login`, `token`, `session`, `passport`, `jwt`, `oauth`
  - For database research: `query`, `SELECT`, `INSERT`, `connection`, `pool`, `transaction`, `migrate`
  - For API research: `@route`, `@api`, `fetch`, `axios`, `request`, `endpoint`, `controller`
  - For state management: `useState`, `redux`, `store`, `context`, `state`, `dispatch`
  - For testing: `test(`, `describe(`, `it(`, `expect(`, `assert`, `mock`
  - Adapt patterns based on RESEARCH_TOPIC semantics
- Use Grep with case-insensitive search (-i flag) to capture variations
- Read top 5-10 most relevant files to extract implementation details
- Analyze code patterns, approaches, conventions used
- Identify:
  - How is this currently implemented in the codebase?
  - What libraries/frameworks are being used?
  - What patterns and conventions are followed?
  - Are there multiple implementations or approaches?
  - What works well? What could be improved?

**Output**: Structured findings including:
- Files analyzed: count and list of top files
- Current implementations found: descriptions with file paths and line numbers
- Libraries/frameworks detected: names and usage patterns
- Code patterns observed: common approaches, conventions, best practices
- Gaps identified: missing implementations, inconsistencies, opportunities
- Code snippets: relevant examples with context (5-10 lines each)

**Agent 2 - Documentation Agent**

Search documentation, README files, comments, and markdown files for information about RESEARCH_TOPIC.

**Tasks**:
- Use Glob to find documentation files:
  - Patterns: `**/*.md`, `**/README*`, `**/CONTRIBUTING*`, `**/docs/**/*`, `**/documentation/**/*`, `**/*.rst`, `**/*.txt`
- Use Grep to search documentation for topic-relevant terms:
  - Search for RESEARCH_TOPIC directly
  - Search for related terms (e.g., if researching "authentication", also search: "auth", "login", "security", "access control")
  - Use case-insensitive search (-i flag)
- Read relevant documentation files (top 5-10 matches)
- Search inline code comments for explanations:
  - Grep for `// *RESEARCH_TOPIC`, `# *RESEARCH_TOPIC`, `/* *RESEARCH_TOPIC`
  - Look for JSDoc, docstrings, XML comments containing topic keywords
- Analyze documentation quality and coverage
- Identify:
  - What is already documented about this topic?
  - Are there architecture decisions or design docs?
  - What context or background information exists?
  - Are there usage examples or tutorials?
  - What is missing from documentation?

**Output**: Structured findings including:
- Documentation files found: count and list
- Documented concepts: summaries of what's documented
- Architecture decisions: relevant ADRs or design rationale
- Usage examples: code examples from docs with file paths
- Documentation gaps: what needs better documentation
- Key insights: important context from documentation

**Agent 3 - Configuration Agent**

Search configuration files, dependency manifests, and environment settings related to RESEARCH_TOPIC.

**Tasks**:
- Use Glob to find configuration files:
  - Package manifests: `package.json`, `requirements.txt`, `Gemfile`, `go.mod`, `pom.xml`, `build.gradle`, `composer.json`, `Cargo.toml`
  - Config files: `**/*.config.js`, `**/*.config.ts`, `**/config/**/*`, `**/.env*`, `**/*.yaml`, `**/*.yml`, `**/*.toml`, `**/*.ini`, `**/*.conf`
  - Build configs: `webpack.config.*`, `vite.config.*`, `rollup.config.*`, `tsconfig.json`, `.babelrc`, `babel.config.*`
- Use Grep to search configurations for topic-relevant settings:
  - Search for RESEARCH_TOPIC keywords in config files
  - Look for related dependencies (e.g., if researching "authentication", search for: "passport", "jwt", "oauth", "auth0", "okta")
  - Search environment variables for related settings
- Read relevant configuration files (top 5-10)
- Identify:
  - What dependencies are installed related to this topic?
  - What configuration options are set?
  - Are there environment-specific configurations?
  - What third-party services or integrations are configured?
  - What versions are being used?

**Output**: Structured findings including:
- Configuration files analyzed: count and list
- Dependencies found: relevant packages/libraries with versions
- Configuration settings: key configs related to topic
- Environment variables: relevant env vars and their purpose
- Third-party integrations: external services configured
- Version information: current versions of related tools
- Configuration patterns: how settings are organized and managed

**Agent 4 - Test & Example Agent**

Search test files, example code, and sample implementations related to RESEARCH_TOPIC.

**Tasks**:
- Use Glob to find test files:
  - Patterns: `**/*.test.js`, `**/*.test.ts`, `**/*.spec.js`, `**/*.spec.ts`, `**/test/**/*`, `**/tests/**/*`, `**/__tests__/**/*`, `**/spec/**/*`
  - Python: `**/test_*.py`, `**/*_test.py`
  - Go: `**/*_test.go`
  - Java: `**/src/test/**/*.java`
- Use Glob to find example files:
  - Patterns: `**/examples/**/*`, `**/samples/**/*`, `**/demo/**/*`, `**/playground/**/*`
- Use Grep to search tests for topic-relevant test cases:
  - Search for RESEARCH_TOPIC keywords in test descriptions
  - Look for test patterns: `describe('TOPIC`, `it('should TOPIC`, `test('TOPIC`
- Read relevant test files (top 5-10)
- Analyze test coverage and approaches
- Identify:
  - How is this functionality tested?
  - What test patterns and frameworks are used?
  - What edge cases are covered in tests?
  - Are there integration tests or only unit tests?
  - Are there example implementations or demos?
  - What usage patterns do tests reveal?

**Output**: Structured findings including:
- Test files found: count and list
- Testing frameworks: what's used for testing (Jest, Pytest, JUnit, etc.)
- Test coverage: what aspects are tested
- Test patterns: how tests are structured and organized
- Edge cases: important edge cases from tests
- Example code: relevant examples with file paths
- Usage patterns: how the topic is actually used based on tests
- Testing gaps: what's not tested but should be

**Critical**: Wait for ALL 4 agents to complete before proceeding. This is a synchronization point.

**Consolidation Step** (1500-2000 tokens):
After all 4 agents complete, synthesize their findings into a comprehensive research summary:

1. **Codebase State**: What exists currently related to RESEARCH_TOPIC
   - Current implementations and their locations
   - Libraries and frameworks in use
   - Code patterns and conventions
   - Configuration and dependencies

2. **Knowledge Base**: What is documented and understood
   - Documentation coverage
   - Architecture decisions
   - Test coverage and quality
   - Example implementations

3. **Gaps & Opportunities**: What's missing or could be improved
   - Implementation gaps
   - Documentation needs
   - Testing gaps
   - Configuration improvements
   - Inconsistencies or technical debt

4. **Context**: Important contextual information
   - Project technology stack
   - Coding conventions
   - Architecture patterns
   - Constraints and requirements

This consolidated research summary will inform the next wave.

---

### 3. Synthesis & Conclusion Wave (Deep Analysis)

**Purpose**: Analyze all research findings to synthesize optimal approach and generate actionable conclusions.

Launch 1 specialized synthesis agent:

**Agent - Research Synthesizer**

Analyze the consolidated research findings from Wave 2 to produce comprehensive conclusions.

**Tasks**:
1. **Review all research findings**:
   - Codebase patterns discovered
   - Documentation insights
   - Configuration and dependencies
   - Test coverage and examples
   - Identified gaps and opportunities

2. **Synthesize optimal approach**:
   - What is the recommended approach for this topic?
   - Should we leverage existing patterns or introduce new ones?
   - What libraries/frameworks should be used?
   - How does this fit into existing architecture?
   - What are the tradeoffs of different approaches?

3. **Identify key requirements**:
   - Functional requirements: what must be accomplished
   - Non-functional requirements: performance, security, scalability
   - Compatibility requirements: with existing code, APIs, data
   - Testing requirements: what tests are needed
   - Documentation requirements: what needs documentation

4. **Analyze technical constraints**:
   - Technology stack limitations
   - Existing dependencies and versions
   - Architecture boundaries and patterns
   - Performance considerations
   - Security requirements
   - Team expertise and conventions

5. **Define success criteria**:
   - What does successful implementation look like?
   - How will we measure success?
   - What are the acceptance criteria?
   - What are the quality gates?

6. **Prioritize implementation work**:
   - Break down into phases or milestones
   - Identify dependencies between components
   - Determine critical path
   - Highlight quick wins vs. long-term work
   - Risk assessment for each component

**Output**: Comprehensive conclusion document (2000-3000 tokens) with these sections:

```markdown
# Research Conclusions: [RESEARCH_TOPIC]

## Executive Summary
[2-3 paragraph overview of findings and recommendations]

## Recommended Approach

### Primary Strategy
[Detailed description of the recommended approach with rationale]

### Alternative Approaches Considered
[Other options evaluated and why they weren't chosen]

### Technology Selection
- **Libraries/Frameworks**: [specific tools to use]
- **Languages/Technologies**: [relevant tech choices]
- **Versions**: [specific version requirements]
- **Rationale**: [why these choices]

## Key Requirements

### Functional Requirements
1. [Requirement 1 with acceptance criteria]
2. [Requirement 2 with acceptance criteria]
3. [...]

### Non-Functional Requirements
- **Performance**: [specific metrics or goals]
- **Security**: [security considerations and requirements]
- **Scalability**: [scalability needs]
- **Maintainability**: [code quality and maintenance needs]
- **Accessibility**: [if applicable]

### Compatibility Requirements
- **API Compatibility**: [backward compatibility needs]
- **Data Compatibility**: [data migration or format requirements]
- **Integration Points**: [systems that need to integrate]

## Technical Constraints

### Technology Stack
- [Constraint 1: e.g., Must use React 17 (not 18) due to dependency X]
- [Constraint 2: e.g., Database migrations must be reversible]
- [...]

### Architecture Boundaries
- [Constraint: e.g., Must maintain separation between auth and business logic]
- [Constraint: e.g., Cannot modify core API contracts]

### Performance Considerations
- [Constraint: e.g., API response time must be < 200ms]
- [Constraint: e.g., Support 10K concurrent users]

### Security Requirements
- [Constraint: e.g., Must comply with OWASP Top 10]
- [Constraint: e.g., PII must be encrypted at rest]

## Success Criteria

### Definition of Done
- [ ] [Criterion 1: e.g., All functional requirements implemented]
- [ ] [Criterion 2: e.g., Test coverage > 80%]
- [ ] [Criterion 3: e.g., Performance benchmarks met]
- [ ] [Criterion 4: e.g., Security audit passed]
- [ ] [Criterion 5: e.g., Documentation complete]

### Quality Gates
- **Code Review**: [what must be reviewed]
- **Testing**: [what tests must pass]
- **Performance**: [what metrics must be met]
- **Security**: [what security checks must pass]

### Measurable Outcomes
- [Metric 1: e.g., Reduce authentication time by 50%]
- [Metric 2: e.g., Zero security vulnerabilities]
- [...]

## Implementation Priorities

### Phase 1: Foundation (High Priority)
**Goal**: [What Phase 1 accomplishes]
**Components**:
1. [Component 1 with brief description]
2. [Component 2 with brief description]
**Dependencies**: [What must exist before starting]
**Risk Level**: [Low/Medium/High]

### Phase 2: Core Features (High Priority)
**Goal**: [What Phase 2 accomplishes]
**Components**:
1. [Component 1 with brief description]
2. [Component 2 with brief description]
**Dependencies**: [What must be completed first]
**Risk Level**: [Low/Medium/High]

### Phase 3: Enhancement (Medium Priority)
**Goal**: [What Phase 3 accomplishes]
**Components**:
1. [Component 1 with brief description]
2. [Component 2 with brief description]
**Dependencies**: [What must be completed first]
**Risk Level**: [Low/Medium/High]

### Phase 4: Optimization (Low Priority)
**Goal**: [What Phase 4 accomplishes]
**Components**:
1. [Component 1 with brief description]
2. [Component 2 with brief description]
**Dependencies**: [What must be completed first]
**Risk Level**: [Low/Medium/High]

## Risk Assessment

### High Risks
- **Risk 1**: [Description, Impact, Mitigation]
- **Risk 2**: [Description, Impact, Mitigation]

### Medium Risks
- **Risk 1**: [Description, Impact, Mitigation]

### Assumptions
- [Assumption 1: e.g., Team has React expertise]
- [Assumption 2: e.g., Database can handle additional load]

## Architecture Considerations

### Design Patterns
- [Pattern 1: e.g., Use Repository pattern for data access]
- [Pattern 2: e.g., Use Strategy pattern for authentication methods]

### Integration Points
- [Integration 1: How this connects with System A]
- [Integration 2: How this connects with System B]

### Data Flow
[Description of how data flows through the system]

### Error Handling
[Approach to error handling and resilience]

## Testing Strategy

### Unit Testing
- [What needs unit tests]
- [Coverage target]
- [Key scenarios]

### Integration Testing
- [What needs integration tests]
- [Key integration points]

### End-to-End Testing
- [Critical user flows]
- [Acceptance scenarios]

### Performance Testing
- [Load testing requirements]
- [Stress testing scenarios]

### Security Testing
- [Security test cases]
- [Penetration testing needs]

## Documentation Requirements

### Code Documentation
- [Inline comment requirements]
- [API documentation needs]

### User Documentation
- [User guides needed]
- [README updates]

### Architecture Documentation
- [Architecture diagrams]
- [Decision records (ADRs)]

## Migration Strategy
[If applicable: how to migrate from current state to target state]

## Rollback Plan
[If applicable: how to rollback if implementation fails]

## Next Steps
1. [Immediate next action]
2. [Second action]
3. [Third action]
```

**Critical**: Wait for synthesis agent to complete the conclusion document before proceeding to Wave 4.

---

### 4. Prompt Engineering Wave (Build Plan Generation)

**Purpose**: Transform research conclusions into a detailed, actionable build plan that can be executed by the /build command.

Launch 1 specialized prompt engineering agent:

**Agent - Build Plan Engineer**

Transform the synthesis conclusions into a comprehensive build plan suitable for the /build slash command.

**Tasks**:
1. **Review the conclusion document** from Wave 3
2. **Generate build plan** with these essential sections:
   - **Objective**: Clear statement of what will be built
   - **Context**: Background and rationale from research
   - **Requirements**: Detailed functional and non-functional requirements
   - **Architecture**: High-level design and component structure
   - **Implementation Details**: Specific tasks broken down by component
   - **File Structure**: What files will be created/modified
   - **Testing Plan**: Comprehensive testing approach
   - **Success Criteria**: How to verify completion
   - **References**: Links to relevant documentation, examples, or external resources
3. **Generate timestamp** for unique filename: YYYYMMDD-HHMMSS format
4. **Save build plan** to: `.claude/plans/research-[TIMESTAMP].md`
   - Ensure `.claude/plans/` directory exists, create if needed
   - Use Write tool to create the plan file
5. **Display plan path** to user with clear message

**Output**: A comprehensive build plan markdown file that includes:

```markdown
# Build Plan: [RESEARCH_TOPIC]

**Generated**: [Full timestamp]
**Research Date**: [Date]
**Plan Type**: Research-Driven Implementation

---

## Objective

[Clear, concise statement of what will be built - 2-3 sentences]

## Context

### Research Summary
[2-3 paragraphs summarizing the research findings that led to this plan]

### Current State
[What exists today related to this topic]

### Target State
[What will exist after implementation]

### Rationale
[Why this approach was chosen based on research]

## Requirements

### Functional Requirements
1. **[Requirement Name]**
   - Description: [Detailed description]
   - Acceptance Criteria:
     - [ ] [Criterion 1]
     - [ ] [Criterion 2]
   - Priority: [High/Medium/Low]

2. **[Requirement Name]**
   [Same structure]

### Non-Functional Requirements
1. **Performance**
   - [Specific metric or goal]
   - Measurement: [How to measure]

2. **Security**
   - [Specific requirement]
   - Validation: [How to validate]

3. **Scalability**
   - [Specific requirement]

4. **Maintainability**
   - [Specific requirement]

### Compatibility Requirements
- **API Compatibility**: [Requirements]
- **Data Compatibility**: [Requirements]
- **Browser/Platform Support**: [Requirements]

## Architecture

### High-Level Design

[Describe the overall architecture, major components, and how they interact]

### Component Structure

**Component 1: [Name]**
- Purpose: [What it does]
- Responsibilities: [Specific responsibilities]
- Dependencies: [What it depends on]
- Interfaces: [Public API/interface]

**Component 2: [Name]**
[Same structure]

### Data Model

[If applicable, describe data structures, schemas, or models]

### Design Patterns

- **Pattern 1**: [Pattern name and where it's applied]
- **Pattern 2**: [Pattern name and where it's applied]

### Technology Stack

- **Languages**: [Specific languages and versions]
- **Frameworks**: [Specific frameworks and versions]
- **Libraries**: [Key libraries to use]
- **Tools**: [Development and build tools]

## Implementation Details

### Phase 1: Foundation

**Goal**: [What this phase accomplishes]

**Tasks**:
1. **Task 1.1**: [Specific task]
   - Files to create/modify: [List files]
   - Key changes: [What changes]
   - Dependencies: [Prerequisites]
   - Estimated complexity: [Low/Medium/High]

2. **Task 1.2**: [Specific task]
   [Same structure]

**Deliverables**:
- [ ] [Deliverable 1]
- [ ] [Deliverable 2]

**Validation**:
- [ ] [How to verify Phase 1 is complete]

### Phase 2: Core Implementation

[Same structure as Phase 1]

### Phase 3: Integration & Testing

[Same structure as Phase 1]

### Phase 4: Documentation & Polish

[Same structure as Phase 1]

## File Structure

### Files to Create
```
path/to/new/file1.js
path/to/new/file2.ts
path/to/new/file3.py
```

### Files to Modify
```
path/to/existing/file1.js (add function X, update class Y)
path/to/existing/file2.ts (refactor method Z)
```

### Files to Delete
```
path/to/deprecated/file.js (obsolete after refactor)
```

## Testing Plan

### Unit Tests

**Component 1 Tests**:
- Test file: `path/to/component1.test.js`
- Test cases:
  - [ ] [Test case 1: description]
  - [ ] [Test case 2: description]
  - [ ] [Test case 3: edge case]

**Component 2 Tests**:
[Same structure]

### Integration Tests

**Integration Scenario 1**:
- Test file: `path/to/integration1.test.js`
- Scenario: [Description of what's being tested]
- Setup: [Required setup]
- Validation: [What to verify]

### End-to-End Tests

**E2E Flow 1**:
- Description: [User flow being tested]
- Steps: [Step-by-step test procedure]
- Expected outcome: [What should happen]

### Performance Tests

- **Test 1**: [Performance scenario]
  - Target metric: [Specific goal]
  - Measurement: [How to measure]

### Security Tests

- **Test 1**: [Security scenario]
  - Risk: [What risk this tests]
  - Validation: [How to validate security]

## Success Criteria

### Definition of Done

- [ ] All functional requirements implemented and validated
- [ ] All unit tests written and passing (coverage > [X]%)
- [ ] All integration tests written and passing
- [ ] Performance benchmarks met
- [ ] Security review completed, no critical issues
- [ ] Code review completed and approved
- [ ] Documentation complete (inline, API, user guide)
- [ ] No regressions in existing functionality
- [ ] Build passes in CI/CD pipeline

### Quality Gates

**Pre-Merge Checklist**:
- [ ] [Quality gate 1]
- [ ] [Quality gate 2]
- [ ] [Quality gate 3]

### Acceptance Criteria

**For Product Owner**:
- [ ] [Business criterion 1]
- [ ] [Business criterion 2]

**For Technical Lead**:
- [ ] [Technical criterion 1]
- [ ] [Technical criterion 2]

## Risk Mitigation

### Identified Risks

**Risk 1: [Risk name]**
- Probability: [High/Medium/Low]
- Impact: [High/Medium/Low]
- Mitigation: [How to mitigate]
- Contingency: [Fallback plan]

**Risk 2: [Risk name]**
[Same structure]

## Dependencies

### External Dependencies
- [Dependency 1: what it is and why needed]
- [Dependency 2: what it is and why needed]

### Internal Dependencies
- [Dependency 1: what must be completed first]
- [Dependency 2: what must exist]

### Team Dependencies
- [Dependency 1: who needs to be involved]

## Migration Strategy

[If applicable]

**Current State → Target State**:
1. [Migration step 1]
2. [Migration step 2]
3. [Migration step 3]

**Rollback Procedure**:
1. [Rollback step 1]
2. [Rollback step 2]

## Documentation

### Code Documentation
- Inline comments: [Standards and what needs commenting]
- API documentation: [What APIs need docs]
- JSDoc/Docstrings: [What functions need docs]

### User Documentation
- README updates: [What sections to add/update]
- User guide: [If new user-facing features]
- Migration guide: [If breaking changes]

### Architecture Documentation
- Architecture diagrams: [What diagrams to create]
- ADRs (Architecture Decision Records): [Key decisions to document]
- Sequence diagrams: [If complex interactions]

## References

### Research Findings
- Codebase patterns analyzed: [Key files examined]
- Configuration reviewed: [Key configs]
- Tests examined: [Key test files]

### External Resources
- [Link 1: Documentation]
- [Link 2: Best practices article]
- [Link 3: Example implementation]

### Related Work
- [Related feature/component 1]
- [Related feature/component 2]

## Timeline Estimate

**Phase 1**: [X days/weeks]
**Phase 2**: [X days/weeks]
**Phase 3**: [X days/weeks]
**Phase 4**: [X days/weeks]

**Total Estimated**: [X days/weeks]

**Note**: These are rough estimates. Actual time may vary based on unforeseen complexity, dependencies, and team velocity.

## Next Steps

1. **Immediate**: [First action to take]
2. **Short-term**: [Next 1-2 actions]
3. **Before implementation**: [Preparations needed]

---

**This plan is ready to be executed using**: `/build .claude/plans/research-[TIMESTAMP].md`
```

**Critical**: Wait for build plan engineer to complete and save the file before proceeding to final output.

---

### Wave 5: Update Organization Files & Summary

**Purpose**: Update TODO.md, STATUS.md, and ROADMAP.md with research results and generate comprehensive summary.

**Steps**:

1. **Update TODO.md** (if exists):
   - Mark research task as completed: Change `[▶]` to `[x]`
   - Add completion timestamp
   - Move to "Completed Recently" section
   - Add new tasks discovered from research plan:
     ```markdown
     ## ✅ Completed Recently
     - [x] Research [TOPIC] (Completed: [timestamp])
       - Plan generated: .claude/plans/research-[TIMESTAMP].md
       - Findings: [X] files analyzed, [Y] key insights

     ## 📋 Up Next
     - [ ] Review research plan: .claude/plans/research-[TIMESTAMP].md
     - [ ] Execute implementation: /build .claude/plans/research-[TIMESTAMP].md
     - [ ] [Additional tasks from research]
     ```

2. **Update STATUS.md** (if exists):
   - Remove from "Active Research" section
   - Add to "Recent Research Completed" section:
     ```markdown
     ## 🔬 Research Completed
     - **[RESEARCH_TOPIC]** - Completed [date]
       - Files analyzed: [count]
       - Documentation reviewed: [count]
       - Plan generated: .claude/plans/research-[TIMESTAMP].md
       - Validation score: [score]/100
       - Key findings: [brief summary]
       - Ready for: /build command
     ```
   - Update project metrics if applicable

3. **Update ROADMAP.md** (if exists):
   - Check if research completes any phase objectives
   - Mark relevant objectives as complete: `[ ]` → `[x]`
   - Update phase progress percentage if changed
   - Add research reference to relevant phase:
     ```markdown
     ### Phase 1: [Name]
     **Progress:** [updated percentage]
     - [x] Research [TOPIC] (Completed: [date])
       - Plan: .claude/plans/research-[TIMESTAMP].md
     ```

4. **Generate Integrated Summary**:

Display comprehensive summary referencing all organization files:

```
═══════════════════════════════════════════════════════════
✓ RESEARCH COMPLETE: [RESEARCH_TOPIC]
═══════════════════════════════════════════════════════════

📊 RESEARCH SUMMARY:
   • Files analyzed: [count]
   • Documentation reviewed: [count]
   • Configurations examined: [count]
   • Tests reviewed: [count]
   • Research type: [Codebase-focused/External/Hybrid]

🎯 KEY FINDINGS:
   1. [Finding 1 - one sentence]
   2. [Finding 2 - one sentence]
   3. [Finding 3 - one sentence]

✅ CONCLUSIONS SYNTHESIZED:
   • Recommended approach: [brief summary]
   • Key requirements: [count] identified
   • Implementation phases: [count] defined
   • Risk level: [Low/Medium/High]

📋 BUILD PLAN GENERATED:
   • Location: .claude/plans/research-[TIMESTAMP].md
   • Sections: [count]
   • Estimated effort: [timeline from plan]

📁 ORGANIZATION FILES UPDATED:
   • TODO.md: Task marked complete, [X] new tasks added
   • STATUS.md: Research results recorded
   • ROADMAP.md: [Phase progress updated / No phase impact]

🎯 STRATEGIC ALIGNMENT:
   • Current Phase: [phase from ROADMAP]
   • Phase Progress: [X%] → [Y%]
   • Objectives Completed: [list if any]
   • Next Milestone: [from ROADMAP]

🚀 NEXT STEPS:
   1. Review plan: cat .claude/plans/research-[TIMESTAMP].md
   2. Execute plan: /build .claude/plans/research-[TIMESTAMP].md
   3. [Additional next steps from TODO.md]

═══════════════════════════════════════════════════════════
```

**Note**: If organization files don't exist, only display the research summary without organization file updates section.

---

## Execution Guidelines

### Parallelization Rules

**Within Wave 2 (Research Wave)**: Always launch all 4 agents in a SINGLE message with multiple Task tool calls. This is critical for performance.

Example:
```
Launching 4 research agents in parallel:
- Agent 1: Codebase Pattern Agent (searching source files...)
- Agent 2: Documentation Agent (searching docs and comments...)
- Agent 3: Configuration Agent (analyzing configs and dependencies...)
- Agent 4: Test & Example Agent (examining tests and examples...)
```

**Between Waves**: ALWAYS wait for all agents in current wave to complete before starting the next wave. Synthesize findings between waves.

### Context Management Strategy

**After Wave 2 (Research Wave)**:
1. Consolidate all 4 agent outputs into a concise research summary (1500-2000 tokens max)
2. Structure summary into clear sections: Codebase State, Knowledge Base, Gaps & Opportunities, Context
3. Remove redundant details, keep only actionable information
4. Pass consolidated summary (not full agent outputs) to Wave 3

**After Wave 3 (Synthesis Wave)**:
1. The conclusion document (2000-3000 tokens) contains all synthesized findings
2. This becomes the primary input to Wave 4
3. No need to carry forward Wave 2 details

**Token Budget Tracking**:
- Wave 1 (Validation): ~500 tokens
- Wave 2 (Research): ~15,000-25,000 tokens (4 parallel agents)
- Wave 2 Consolidation: ~2,000 tokens
- Wave 3 (Synthesis): ~5,000-8,000 tokens
- Wave 4 (Plan Generation): ~3,000-5,000 tokens
- Total estimated: ~30,000-40,000 tokens for typical research
- If approaching limits, prioritize Wave 2 agents based on research type

### Error Handling

**If RESEARCH_TOPIC is empty**:
- Display clear error message with usage examples
- Suggest common research topics based on codebase
- Exit gracefully (do not proceed with any waves)

**If no codebase results found in Wave 2**:
- Valid outcome for external knowledge topics
- Continue with documentation, configuration, and test agents
- Note in consolidation: "Codebase research yielded no results (topic may be new to this project)"
- Emphasize external knowledge and best practices in synthesis

**If agent fails during Wave 2**:
- Log the failure but continue with other agents
- Note missing analysis in consolidation summary
- If 3+ agents fail, abort workflow and report error
- If 1-2 agents fail, continue but flag gaps in final plan

**If synthesis produces insufficient conclusions**:
- Request more specific research topic from user
- Suggest breaking topic into sub-topics
- Provide what was found and ask for clarification

**If plan file cannot be saved**:
- Verify `.claude/plans/` directory exists
- Create directory if missing using Bash: `mkdir -p .claude/plans`
- Try alternative filename if timestamp collision
- If still failing, display plan to user and report save error

### Adaptive Scaling

**Small Topic (affects <10 files)**:
- Use all 4 Wave 2 agents but with focused scope
- Each agent reads top 3-5 files only
- Faster consolidation
- Concise build plan

**Medium Topic (affects 10-50 files)**:
- Use all 4 Wave 2 agents as designed
- Standard analysis depth
- Each agent reads top 5-10 files
- Comprehensive build plan

**Large Topic (affects 50+ files)**:
- Use all 4 Wave 2 agents with sampling strategy
- Each agent samples files by priority (security-critical, complex, entry points)
- Focus on patterns rather than exhaustive coverage
- Build plan emphasizes architecture over low-level details

**External Knowledge Topic** (minimal codebase relevance):
- Codebase Pattern Agent focuses on finding integration points
- Documentation Agent searches for prior related work
- Configuration Agent identifies technology stack constraints
- Test Agent looks for similar testing patterns
- Consider using WebSearch tool for external best practices (if available)
- Synthesis emphasizes introducing new patterns vs. following existing ones

---

## Output Format

### Final User-Facing Output

After all waves complete successfully, display:

```
✓ Research Complete: [RESEARCH_TOPIC]

📊 Research Summary:
- Files analyzed: [count]
- Documentation reviewed: [count]
- Configurations examined: [count]
- Tests reviewed: [count]

🎯 Key Findings:
- [Finding 1 - one sentence]
- [Finding 2 - one sentence]
- [Finding 3 - one sentence]

✅ Conclusions Synthesized:
- Recommended approach: [brief summary]
- Key requirements identified: [count]
- Implementation priorities defined: [count] phases

📋 Build Plan Generated:
- File: .claude/plans/research-[TIMESTAMP].md
- Sections: [count]
- Ready for execution: /build .claude/plans/research-[TIMESTAMP].md

🚀 Next Steps:
1. Review the build plan: Read .claude/plans/research-[TIMESTAMP].md
2. Execute the plan: /build .claude/plans/research-[TIMESTAMP].md
3. Or request refinements to the research or plan
```

---

## Success Criteria

The research workflow is only complete when:

- ✓ RESEARCH_TOPIC validated and scoped
- ✓ All 4 Wave 2 research agents completed successfully
- ✓ Research findings consolidated into structured summary
- ✓ Wave 3 synthesis agent produced comprehensive conclusions
- ✓ Wave 4 build plan engineer generated detailed plan
- ✓ Build plan saved to `.claude/plans/research-[TIMESTAMP].md`
- ✓ User receives clear summary and next steps
- ✓ Build plan is actionable and ready for /build command

---

## Usage Examples

**Research existing patterns**:
```
/research authentication flow
/research API error handling
/research React component patterns
```

**Research for new implementation**:
```
/research OAuth 2.0 implementation
/research database migration strategy
/research WebSocket real-time features
```

**Research for optimization**:
```
/research performance optimization
/research caching strategies
/research database query optimization
```

**Research for migration**:
```
/research migrate from Redux to Context
/research upgrade to React 18
/research move to TypeScript
```

---

## Notes

- **Comprehensive approach**: This command performs both codebase analysis and knowledge synthesis. It's designed to give you a complete picture before implementation.
- **Parallel execution**: Wave 2 uses 4 parallel agents for maximum efficiency. Research that might take 20-30 minutes serially completes in 5-7 minutes.
- **Actionable output**: The build plan is specifically formatted for the /build command, ensuring smooth handoff from research to implementation.
- **Flexible scope**: Works for both "understand what we have" research and "plan something new" research.
- **Best results**: Most effective when research topic is specific and focused. Broad topics (e.g., "architecture") may need refinement.
- **Privacy note**: All analysis is performed locally. If WebSearch is used for external knowledge, standard web search privacy applies.
