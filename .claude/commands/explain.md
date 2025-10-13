---
description: Generate comprehensive explanations and documentation for codebases
argument-hint: [topic-or-path]
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
model: claude-sonnet-4-5-20250929
---

# Explain

Orchestrate a sophisticated multi-wave agent workflow to generate intelligent explanations of codebases, features, or specific code sections. This command translates complex code into clear, understandable documentation suitable for developers at all experience levels, from onboarding juniors to providing architectural overviews for seniors.

## Variables

QUERY: $ARGUMENTS

## Workflow

### 1. Query Classification & Scoping

**Purpose**: Parse the user's query and determine what needs to be explained, validating paths and establishing explanation scope.

**Steps**:
1. If `QUERY` is empty or not provided:
   - Display clear error: "Error: No explanation topic provided. Please specify what you want explained."
   - Show usage examples:
     - "Usage: /explain [topic-or-path]"
     - "Examples:"
     - "  /explain authentication system"
     - "  /explain src/api/routes.js"
     - "  /explain how does caching work"
     - "  /explain this codebase"
     - "  /explain state management"
   - STOP immediately

2. **Parse QUERY to determine explanation type**:

   **Type A - Specific File Path**:
   - Pattern: Contains file extensions (.js, .ts, .py, etc.) or looks like a path
   - Examples: "src/auth/login.js", "./components/Header.tsx", "backend/models/user.py"
   - Validation: Check if path exists using Bash `test -f` or `test -d`
   - If not found: Search for similar filenames using Glob with pattern `**/*{basename}*`
   - Action: Explain the specific file and its immediate context

   **Type B - Feature/Component Name**:
   - Pattern: Technical term or feature name
   - Examples: "authentication system", "user dashboard", "payment processing", "API routes"
   - Validation: Search codebase for relevant files/patterns
   - Action: Explain the feature across multiple files and components

   **Type C - Concept/Question**:
   - Pattern: Question format or abstract concept
   - Examples: "how does caching work", "what is the data flow", "explain error handling"
   - Validation: Identify related patterns and implementations
   - Action: Explain the concept with codebase examples

   **Type D - General Codebase**:
   - Pattern: General terms or no specific target
   - Examples: "this codebase", "the project", "everything", "architecture"
   - Validation: Get project root and structure
   - Action: Provide comprehensive codebase overview

3. **Validate and scope**:
   - For file paths: Verify existence, suggest alternatives if not found
   - For features: Estimate scope (number of related files)
   - For concepts: Identify implementation locations
   - For general: Estimate project size and complexity

4. **Determine explanation depth**:
   - **Shallow** (1 file or simple concept): Single-file explanation with context
   - **Medium** (2-10 files or feature): Multi-component explanation with architecture
   - **Deep** (10+ files or complex system): Comprehensive architectural explanation
   - **Full** (entire codebase): High-level overview with component breakdown

5. **Display scope to user**:
   ```
   Explaining: [QUERY]
   Type: [File/Feature/Concept/Codebase]
   Depth: [Shallow/Medium/Deep/Full]
   Estimated files to analyze: [count]
   Starting explanation generation...
   ```

---

### 2. Codebase Analysis Wave (Parallel Deep Dive)

**Purpose**: Comprehensively analyze the codebase to gather all information needed for explanation.

Launch 4 agents **IN PARALLEL** (single message with multiple Task calls):

**Agent 1 - Architecture Mapper**

Map the high-level structure, layers, and component organization.

**Tasks**:
- Use Bash to get project structure: `find . -type f -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.java" -o -name "*.go" | head -100`
- Identify directory organization patterns:
  - Frontend: `src/`, `components/`, `pages/`, `views/`, `ui/`
  - Backend: `server/`, `api/`, `routes/`, `controllers/`, `models/`, `services/`
  - Shared: `utils/`, `lib/`, `helpers/`, `common/`, `shared/`
  - Tests: `test/`, `tests/`, `__tests__/`, `spec/`
  - Config: `config/`, `.config/`, root-level configs
- Use Glob to find entry points:
  - Web: `**/index.{js,ts,tsx,jsx}`, `**/main.{js,ts}`, `**/app.{js,ts,tsx,jsx}`
  - API: `**/server.{js,ts,py}`, `**/app.{js,ts,py}`, `**/index.{js,ts,py}`
  - CLI: `**/cli.{js,ts,py}`, `**/bin/**/*`
- Identify architectural patterns:
  - MVC: Look for `models/`, `views/`, `controllers/`
  - Layered: Look for `presentation/`, `business/`, `data/`
  - Microservices: Multiple service directories
  - Monorepo: `packages/`, `apps/`, workspace configs
- Map technology stack:
  - Check `package.json`, `requirements.txt`, `go.mod`, `pom.xml`, `Cargo.toml`
  - Identify frameworks from dependencies
  - Note language versions

**Output**: Structured architecture map including:
- Project type: (SPA, API, Full-stack, CLI, Library, etc.)
- Architecture pattern: (MVC, Layered, Microservices, etc.)
- Directory structure: organized by purpose
- Entry points: main files and how execution starts
- Technology stack: languages, frameworks, major libraries
- Scale metrics: file count, estimated LOC, complexity

**Agent 2 - Dependency Analyzer**

Trace imports, exports, and dependencies to understand component relationships.

**Tasks**:
- Based on QUERY scope, identify target files from Agent 1's findings
- For each target file (limit to top 10-20 by relevance):
  - Use Read to get file contents
  - Extract imports/requires/includes:
    - JavaScript/TypeScript: `import`, `require(`, `from '`
    - Python: `import `, `from `
    - Java: `import `
    - Go: `import (`
  - Extract exports:
    - JavaScript/TypeScript: `export`, `module.exports`
    - Python: `__all__`, top-level functions/classes
    - Java: `public class`, `public interface`
    - Go: capitalized functions/types
- Build dependency graph:
  - What does this file depend on?
  - What depends on this file? (reverse lookup with Grep)
- Identify external dependencies vs. internal modules
- Find circular dependencies or coupling issues
- Trace execution paths for main flows

**Output**: Dependency analysis including:
- Dependency graph: visual text representation of relationships
- Import patterns: how modules are organized
- External dependencies: third-party libraries used
- Internal dependencies: module coupling
- Execution flows: how data moves through imports
- Coupling analysis: tight vs. loose coupling areas

**Agent 3 - Data Flow Tracker**

Understand how data moves through the system, from inputs to outputs.

**Tasks**:
- Identify data sources:
  - Use Grep to find database operations: `SELECT`, `INSERT`, `UPDATE`, `query(`, `.find(`, `.save(`
  - Use Grep to find API calls: `fetch(`, `axios`, `request(`, `http.get`, `client.`
  - Use Grep to find file I/O: `readFile`, `writeFile`, `open(`, `File(`
  - Use Grep to find user input: `input`, `stdin`, `request.body`, `req.params`, `form`
- Identify data transformations:
  - Look for mapper functions: `.map(`, `transform`, `convert`, `parse`
  - Look for validators: `validate`, `check`, `verify`, `sanitize`
  - Look for serializers: `JSON.stringify`, `JSON.parse`, `serialize`, `deserialize`
- Identify data stores:
  - State management: `useState`, `redux`, `store`, `context`, `state`
  - Caching: `cache`, `memoize`, `localStorage`, `sessionStorage`, `redis`
  - Persistence: database models, file storage patterns
- Trace data flow for key operations:
  - If explaining authentication: trace login flow from input to token storage
  - If explaining API: trace request → processing → response
  - If explaining UI: trace user action → state update → render

**Output**: Data flow documentation including:
- Data sources: where data enters the system
- Data transformations: how data is modified
- Data stores: where data is kept
- Flow diagrams: text-based diagrams showing data movement
- Key operations: step-by-step data flow for important features
- Data models: structure of key data objects

**Agent 4 - Entry Point & Interface Identifier**

Find where execution starts and how users/systems interact with the code.

**Tasks**:
- Identify application entry points:
  - Web frontend: `ReactDOM.render`, `createApp`, `render(`, main component
  - Backend: `app.listen(`, `serve(`, `main()`, `if __name__ == "__main__"`
  - CLI: `commander`, `argparse`, `main()` with argv
- Identify public interfaces:
  - API routes: Use Grep for `@route`, `@app.route`, `router.`, `app.get`, `app.post`
  - GraphQL: Use Grep for `type Query`, `type Mutation`, `gql`
  - CLI commands: Use Grep for `.command(`, `subcommand`, `argparse`
  - Public functions/classes: exports, public methods
- Identify UI entry points (if web app):
  - Use Grep to find routes: `<Route`, `path:`, `routes`, `createBrowserRouter`
  - Use Glob to find pages/views: `**/pages/**/*`, `**/views/**/*`, `**/screens/**/*`
  - Identify main user flows
- Document interface contracts:
  - API endpoints: HTTP methods, paths, params
  - Function signatures: parameters, return types
  - Events: event names, payloads
- Find configuration entry points:
  - Environment variables: `.env` files, `process.env`, `os.getenv`
  - Config files: what's configurable

**Output**: Entry point documentation including:
- Application entry points: how the app starts
- Public API surface: all ways to interact with the code
- Routes and endpoints: URL structure and handlers
- User flows: key user journeys and their entry points
- Configuration: how the app is configured
- Integration points: webhooks, callbacks, external integrations

**Critical**: Wait for ALL 4 agents to complete before proceeding. This is a synchronization point.

**Consolidation Step** (2000-3000 tokens):

After all 4 agents complete, synthesize their findings into a comprehensive codebase understanding:

1. **Architecture Overview**: High-level structure and organization
2. **Component Relationships**: How pieces connect and communicate
3. **Data Flow**: How information moves through the system
4. **Interaction Model**: How users/systems interact with the code
5. **Technology Context**: Stack, frameworks, patterns used
6. **Scope Boundaries**: What's included in the explanation vs. external

This consolidated understanding will inform the explanation generation in Wave 3.

---

### 3. Explanation Synthesis Wave (Multi-Level Documentation)

**Purpose**: Transform technical analysis into clear, understandable explanations at multiple levels of detail.

Launch 3 agents **IN PARALLEL** (single message with multiple Task calls):

**Agent 1 - High-Level Explainer**

Create accessible, non-technical explanations suitable for beginners and stakeholders.

**Tasks**:
1. **Generate "What This Does" overview** (2-3 paragraphs):
   - Explain purpose in plain English
   - Use analogies and metaphors
   - Avoid jargon, or explain technical terms when used
   - Focus on "why" and "what" before "how"

2. **Create "The Big Picture" section**:
   - What problem does this solve?
   - Who uses this code and how?
   - What are the main responsibilities?
   - How does this fit into the larger system?

3. **Write "Key Concepts" section**:
   - Identify 3-5 fundamental concepts needed to understand this code
   - Explain each concept in simple terms
   - Provide real-world analogies where helpful
   - Examples: "Authentication is like checking ID at a door", "Caching is like keeping frequently used items on your desk instead of in storage"

4. **Generate "User's Perspective" section** (if applicable):
   - What does the user see/experience?
   - What user actions trigger this code?
   - What value does this provide to users?

**Output**: High-level explanation document including:
- Plain English overview
- Problem and solution statement
- Key concepts with analogies
- User perspective
- Intended audience note: "This explanation is for everyone"

**Agent 2 - Technical Explainer**

Create detailed technical explanations for developers who will work with the code.

**Tasks**:
1. **Architecture Deep Dive**:
   - Component structure and responsibilities
   - Design patterns used (with explanations why)
   - Architectural decisions and tradeoffs
   - Layer separation and boundaries
   - Component interaction diagrams (text-based)

2. **Component Breakdown**:
   - For each major component:
     - Purpose and responsibilities
     - Public interface (API surface)
     - Dependencies
     - Key classes/functions
     - Important implementation details
   - Include file paths for reference

3. **Code Flow Explanations**:
   - Trace key operations step-by-step
   - Explain decision points and branching logic
   - Highlight important algorithms or logic
   - Note performance considerations
   - Include code snippets with annotations

4. **Data Model Documentation**:
   - Key data structures and their purpose
   - Data validation rules
   - Data lifecycle (creation, transformation, storage)
   - Relationships between data entities

5. **Technology Choices**:
   - Why specific frameworks/libraries were used
   - How they're configured
   - Important APIs or features being used
   - Version-specific considerations

**Output**: Technical documentation including:
- Detailed architecture explanation
- Component-by-component breakdown
- Annotated code flows
- Data model documentation
- Technology rationale
- Intended audience note: "This explanation is for developers"

**Agent 3 - Code Example Generator**

Create illustrative code examples with detailed annotations.

**Tasks**:
1. **Extract Key Code Snippets**:
   - Identify the most important/representative code sections
   - For each snippet (5-10 total):
     - Include 10-30 lines of context
     - Add line-by-line annotations explaining what's happening
     - Highlight important patterns or idioms
     - Note potential gotchas or common mistakes
     - Include file path and line numbers

2. **Create Usage Examples**:
   - How to use this code/component/feature
   - Common use cases with examples
   - Integration examples showing how pieces connect
   - Configuration examples

3. **Generate Sequence Diagrams** (text-based):
   - For key operations, create ASCII/text sequence diagrams
   - Show actor interactions and message passing
   - Annotate with timing or ordering constraints
   - Example format:
     ```
     User → Frontend: Click "Login"
     Frontend → API: POST /auth/login {credentials}
     API → Database: Query user by email
     Database → API: Return user record
     API → API: Verify password hash
     API → API: Generate JWT token
     API → Frontend: Return {token, user}
     Frontend → Frontend: Store token in localStorage
     Frontend → User: Redirect to dashboard
     ```

4. **Document Edge Cases**:
   - Error handling examples
   - Boundary conditions
   - Null/undefined handling
   - Async operation handling

**Output**: Code example documentation including:
- Annotated code snippets from actual codebase
- Usage examples
- Text-based sequence diagrams
- Edge case demonstrations
- Integration examples
- Intended audience note: "These are real examples from the codebase"

**Critical**: Wait for ALL 3 agents to complete before proceeding.

**Synthesis Step** (1000-1500 tokens):

Combine all three explanation perspectives into a coherent multi-level document structure:

1. **Introduction**: Combine high-level overview with context
2. **Conceptual Model**: Key concepts from high-level explainer
3. **Architecture**: Technical architecture from technical explainer
4. **Component Details**: Detailed component breakdown
5. **Code Examples**: Annotated examples from code generator
6. **Data Flow**: Combine data flow from analysis with sequences
7. **Usage Patterns**: How to actually use/extend this code
8. **Further Reading**: Pointers to related code and documentation

---

### 4. Documentation Generation Wave (Final Output)

**Purpose**: Generate polished, well-formatted documentation in multiple formats suitable for different audiences and use cases.

Launch 2 agents **IN PARALLEL** (single message with multiple Task calls):

**Agent 1 - Documentation Writer**

Transform synthesized explanations into polished markdown documentation.

**Tasks**:
1. **Generate Primary Documentation** (800-1200 lines):

Create comprehensive markdown document with this structure:

```markdown
# Explanation: [QUERY]

**Generated**: [timestamp]
**Type**: [File/Feature/Concept/Codebase] Explanation
**Complexity**: [Simple/Moderate/Complex]

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Key Components](#key-components)
- [Data Flow](#data-flow)
- [Code Examples](#code-examples)
- [Entry Points](#entry-points)
- [Dependencies](#dependencies)
- [Design Patterns](#design-patterns)
- [How It Works](#how-it-works)
- [Common Use Cases](#common-use-cases)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Further Reading](#further-reading)

---

## Overview

### What This Is

[2-3 paragraph plain English explanation of what this code does, suitable for any audience]

### The Big Picture

**Problem**: [What problem does this solve?]

**Solution**: [How does this code solve it?]

**Value**: [What value does this provide?]

### Key Concepts

Before diving into details, here are the fundamental concepts:

1. **[Concept 1]**: [Explanation with analogy if helpful]
2. **[Concept 2]**: [Explanation with analogy if helpful]
3. **[Concept 3]**: [Explanation with analogy if helpful]

### Audience Guide

- **New to the codebase?** Start with Overview and Quick Start
- **Implementing a feature?** Focus on Architecture and Code Examples
- **Debugging an issue?** Check How It Works and Troubleshooting
- **Doing code review?** Review Design Patterns and Key Components

---

## Quick Start

### For Users

[If applicable: how to use this feature from user perspective]

### For Developers

**To understand this code**:
1. [First file to read with path]
2. [Second file to read with path]
3. [Third file to read with path]

**To modify this code**:
1. [Most common modification point]
2. [Testing approach]
3. [Integration considerations]

**To extend this code**:
1. [Extension points]
2. [Patterns to follow]
3. [What to avoid]

---

## Architecture

### High-Level Structure

[Describe overall architecture with text-based diagram if helpful]

```
[ASCII diagram of architecture]
```

### Architectural Pattern

**Pattern**: [MVC/Layered/Microservices/etc.]

**Why**: [Rationale for this pattern]

**Tradeoffs**: [What this pattern provides vs. costs]

### Component Organization

[Tree structure of components]

```
component-name/
├── module-1/       # [Purpose]
├── module-2/       # [Purpose]
└── module-3/       # [Purpose]
```

### Layer Separation

**[Layer 1]**: [Purpose and responsibilities]
**[Layer 2]**: [Purpose and responsibilities]
**[Layer 3]**: [Purpose and responsibilities]

**Communication**: [How layers interact]

---

## Key Components

### Component 1: [Name]

**Purpose**: [What this component does]

**Location**: `[file path]`

**Responsibilities**:
- [Responsibility 1]
- [Responsibility 2]
- [Responsibility 3]

**Public Interface**:
```[language]
[Key function/class signatures]
```

**Dependencies**:
- [Dependency 1]: [Why needed]
- [Dependency 2]: [Why needed]

**Key Implementation Details**:
[Important things to know about how this works]

**Usage Example**:
```[language]
[Code showing how to use this component]
```

---

### Component 2: [Name]

[Same structure as Component 1]

---

[Repeat for all key components]

---

## Data Flow

### Data Sources

[Where data enters the system]

1. **[Source 1]**: [Description]
2. **[Source 2]**: [Description]

### Data Transformations

[How data is modified as it flows through]

```
[Input] → [Transformation 1] → [Transformation 2] → [Output]
```

### Data Storage

**State Management**: [How state is managed]

**Persistence**: [How data is persisted]

**Caching**: [What is cached and why]

### Key Data Flows

#### Flow 1: [Operation Name]

```
Step 1: [What happens]
  ↓
Step 2: [What happens]
  ↓
Step 3: [What happens]
  ↓
Result: [Final outcome]
```

**Sequence**:
```
[Actor 1] → [Actor 2]: [Action]
[Actor 2] → [Actor 3]: [Action]
[Actor 3] → [Actor 1]: [Result]
```

**Code Path**:
1. `[file:line]` - [What happens here]
2. `[file:line]` - [What happens here]
3. `[file:line]` - [What happens here]

---

## Code Examples

### Example 1: [Scenario]

**Purpose**: [What this example demonstrates]

**Code**:
```[language]
// [file-path]:[line-range]

[Code snippet with inline comments explaining each important line]
```

**Explanation**:
- **Line X**: [What this line does and why]
- **Line Y**: [What this line does and why]
- **Line Z**: [Important pattern or gotcha]

**Key Takeaways**:
- [Takeaway 1]
- [Takeaway 2]

---

### Example 2: [Scenario]

[Same structure as Example 1]

---

[5-10 examples total covering key scenarios]

---

## Entry Points

### Application Entry

**How the application starts**:
1. Entry file: `[path]`
2. Initialization: [What gets initialized]
3. Bootstrap: [How components are wired together]

### Public API

[If applicable]

**Endpoints**:
```
[HTTP Method] /[path] - [Description]
[HTTP Method] /[path] - [Description]
```

**Request/Response**:
```[language]
// Example request
[Example]

// Example response
[Example]
```

### User Interface

[If applicable]

**Routes**:
- `/[route]` - [Page/Component]
- `/[route]` - [Page/Component]

**Main User Flows**:
1. **[Flow 1]**: [User action] → [System response]
2. **[Flow 2]**: [User action] → [System response]

### Integration Points

**External Services**:
- [Service 1]: [How it's integrated]
- [Service 2]: [How it's integrated]

**Webhooks/Callbacks**:
- [Hook 1]: [When triggered, what happens]

**Events**:
- [Event 1]: [When emitted, payload structure]

---

## Dependencies

### External Dependencies

**Core Dependencies**:
- **[Package 1]** (v[X.Y.Z]): [Purpose, why chosen]
- **[Package 2]** (v[X.Y.Z]): [Purpose, why chosen]

**Development Dependencies**:
- **[Package 1]**: [Purpose]
- **[Package 2]**: [Purpose]

### Internal Dependencies

**Module Dependencies**:
```
[Component A]
  ├── depends on [Component B]
  └── depends on [Component C]
      └── depends on [Component D]
```

**Coupling Analysis**:
- **Tight coupling**: [Where and why]
- **Loose coupling**: [Where and why]
- **Circular dependencies**: [If any, and how handled]

---

## Design Patterns

### Pattern 1: [Pattern Name]

**Where**: [Location in codebase]

**Purpose**: [Why this pattern is used]

**Implementation**:
```[language]
[Example of pattern implementation]
```

**Benefits**:
- [Benefit 1]
- [Benefit 2]

**Tradeoffs**:
- [Tradeoff 1]

---

### Pattern 2: [Pattern Name]

[Same structure as Pattern 1]

---

## How It Works

### Detailed Walkthrough: [Key Operation]

This section traces exactly what happens when [operation occurs].

**Step 1: [Stage]**
- Location: `[file]:[line]`
- What happens: [Detailed explanation]
- Why: [Rationale]
- Data state: [What data looks like at this point]

**Step 2: [Stage]**
- Location: `[file]:[line]`
- What happens: [Detailed explanation]
- Why: [Rationale]
- Data state: [What data looks like at this point]

[Continue for all steps]

**Summary**: [Overall flow summary]

---

### Edge Cases

**Case 1: [Scenario]**
- Condition: [When this happens]
- Handling: [How code handles it]
- Location: `[file]:[line]`

**Case 2: [Scenario]**
[Same structure]

---

### Error Handling

**Error 1: [Error Type]**
- Cause: [What causes this]
- Detection: `[file]:[line]`
- Handling: [How it's handled]
- User impact: [What user sees]

---

## Common Use Cases

### Use Case 1: [Scenario]

**Goal**: [What user/developer wants to accomplish]

**Approach**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Code Example**:
```[language]
[Example code]
```

**Notes**: [Important considerations]

---

### Use Case 2: [Scenario]

[Same structure as Use Case 1]

---

## Testing

### Test Coverage

**Unit Tests**:
- Location: `[test directory]`
- Framework: [Testing framework]
- Coverage: [What's tested]

**Integration Tests**:
- Location: `[test directory]`
- Coverage: [What flows are tested]

**Key Test Cases**:
1. `[test file]`: [What's tested]
2. `[test file]`: [What's tested]

### Testing This Code

**To run tests**:
```bash
[command to run tests]
```

**To test specific component**:
```bash
[command]
```

### Test Examples

```[language]
// Example from [test file]
[Test code showing how to test this functionality]
```

---

## Troubleshooting

### Common Issues

**Issue 1: [Problem]**
- **Symptom**: [What you see]
- **Cause**: [Why it happens]
- **Solution**: [How to fix]
- **Prevention**: [How to avoid]

**Issue 2: [Problem]**
[Same structure]

### Debugging Tips

1. **[Tip 1]**: [Debugging advice]
2. **[Tip 2]**: [Debugging advice]
3. **[Tip 3]**: [Debugging advice]

### Logging

**Where to look**:
- [Log location 1]: [What's logged]
- [Log location 2]: [What's logged]

**Key log messages**:
- `[Message]`: [What it means]

---

## Further Reading

### Related Code

- `[file path]`: [How it relates]
- `[file path]`: [How it relates]

### Documentation

- [Internal doc]: [What it covers]
- [External doc]: [What it covers]

### External Resources

- [Link]: [Description]
- [Link]: [Description]

### Next Steps

**To learn more**:
1. [Suggestion 1]
2. [Suggestion 2]

**To contribute**:
1. [How to extend this code]
2. [Testing requirements]
3. [Code review process]

---

## Appendix

### Technology Stack

**Languages**: [List with versions]
**Frameworks**: [List with versions]
**Libraries**: [Key libraries]
**Tools**: [Development tools]

### File Structure

```
[Complete file tree for explained scope]
```

### Glossary

- **[Term 1]**: [Definition]
- **[Term 2]**: [Definition]
- **[Term 3]**: [Definition]

### Change History

[If applicable: major changes or versions]

---

**This explanation generated by /explain command**
**For questions or updates, refer to the source code or documentation**
```

2. **Save Documentation**:
   - Determine save location based on QUERY type:
     - File-specific: `[file-directory]/EXPLANATION-[filename].md`
     - Feature-specific: `.claude/explanations/[feature-name].md`
     - Codebase-general: `.claude/explanations/codebase-overview.md`
   - Create directory if needed: `mkdir -p [directory]`
   - Use Write tool to save markdown
   - Report save location to user

**Output**: Complete documentation file saved to appropriate location

**Agent 2 - Quick Reference Generator**

Generate concise quick-reference documentation for developers.

**Tasks**:
1. **Create Cheat Sheet** (100-200 lines):

```markdown
# Quick Reference: [QUERY]

## At a Glance

**What**: [One sentence]
**Where**: [Main file paths]
**Tech**: [Key technologies]

## Key Files

- `[file]` - [Purpose]
- `[file]` - [Purpose]
- `[file]` - [Purpose]

## Main Functions/Classes

### [Name]
- **Location**: `[file]:[line]`
- **Purpose**: [Brief description]
- **Usage**: `[code snippet]`

### [Name]
[Same structure]

## Common Tasks

**To [task]**:
```[language]
[Code snippet]
```

**To [task]**:
```[language]
[Code snippet]
```

## Important Patterns

- **[Pattern]**: [Where used, brief description]

## Dependencies

- [Package]: [Purpose]

## Entry Points

- [Entry point]: [How to access]

## Quick Links

- Main file: `[path]`
- Tests: `[path]`
- Docs: `[path]`

## Notes

- [Important note 1]
- [Important note 2]
```

2. **Create Onboarding Guide** (if codebase-level explanation):

```markdown
# Developer Onboarding Guide

## Getting Started

### Prerequisites
- [Requirement 1]
- [Requirement 2]

### Setup
1. [Step 1]
2. [Step 2]
3. [Step 3]

### First Steps
1. **Read**: [File to read first]
2. **Understand**: [Concept to grasp]
3. **Try**: [Simple task to attempt]

## Learning Path

### Week 1: Foundations
- [ ] Understand [concept]
- [ ] Read [files]
- [ ] Run tests
- [ ] Make small change

### Week 2: Core Features
- [ ] Understand [feature]
- [ ] Trace [flow]
- [ ] Implement [small feature]

### Week 3: Advanced
- [ ] Understand [complex area]
- [ ] Review [architectural decision]
- [ ] Contribute [meaningful change]

## Key Concepts Explained

[Top 5-10 concepts new developers need to understand]

## Common Pitfalls

1. **[Pitfall]**: [How to avoid]
2. **[Pitfall]**: [How to avoid]

## Who to Ask

- [Area 1]: [Person/team]
- [Area 2]: [Person/team]

## Resources

- [Resource 1]
- [Resource 2]
```

3. **Create FAQ** (common questions about the explained code):

```markdown
# FAQ: [QUERY]

## General Questions

**Q: What is this used for?**
A: [Answer]

**Q: When would I need to modify this?**
A: [Answer]

**Q: How does this relate to [X]?**
A: [Answer]

## Technical Questions

**Q: Why was [technology] chosen?**
A: [Answer]

**Q: How does [feature] work?**
A: [Answer]

**Q: What happens when [scenario]?**
A: [Answer]

## Troubleshooting

**Q: I'm seeing [error], what's wrong?**
A: [Answer]

**Q: How do I debug [issue]?**
A: [Answer]

## Contributing

**Q: How do I add [feature]?**
A: [Answer]

**Q: What tests should I write?**
A: [Answer]
```

4. **Save Quick References**:
   - Save cheat sheet to: `.claude/explanations/[name]-quick-reference.md`
   - Save onboarding (if created) to: `.claude/explanations/onboarding-guide.md`
   - Save FAQ to: `.claude/explanations/[name]-faq.md`

**Output**: Quick reference documents saved

**Critical**: Wait for both agents to complete.

---

## Execution Guidelines

### Parallelization Rules

**Within Each Wave**: Always launch agents in a SINGLE message with multiple Task tool calls. This is critical for performance.

**Wave 2 Example**:
```
Launching 4 analysis agents in parallel:
- Agent 1: Architecture Mapper (mapping structure...)
- Agent 2: Dependency Analyzer (tracing imports...)
- Agent 3: Data Flow Tracker (following data...)
- Agent 4: Entry Point Identifier (finding interfaces...)
```

**Wave 3 Example**:
```
Launching 3 explanation agents in parallel:
- Agent 1: High-Level Explainer (writing overview...)
- Agent 2: Technical Explainer (documenting architecture...)
- Agent 3: Code Example Generator (extracting examples...)
```

**Wave 4 Example**:
```
Launching 2 documentation agents in parallel:
- Agent 1: Documentation Writer (generating markdown...)
- Agent 2: Quick Reference Generator (creating cheat sheets...)
```

**Between Waves**: ALWAYS wait for all agents in current wave to complete before starting the next wave. Synthesize findings between waves.

### Context Management Strategy

**After Wave 1 (Classification)**:
- Pass QUERY type, scope, and depth to Wave 2
- Include validated file paths
- Token budget: ~500-1000 tokens

**After Wave 2 (Analysis)**:
1. Consolidate all 4 agent outputs into structured summary (2000-3000 tokens)
2. Organize into: Architecture, Dependencies, Data Flow, Entry Points
3. Remove redundant file listings, keep only key insights
4. Pass consolidated summary to Wave 3

**After Wave 3 (Synthesis)**:
1. Synthesized explanations are ~3000-5000 tokens
2. Structured as: High-level, Technical, Examples
3. Pass complete synthesis to Wave 4
4. This is the primary content for documentation

**Token Budget Tracking**:
- Wave 1 (Classification): ~500-1000 tokens
- Wave 2 (Analysis): ~20,000-30,000 tokens (4 parallel agents reading files)
- Wave 2 Consolidation: ~2,500 tokens
- Wave 3 (Synthesis): ~8,000-12,000 tokens (3 parallel explainers)
- Wave 4 (Documentation): ~5,000-8,000 tokens (2 parallel writers)
- Total estimated: ~40,000-55,000 tokens for comprehensive explanation
- If approaching limits, prioritize current scope over breadth

### Adaptive Scaling

**Small Scope (1-3 files)**:
- Focus Wave 2 agents on just these files
- Keep examples tight and focused
- Generate concise documentation (400-600 lines)
- Skip onboarding guide

**Medium Scope (4-15 files)**:
- Standard agent execution as designed
- Comprehensive examples from key files
- Full documentation (800-1200 lines)
- Include all supplementary docs

**Large Scope (16-50 files)**:
- Agents focus on sampling key files (top 15-20 by relevance)
- Emphasize architecture over details
- Documentation focuses on structure (600-800 lines)
- Quick reference becomes more important

**Codebase Scope (50+ files)**:
- High-level architecture focus
- Sample 20-30 most important files
- Create overview documentation (500-700 lines)
- Emphasize onboarding guide
- Generate comprehensive quick reference

### Error Handling

**If QUERY is empty**:
- Display clear error with usage examples
- Suggest common explanation targets based on codebase
- Exit gracefully (do not proceed)

**If specific file path not found**:
- Search for similar filenames using Glob
- Suggest top 3-5 matches to user
- Ask user to clarify or continue with best match

**If no relevant code found for feature/concept**:
- Report finding: "No code found matching '[QUERY]' in this codebase"
- Suggest:
  - Check spelling/terminology
  - Try related terms
  - Use /explain to browse codebase first
- Offer to explain general codebase structure instead

**If codebase too large (>10K files)**:
- Warn user: "Large codebase detected. Consider narrowing scope:"
- Suggest: specific directory, feature, or component
- Offer to continue with high-level overview only

**If agent fails during Wave 2**:
- Log failure but continue with other agents
- Note missing analysis in consolidation
- If 3+ agents fail, abort and report error
- If 1-2 agents fail, continue but note gaps

**If unable to save documentation**:
- Verify directory exists, create if needed
- Try alternative filename if collision
- If still failing, display documentation to user
- Report save error with suggestion to manually save

### Output Customization

**For Different Query Types**:

**File Explanation**:
- Focus on that file's purpose, structure, and context
- Show how it fits into larger system
- Include usage examples from tests or other files
- Shorter documentation (400-600 lines)

**Feature Explanation**:
- Trace feature across multiple components
- Show integration points and data flow
- Include sequence diagrams
- Standard documentation (800-1200 lines)

**Concept Explanation**:
- Find all implementations of concept
- Compare different approaches if multiple
- Explain evolution/rationale
- Medium documentation (600-800 lines)

**Codebase Explanation**:
- High-level architecture
- Major components and their interactions
- Technology stack and rationale
- Onboarding focus
- Comprehensive documentation (1000-1500 lines)

### Quality Checks

Before finalizing documentation, verify:
- [ ] All code examples include file paths and line numbers
- [ ] All technical terms are explained or defined in glossary
- [ ] Architecture diagrams are consistent with code analysis
- [ ] External dependencies are listed with versions
- [ ] Entry points are clearly documented
- [ ] Quick reference matches detailed documentation
- [ ] FAQ addresses common actual questions
- [ ] No placeholder text or "TODO" markers
- [ ] File paths use absolute paths, not relative
- [ ] Saved files are in correct locations

---

## Success Criteria

The explanation workflow is only complete when:

- ✓ QUERY validated and classified correctly
- ✓ All 4 Wave 2 analysis agents completed successfully
- ✓ Analysis findings consolidated into structured summary
- ✓ All 3 Wave 3 synthesis agents produced clear explanations
- ✓ Explanations synthesized into multi-level structure
- ✓ Both Wave 4 documentation agents generated output
- ✓ Primary documentation saved successfully
- ✓ Quick references and supplementary docs saved
- ✓ User receives clear summary with file paths
- ✓ Documentation is accurate, clear, and useful
- ✓ Multiple audience levels addressed (beginner to advanced)
- ✓ Real code examples with proper attribution

---

## Output Format

### Final User-Facing Output

After all waves complete successfully, display:

```
✓ Explanation Complete: [QUERY]

📊 Analysis Summary:
- Files analyzed: [count]
- Components documented: [count]
- Code examples extracted: [count]
- Documentation generated: [size] lines

📚 Documentation Generated:

**Primary Documentation**:
- File: [path to main explanation]
- Size: [line count] lines
- Sections: [count]
- Suitable for: All developers

**Quick References**:
- Cheat Sheet: [path]
- FAQ: [path]
[- Onboarding Guide: [path]]  (if created)

🎯 Key Insights:
- [Insight 1 - one sentence about architecture]
- [Insight 2 - one sentence about key pattern]
- [Insight 3 - one sentence about complexity]

💡 Next Steps:
1. Read the documentation: [primary doc path]
2. Review code examples in: [section reference]
3. Try modifying: [suggested starting point]
4. For quick reference: [cheat sheet path]

📖 Documentation Preview:

[First 20-30 lines of the Overview section from generated docs]

[...see full documentation at [path]]
```

---

## Usage Examples

**Explain specific file**:
```
/explain src/auth/login.js
/explain backend/api/routes.py
/explain components/Header.tsx
```

**Explain feature or component**:
```
/explain authentication system
/explain user dashboard
/explain payment processing
/explain API routes
/explain state management
```

**Explain concept**:
```
/explain how does caching work
/explain error handling approach
/explain data validation
/explain the build process
```

**Explain entire codebase**:
```
/explain this codebase
/explain the project
/explain everything
/explain architecture
```

---

## Notes

- **Multi-level explanations**: Documentation serves both beginners (overview, analogies) and experienced developers (technical details, patterns)
- **Code-to-English translation**: Focus on explaining "why" and "what", not just "how"
- **Real examples**: All code examples are extracted from actual codebase with proper attribution
- **Visual aids**: Text-based diagrams and sequence flows make complex flows understandable
- **Onboarding focus**: Generated docs can serve as onboarding material for new team members
- **Living documentation**: Docs include file paths so they can be kept in sync with code changes
- **Pattern identification**: Explains design patterns and architectural decisions, not just code mechanics
- **Best results**: Most effective with codebases that have clear structure and purpose. Obfuscated or poorly organized code will produce less useful explanations.
- **Privacy note**: All analysis is performed locally. No code is transmitted externally.
