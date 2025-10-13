---
description: Generate comprehensive documentation for code, APIs, and systems
argument-hint: [target-path-or-type]
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
model: claude-sonnet-4-5-20250929
---

# Document

Orchestrate a sophisticated multi-wave agent workflow to generate comprehensive, accurate documentation for code, APIs, and systems. This command analyzes codebases, extracts information from multiple sources, and produces professional-quality documentation including READMEs, API docs, inline comments, ADRs, and more. Uses parallel agent execution within waves with synchronization points between phases to ensure thorough coverage and accuracy.

## Variables

TARGET: $ARGUMENTS (defaults to README for current directory)

## Workflow

### 1. Documentation Scope Analysis & Validation

**Purpose**: Validate input, determine documentation type, and establish clear documentation scope before proceeding.

**Steps**:
1. Parse and validate TARGET argument:
   - If TARGET is empty or not provided: Default to "README" for current directory
   - If TARGET is a path: Validate the path exists (use Bash `test -e` or Glob to check)
   - If TARGET is a documentation type keyword: Validate it's a supported type
   - If TARGET is invalid: Display error with suggestions and STOP

2. Determine documentation type from TARGET:
   - **README**: Project overview, setup instructions, usage guide (default)
   - **API**: API endpoint documentation with requests/responses
   - **CODE**: Inline comments and function/class docstrings
   - **ADR**: Architecture Decision Records (new or existing)
   - **CHANGELOG**: Generate changelog from git history
   - **CONTRIBUTING**: Contribution guidelines and setup
   - **TROUBLESHOOTING**: Common issues and solutions guide
   - **ALL**: Comprehensive documentation suite (all of the above)
   - **File path**: Document specific file(s) with inline comments and docstrings
   - **Directory path**: Document all code in directory

3. Detect project context:
   - Use Glob to identify project type indicators:
     - Web app: `package.json`, `index.html`, `src/App.*`, `public/`
     - API/Backend: `server.js`, `app.py`, `main.go`, `api/`, `routes/`, `controllers/`
     - Library: `lib/`, `dist/`, `index.js` with exports
     - CLI tool: `bin/`, `cli.js`, `__main__.py`, command patterns
     - Mobile app: `ios/`, `android/`, `App.tsx`, `react-native`
     - Full-stack: Multiple indicators above
   - Detect primary language(s): Use Glob to count file types
   - Identify package manager: `package.json` (npm/yarn), `requirements.txt` (pip), `Gemfile` (bundler), `go.mod` (go modules), `pom.xml` (maven), `Cargo.toml` (cargo)

4. Identify documentation gaps:
   - Check for existing documentation files: README.md, API.md, CONTRIBUTING.md, docs/, etc.
   - Check for inline documentation in source files (use Grep for docstring patterns)
   - Identify what exists vs. what's missing
   - For CODE type: Analyze functions/classes missing documentation

5. Display documentation plan to user:
   ```
   Documentation Plan

   Type: [README / API / CODE / etc.]
   Target: [path or "current directory"]
   Project Type: [detected type]
   Primary Language(s): [languages with percentages]

   Existing Documentation:
   - [✓] README.md (found)
   - [✗] API documentation (missing)
   - [✓] Inline comments (partial coverage)

   Documentation Strategy:
   - [What will be generated]
   - [What will be enhanced]
   - [What will be preserved]

   Starting 4-wave documentation generation...
   ```

6. Store context for next waves:
   - Documentation type determined
   - Target path(s) identified
   - Project type and language detected
   - Gaps identified
   - Existing documentation inventory

**Critical**: If validation fails or TARGET is invalid, STOP and display helpful error message. Do not proceed to Wave 2.

---

### 2. Content Analysis Wave (Parallel Information Gathering)

**Purpose**: Comprehensively analyze codebase, dependencies, structure, and existing documentation to gather all information needed for accurate documentation generation.

Launch 4 agents **IN PARALLEL** (single message with multiple Task calls):

**Agent 1 - Code Structure Analyzer**

Analyze code organization, components, modules, classes, and functions to build a complete structural map.

**Tasks**:
- Use Glob to identify all source code files by language:
  - JavaScript/TypeScript: `**/*.js`, `**/*.jsx`, `**/*.ts`, `**/*.tsx`
  - Python: `**/*.py`
  - Go: `**/*.go`
  - Java: `**/*.java`
  - Ruby: `**/*.rb`
  - PHP: `**/*.php`
  - C#: `**/*.cs`
  - Rust: `**/*.rs`
  - Exclude: `**/node_modules/**`, `**/dist/**`, `**/build/**`, `**/.git/**`, `**/vendor/**`, `**/target/**`
- Analyze directory structure and organization patterns
- For key source files (entry points, main modules, core logic):
  - Read files to extract structure information
  - Identify: classes, functions, methods, interfaces, types
  - Extract: function signatures, parameters, return types
  - Note: public APIs vs. internal implementation
  - Detect: design patterns used (Factory, Singleton, Observer, etc.)
- Identify entry points:
  - Main files: `index.js`, `main.py`, `main.go`, `app.js`, `server.js`
  - CLI entry points: files in `bin/`, `cli.js`, `__main__.py`
  - API entry points: route definitions, controller files
- Map module dependencies and imports
- Identify exported functionality (public API surface)
- Calculate codebase statistics: total files, lines of code per language, file count per module

**Focus Areas by Documentation Type**:
- README: High-level structure, entry points, main modules
- API: Route handlers, controllers, API endpoints, middleware
- CODE: All functions/classes that need docstrings
- ALL: Comprehensive structural analysis

**Output**: Structured findings including:
- Project structure: directory tree with key paths
- Entry points: main files and their purposes
- Modules/packages: logical organization with descriptions
- Classes: list with purposes and key methods
- Functions: signatures, parameters, return types (top 20-30 public functions)
- Public API surface: what's exported and available
- Design patterns: patterns identified with examples
- Code statistics: files, LOC, complexity indicators
- Priority areas: what needs documentation most urgently

**Agent 2 - API Endpoint Mapper**

Discover and catalog all API endpoints, routes, request/response patterns, and API-related functionality.

**Tasks**:
- Use Glob to find API-related files:
  - Routes: `**/routes/**/*`, `**/api/**/*`, `**/endpoints/**/*`
  - Controllers: `**/controllers/**/*`, `**/handlers/**/*`
  - Express: Look for `app.get/post/put/delete`, `router.`
  - Flask/Django: `@app.route`, `@api_view`, `urlpatterns`
  - Go: `http.HandleFunc`, router packages (mux, chi, gin)
  - Spring: `@RestController`, `@RequestMapping`, `@GetMapping`
- Use Grep to find route definitions:
  - HTTP methods: `GET|POST|PUT|PATCH|DELETE` patterns
  - Route decorators: `@app.route`, `@router.get`, `@RequestMapping`
  - Path patterns: `/api/`, `/v1/`, endpoint definitions
- For each endpoint found:
  - Read the handler/controller file
  - Extract: HTTP method, URL path, parameters (path, query, body)
  - Identify: request body schema, validation rules
  - Identify: response format, status codes, error responses
  - Check: authentication/authorization requirements
  - Find: any middleware applied (auth, validation, logging)
- Search for API documentation patterns:
  - OpenAPI/Swagger specs: `swagger.json`, `openapi.yaml`
  - API doc comments: JSDoc `@api`, Python docstrings with param info
- Identify API versioning strategy (if any)
- Look for rate limiting, CORS, or other API configurations
- Search for request/response examples in tests or docs

**Focus Areas by Documentation Type**:
- API: Comprehensive endpoint mapping (primary focus)
- README: List key API endpoints in usage section
- ALL: Full API documentation

**Output**: Structured findings including:
- Total endpoints: count by HTTP method
- Endpoint catalog:
  - Method + Path
  - Description (inferred from code/comments)
  - Request parameters (path, query, body)
  - Request body schema
  - Response schema
  - Status codes (success and error)
  - Authentication requirements
  - Example curl command
- API patterns: RESTful conventions, naming patterns
- Authentication: methods used (JWT, OAuth, API keys, sessions)
- Middleware: common middleware applied
- Versioning: API version strategy
- Existing API docs: OpenAPI specs or doc comments found
- Documentation gaps: endpoints without proper docs

**Agent 3 - Dependency & Configuration Analyzer**

Analyze project dependencies, configuration, environment setup, and build/deployment processes.

**Tasks**:
- Use Glob to find dependency manifests:
  - Node.js: `package.json`, `package-lock.json`, `yarn.lock`
  - Python: `requirements.txt`, `setup.py`, `pyproject.toml`, `Pipfile`
  - Ruby: `Gemfile`, `Gemfile.lock`
  - Go: `go.mod`, `go.sum`
  - Java: `pom.xml`, `build.gradle`, `build.gradle.kts`
  - PHP: `composer.json`
  - Rust: `Cargo.toml`, `Cargo.lock`
  - .NET: `*.csproj`, `packages.config`
- Read dependency files to extract:
  - Direct dependencies: packages required by the project
  - Dev dependencies: tools for development only
  - Version constraints: specific versions or ranges
  - Scripts: build, test, start commands
- Use Glob to find configuration files:
  - Environment: `.env`, `.env.example`, `config/`
  - Build tools: `webpack.config.*`, `vite.config.*`, `tsconfig.json`, `babel.config.*`
  - Linters: `.eslintrc.*`, `.prettierrc`, `pylint.rc`, `.rubocop.yml`
  - Testing: `jest.config.*`, `pytest.ini`, `phpunit.xml`
  - CI/CD: `.github/workflows/*`, `.gitlab-ci.yml`, `Jenkinsfile`, `.circleci/config.yml`
  - Docker: `Dockerfile`, `docker-compose.yml`
- Read key configuration files to understand:
  - Required environment variables
  - Build process and steps
  - Testing setup and commands
  - Deployment configuration
- Identify technology stack:
  - Backend framework: Express, Flask, Django, Spring Boot, Rails, etc.
  - Frontend framework: React, Vue, Angular, Svelte, etc.
  - Database: PostgreSQL, MySQL, MongoDB, Redis (look for drivers in deps)
  - ORM/Database tools: Sequelize, SQLAlchemy, ActiveRecord, TypeORM
  - Testing frameworks: Jest, Pytest, RSpec, JUnit
  - Build tools: Webpack, Vite, Rollup, Babel, TypeScript compiler
- Extract installation requirements:
  - Runtime versions: Node.js, Python, Ruby, Go, Java versions
  - System dependencies: databases, caching, message queues
  - Platform requirements: OS-specific needs

**Focus Areas by Documentation Type**:
- README: Installation instructions, prerequisites, getting started (primary)
- CONTRIBUTING: Development setup, tooling, workflow
- ALL: Comprehensive dependency and configuration documentation

**Output**: Structured findings including:
- Technology stack:
  - Language(s) and required versions
  - Backend framework and version
  - Frontend framework and version
  - Database(s) and version
  - Key libraries and their purposes
- Dependencies:
  - Production dependencies (top 10-15 most important)
  - Development dependencies (key dev tools)
  - Purpose of each major dependency
- Installation requirements:
  - Required runtime versions
  - System dependencies (databases, tools)
  - Platform requirements
- Setup instructions:
  - Installation steps inferred from package.json scripts or README
  - Required environment variables
  - Database setup requirements
  - Build/compile steps
- Available commands:
  - Start/run: how to run the application
  - Build: how to build for production
  - Test: how to run tests
  - Lint: code quality tools
  - Other scripts: custom commands
- Configuration:
  - Key configuration files and their purposes
  - Environment variables needed
  - Deployment configuration

**Agent 4 - Usage Pattern & Example Detector**

Extract usage patterns, examples, test cases, and practical demonstrations of functionality.

**Tasks**:
- Use Glob to find test files:
  - JavaScript: `**/*.test.js`, `**/*.spec.js`, `**/*.test.ts`, `**/*.spec.ts`, `**/__tests__/**/*`
  - Python: `**/test_*.py`, `**/*_test.py`, `**/tests/**/*`
  - Go: `**/*_test.go`
  - Java: `**/src/test/**/*.java`, `**/*Test.java`
  - Ruby: `**/spec/**/*_spec.rb`, `**/test/**/*_test.rb`
- Use Glob to find example files:
  - `**/examples/**/*`, `**/samples/**/*`, `**/demo/**/*`, `**/playground/**/*`
  - Example files: `example.js`, `sample.py`, `demo.go`
- Read test files (top 10-15 most representative) to extract:
  - Test descriptions: what's being tested (from test names)
  - Setup code: how to initialize and configure
  - Usage patterns: actual function/API calls
  - Expected behavior: assertions and expected results
  - Edge cases: boundary conditions and error handling
  - Mock data: example inputs and outputs
- Read example files for:
  - Common use cases demonstrated
  - Integration examples
  - Configuration examples
  - Best practice demonstrations
- Use Grep to find code comments with examples:
  - Search for: `@example`, `Example:`, `Usage:`, `// e.g.`, `# For example`
  - Extract example code from documentation comments
- Identify common usage patterns from code:
  - Initialization patterns: how objects/modules are typically created
  - Configuration patterns: common configuration options
  - API call patterns: typical sequences of calls
  - Error handling patterns: how errors are typically handled
- Search for existing example documentation:
  - README examples section
  - Quick start guides
  - Tutorial files
  - Inline documentation examples

**Focus Areas by Documentation Type**:
- README: Quick start examples, common use cases (primary)
- API: Request/response examples, usage examples
- CODE: Usage examples for functions/classes
- ALL: Comprehensive example coverage

**Output**: Structured findings including:
- Testing framework: what's used (Jest, Pytest, RSpec, etc.)
- Test coverage areas: what functionality has tests
- Usage patterns identified:
  - Initialization: how to set up and configure
  - Common operations: typical function calls with parameters
  - Configuration: common config patterns from tests
  - Error handling: how errors are caught and handled
  - Integration: how components work together
- Example code snippets:
  - Basic usage (simple examples)
  - Advanced usage (complex scenarios)
  - Configuration examples
  - API call examples with sample data
- Test case insights:
  - Common test scenarios
  - Edge cases covered
  - Expected behavior patterns
  - Mock/fixture data that illustrates usage
- Existing examples:
  - Example files found and their content
  - Documentation examples extracted
- User flows:
  - Typical user interactions (for apps)
  - Common workflows (for APIs/libraries)

**Critical**: Wait for ALL 4 agents to complete before proceeding. This is a synchronization point.

**Consolidation Step** (1500-2500 tokens):
After all 4 agents complete, synthesize their findings into a comprehensive content map:

1. **Project Overview**:
   - Type: [web app / API / library / CLI / etc.]
   - Languages: [primary languages]
   - Tech Stack: [key frameworks and tools]
   - Purpose: [inferred project purpose]

2. **Structure Map**:
   - Entry points and their purposes
   - Key modules/packages and their responsibilities
   - Public API surface (exported functionality)
   - Important classes/functions

3. **API Catalog** (if applicable):
   - Endpoints by category
   - Authentication methods
   - Request/response patterns

4. **Dependencies & Setup**:
   - Required software and versions
   - Key dependencies and their purposes
   - Installation steps
   - Configuration requirements

5. **Usage Patterns**:
   - Common use cases
   - Code examples from tests
   - Configuration examples
   - Best practices observed

6. **Documentation Gaps**:
   - Missing README sections
   - Undocumented APIs
   - Functions without docstrings
   - Missing examples
   - Unclear setup instructions

7. **Existing Documentation**:
   - What already exists
   - What needs enhancement
   - What should be preserved

This consolidated content map will inform Wave 3's documentation generation.

---

### 3. Documentation Generation Wave (Parallel Content Creation)

**Purpose**: Generate comprehensive documentation based on the content analysis, creating accurate and professional documentation artifacts.

Based on the TARGET type, launch appropriate documentation generation agents:

**For README or ALL**: Launch Agent 1
**For API or ALL**: Launch Agent 2
**For CODE or ALL**: Launch Agent 3
**For ADR or ALL**: Launch Agent 4 (if architecture decisions are detected)
**For CHANGELOG**: Launch Agent 5
**For CONTRIBUTING or ALL**: Launch Agent 6

Launch applicable agents **IN PARALLEL** (single message with multiple Task calls):

**Agent 1 - README Generator**

Generate comprehensive README.md with project overview, setup, usage, and contribution guidelines.

**Tasks**:
1. Check if README.md exists:
   - If exists: Read it to preserve good sections and enhance
   - If not: Generate from scratch

2. Generate README structure with these sections:

   **Header**:
   - Project title (from package.json name or directory name)
   - Brief one-line description (inferred from project analysis)
   - Badges: build status placeholder, version (from package.json), license

   **Overview**:
   - What the project is (2-3 sentences)
   - Key features (bullet list, 5-8 features from code analysis)
   - Use cases (who should use this and why)

   **Table of Contents** (for longer READMEs):
   - Auto-generated links to sections

   **Prerequisites**:
   - Required software: Node.js, Python, Go, etc. with versions
   - System dependencies: databases, tools
   - Platform requirements: OS-specific notes

   **Installation**:
   - Step-by-step installation based on package manager detected
   - Clone repository
   - Install dependencies (`npm install`, `pip install -r requirements.txt`, etc.)
   - Setup databases (if needed)
   - Environment configuration (.env setup)
   - Verification step (how to verify installation worked)

   **Quick Start**:
   - Minimal example to get started (from usage patterns analysis)
   - Running the application (`npm start`, `python app.py`, etc.)
   - Accessing the application (URLs, ports)
   - Basic usage example

   **Usage**:
   - Detailed usage instructions
   - Code examples from usage pattern analysis
   - Common use cases with examples
   - Configuration options explained
   - CLI commands (if CLI tool)
   - API usage (if library)

   **API Reference** (brief overview):
   - Link to detailed API docs if separate
   - Key endpoints or functions (high-level list)

   **Configuration**:
   - Environment variables table: name, description, required/optional, default
   - Configuration files: what they do
   - Example configuration

   **Development**:
   - Setup for contributors
   - Running in development mode
   - Running tests: `npm test`, `pytest`, etc.
   - Linting and formatting
   - Build commands

   **Project Structure**:
   - Directory structure with explanations
   - Key files and their purposes

   **Tech Stack**:
   - Languages and versions
   - Frameworks and libraries
   - Tools and build system
   - Database and storage

   **Testing**:
   - How to run tests
   - Test coverage command
   - Writing tests guidelines

   **Deployment**:
   - How to build for production
   - Deployment instructions (if applicable)
   - Environment-specific notes

   **Contributing**:
   - Link to CONTRIBUTING.md if it will be created
   - Or brief contribution guidelines
   - Code style
   - Pull request process

   **Troubleshooting**:
   - Common issues and solutions (from experience or common patterns)
   - Where to get help

   **License**:
   - License type (from package.json or LICENSE file)
   - Copyright information

   **Acknowledgments** (optional):
   - Credits to libraries or resources
   - Contributors

3. Preserve existing content:
   - If README exists, keep any custom sections not covered above
   - Preserve badges, screenshots, or special formatting
   - Merge generated content with existing content intelligently

4. Format properly:
   - Use proper markdown syntax
   - Add code fences with language tags
   - Create tables for structured data
   - Use appropriate heading levels

**Output**: Complete README.md content ready to write to file

**Agent 2 - API Documentation Generator**

Generate comprehensive API documentation with endpoints, parameters, request/response examples.

**Tasks**:
1. Check if API documentation exists:
   - Look for: `API.md`, `docs/api.md`, `docs/API.md`
   - Check for OpenAPI/Swagger: `swagger.json`, `openapi.yaml`, `api-spec.yaml`
   - If exists: Read to preserve and enhance

2. Organize endpoints by category:
   - Group by resource or feature area
   - Example categories: Authentication, Users, Posts, Admin, etc.

3. For each endpoint, generate documentation:

   **Endpoint Header**:
   ```markdown
   ### [METHOD] [Path]

   [Brief description of what this endpoint does]
   ```

   **Authentication**:
   - Required: Yes/No
   - Method: Bearer token, API key, Session, OAuth, etc.
   - Scope/Permissions: what permissions are needed

   **Request Parameters**:

   *Path Parameters* (if any):
   | Parameter | Type | Required | Description |
   | :id | integer | Yes | User ID |

   *Query Parameters* (if any):
   | Parameter | Type | Required | Default | Description |
   | page | integer | No | 1 | Page number |
   | limit | integer | No | 20 | Items per page |

   *Request Body* (if applicable):
   ```json
   {
     "username": "string (required) - User's username",
     "email": "string (required) - User's email",
     "password": "string (required) - User's password (min 8 chars)"
   }
   ```

   **Request Example**:
   ```bash
   curl -X [METHOD] \
     [URL] \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "username": "johndoe",
       "email": "john@example.com"
     }'
   ```

   **Response**:

   *Success (200 OK)*:
   ```json
   {
     "success": true,
     "data": {
       "id": 123,
       "username": "johndoe",
       "email": "john@example.com",
       "createdAt": "2024-01-15T10:30:00Z"
     }
   }
   ```

   *Error (400 Bad Request)*:
   ```json
   {
     "success": false,
     "error": {
       "code": "INVALID_INPUT",
       "message": "Email is already registered"
     }
   }
   ```

   **Status Codes**:
   | Code | Description |
   | 200 | Success |
   | 400 | Bad Request - Invalid input |
   | 401 | Unauthorized - Invalid or missing token |
   | 404 | Not Found - Resource doesn't exist |
   | 500 | Internal Server Error |

4. Add API overview section:
   - Base URL
   - API versioning scheme
   - Authentication overview
   - Rate limiting info
   - Response format conventions
   - Error handling patterns
   - Pagination pattern (if used)

5. Add getting started section:
   - How to get API credentials
   - Making your first request
   - Testing the API (Postman, curl, etc.)

6. If OpenAPI spec exists:
   - Generate markdown from spec
   - Or reference the spec with link

**Output**: Complete API documentation content (API.md or docs/api.md)

**Agent 3 - Code Documentation Generator**

Generate inline code documentation: function docstrings, class documentation, and helpful comments.

**Tasks**:
1. Identify target files for documentation:
   - If TARGET is a specific file: Document that file only
   - If TARGET is CODE or ALL: Focus on public APIs, exported functions, complex logic
   - Prioritize: Entry points, public classes, exported functions, complex algorithms

2. For each target file:
   - Read the file
   - Identify functions/methods/classes without documentation
   - Identify complex logic that needs explanatory comments
   - Identify non-obvious code that needs clarification

3. Generate documentation based on language:

   **JavaScript/TypeScript** (JSDoc format):
   ```javascript
   /**
    * Authenticates a user with email and password.
    *
    * This function validates credentials, checks rate limiting,
    * and generates a JWT token on successful authentication.
    *
    * @param {string} email - User's email address
    * @param {string} password - User's password (will be hashed)
    * @param {Object} options - Optional configuration
    * @param {boolean} options.rememberMe - Whether to extend session duration
    * @returns {Promise<Object>} Authentication result with token and user info
    * @returns {string} returns.token - JWT authentication token
    * @returns {Object} returns.user - User object with id, email, name
    * @throws {AuthenticationError} If credentials are invalid
    * @throws {RateLimitError} If too many failed attempts
    *
    * @example
    * const result = await authenticate('user@example.com', 'password123');
    * console.log(result.token); // "eyJhbGciOiJIUzI1..."
    */
   function authenticate(email, password, options = {}) {
     // Implementation
   }
   ```

   **Python** (Google-style or NumPy-style docstrings):
   ```python
   def authenticate(email: str, password: str, remember_me: bool = False) -> dict:
       """Authenticates a user with email and password.

       This function validates credentials, checks rate limiting,
       and generates a JWT token on successful authentication.

       Args:
           email (str): User's email address
           password (str): User's password (will be hashed)
           remember_me (bool, optional): Whether to extend session duration.
               Defaults to False.

       Returns:
           dict: Authentication result containing:
               - token (str): JWT authentication token
               - user (dict): User object with id, email, name

       Raises:
           AuthenticationError: If credentials are invalid
           RateLimitError: If too many failed attempts

       Example:
           >>> result = authenticate('user@example.com', 'password123')
           >>> print(result['token'])
           'eyJhbGciOiJIUzI1...'
       """
       # Implementation
   ```

   **Go** (Godoc format):
   ```go
   // Authenticate validates user credentials and returns an authentication token.
   //
   // This function checks the provided email and password against the database,
   // validates rate limiting rules, and generates a JWT token on success.
   //
   // Parameters:
   //   - email: User's email address
   //   - password: User's password (will be hashed for comparison)
   //   - rememberMe: Whether to extend session duration
   //
   // Returns:
   //   - *AuthResult: Contains token and user information
   //   - error: AuthenticationError if credentials invalid, RateLimitError if too many attempts
   //
   // Example:
   //   result, err := Authenticate("user@example.com", "password123", false)
   //   if err != nil {
   //       log.Fatal(err)
   //   }
   //   fmt.Println(result.Token)
   func Authenticate(email, password string, rememberMe bool) (*AuthResult, error) {
       // Implementation
   }
   ```

   **Java** (Javadoc format):
   ```java
   /**
    * Authenticates a user with email and password.
    *
    * <p>This method validates credentials, checks rate limiting,
    * and generates a JWT token on successful authentication.</p>
    *
    * @param email User's email address
    * @param password User's password (will be hashed)
    * @param rememberMe Whether to extend session duration
    * @return AuthResult containing token and user information
    * @throws AuthenticationException if credentials are invalid
    * @throws RateLimitException if too many failed attempts
    *
    * @example
    * <pre>
    * AuthResult result = authenticate("user@example.com", "password123", false);
    * System.out.println(result.getToken());
    * </pre>
    */
   public AuthResult authenticate(String email, String password, boolean rememberMe)
       throws AuthenticationException, RateLimitException {
       // Implementation
   }
   ```

   **Ruby** (RDoc/YARD format):
   ```ruby
   ##
   # Authenticates a user with email and password.
   #
   # This method validates credentials, checks rate limiting,
   # and generates a JWT token on successful authentication.
   #
   # @param email [String] User's email address
   # @param password [String] User's password (will be hashed)
   # @param remember_me [Boolean] Whether to extend session duration
   # @return [Hash] Authentication result with :token and :user keys
   # @raise [AuthenticationError] if credentials are invalid
   # @raise [RateLimitError] if too many failed attempts
   #
   # @example
   #   result = authenticate('user@example.com', 'password123')
   #   puts result[:token]
   def authenticate(email, password, remember_me: false)
     # Implementation
   end
   ```

4. Add inline comments for complex logic:
   - Explain non-obvious algorithms
   - Clarify business logic decisions
   - Document workarounds or gotchas
   - Add TODO/FIXME/NOTE where appropriate

   ```javascript
   // Calculate compound interest using the formula: A = P(1 + r/n)^(nt)
   // where P = principal, r = rate, n = compounds per period, t = time
   const totalAmount = principal * Math.pow(1 + rate / compoundsPerYear, compoundsPerYear * years);

   // FIXME: This calculation doesn't account for leap years in daily compounding
   // TODO: Add support for continuous compounding
   ```

5. Document class/interface structures:
   - Class purpose and responsibilities
   - Property descriptions
   - Method documentation
   - Usage examples

6. Create Edit operations for each file:
   - Use Edit tool to add documentation to existing files
   - Preserve existing code exactly
   - Insert documentation at appropriate locations

**Output**: List of Edit operations performed, summary of files documented, coverage statistics

**Agent 4 - ADR Generator**

Generate Architecture Decision Records (ADRs) documenting key architectural choices.

**Tasks**:
1. Check if ADRs exist:
   - Look for: `docs/adr/`, `docs/decisions/`, `adr/`, `decisions/`
   - Read existing ADRs to understand format and what's documented

2. Identify architectural decisions from code analysis:
   - Major framework choices (why React vs Vue, why Flask vs Django)
   - Database choices (why PostgreSQL vs MongoDB)
   - Authentication strategies (why JWT vs sessions)
   - State management patterns (why Redux vs Context API)
   - API design choices (REST vs GraphQL)
   - Testing strategies (unit vs integration focus)
   - Deployment approaches (serverless vs containers)

3. For each significant decision, generate ADR using this structure:

   ```markdown
   # [Number]. [Title - Short noun phrase]

   Date: [YYYY-MM-DD]

   ## Status

   [Proposed | Accepted | Deprecated | Superseded]

   [If superseded: Superseded by [ADR-XXXX](./XXXX-title.md)]

   ## Context

   [2-3 paragraphs describing the context and background]

   What is the issue or situation we're addressing?
   What factors are driving this decision?
   What constraints do we face?

   ## Decision

   We will [decision statement].

   [Explain the decision in detail - what exactly are we doing?]

   ## Consequences

   ### Positive

   - [Benefit 1]
   - [Benefit 2]
   - [Benefit 3]

   ### Negative

   - [Tradeoff 1]
   - [Tradeoff 2]
   - [Risk 1]

   ### Neutral

   - [Other impact 1]
   - [Other impact 2]

   ## Alternatives Considered

   ### Alternative 1: [Name]

   [Description]

   **Why not chosen**: [Reason]

   ### Alternative 2: [Name]

   [Description]

   **Why not chosen**: [Reason]

   ## Implementation Notes

   - [Key implementation detail 1]
   - [Key implementation detail 2]
   - [Related files/modules]

   ## References

   - [Link to documentation]
   - [Link to discussion or RFC]
   - [Related ADRs]
   ```

4. Number ADRs sequentially:
   - Format: `0001-use-react-for-frontend.md`, `0002-adopt-jwt-authentication.md`
   - Find highest existing number and continue sequence

5. Create ADR index:
   - Generate `README.md` in ADR directory listing all decisions
   - Organized by status and date

**Output**: ADR files created, index generated, architectural decisions documented

**Agent 5 - Changelog Generator**

Generate CHANGELOG.md from git commit history following Keep a Changelog format.

**Tasks**:
1. Check if CHANGELOG.md exists:
   - If exists: Read to understand existing format
   - Determine where to insert new entries

2. Use Bash to analyze git history:
   ```bash
   git log --oneline --decorate --date=short --pretty=format:"%h|%ad|%s" --since="6 months ago"
   ```

3. Parse commit messages to categorize changes:
   - Added: New features
   - Changed: Changes to existing functionality
   - Deprecated: Soon-to-be removed features
   - Removed: Removed features
   - Fixed: Bug fixes
   - Security: Security fixes

   Common patterns:
   - "feat:", "feature:" → Added
   - "fix:", "bug:" → Fixed
   - "breaking:", "BREAKING CHANGE" → Changed (breaking)
   - "security:", "sec:" → Security
   - "refactor:" → Changed
   - "docs:" → skip or minimal mention
   - "chore:" → skip

4. Detect versions from git tags:
   ```bash
   git tag -l --sort=-version:refname
   ```

5. Generate changelog following Keep a Changelog format:

   ```markdown
   # Changelog

   All notable changes to this project will be documented in this file.

   The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
   and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

   ## [Unreleased]

   ### Added
   - New feature X that does Y
   - Support for Z configuration option

   ### Changed
   - Updated authentication flow to use JWT
   - Improved error messages for validation

   ### Fixed
   - Fixed crash when user input was empty
   - Corrected timezone handling in date picker

   ## [1.2.0] - 2024-01-15

   ### Added
   - Feature A
   - Feature B

   ### Changed
   - Breaking: API endpoint renamed from /api/v1/users to /api/v2/users

   ### Removed
   - Deprecated legacy authentication method

   ## [1.1.0] - 2023-12-01

   [Continue with older versions...]
   ```

6. If no git history available:
   - Generate template changelog
   - Add note: "Changelog to be populated with future releases"

**Output**: CHANGELOG.md content ready to write

**Agent 6 - Contributing Guide Generator**

Generate CONTRIBUTING.md with guidelines for contributors.

**Tasks**:
1. Check if CONTRIBUTING.md exists:
   - If exists: Read and enhance
   - If not: Generate from scratch

2. Generate comprehensive contributing guide:

   ```markdown
   # Contributing to [Project Name]

   Thank you for your interest in contributing to [Project Name]! This document provides
   guidelines and instructions for contributing to the project.

   ## Table of Contents

   - [Code of Conduct](#code-of-conduct)
   - [Getting Started](#getting-started)
   - [Development Setup](#development-setup)
   - [Making Changes](#making-changes)
   - [Testing](#testing)
   - [Code Style](#code-style)
   - [Commit Guidelines](#commit-guidelines)
   - [Pull Request Process](#pull-request-process)
   - [Reporting Bugs](#reporting-bugs)
   - [Feature Requests](#feature-requests)

   ## Code of Conduct

   This project follows a Code of Conduct. By participating, you are expected to
   uphold this code. Please be respectful and constructive in all interactions.

   ## Getting Started

   1. Fork the repository
   2. Clone your fork: `git clone [repo-url]`
   3. Add upstream remote: `git remote add upstream [original-repo-url]`
   4. Create a branch: `git checkout -b feature/your-feature-name`

   ## Development Setup

   [Include setup instructions from dependency analysis]

   ### Prerequisites

   - [Runtime version] (e.g., Node.js 18+)
   - [Database] (e.g., PostgreSQL 14+)
   - [Other tools]

   ### Installation

   ```bash
   # Clone the repository
   git clone [repo-url]
   cd [project]

   # Install dependencies
   [package manager install command]

   # Setup environment
   cp .env.example .env
   # Edit .env with your configuration

   # Setup database
   [database setup commands]

   # Run migrations
   [migration commands]

   # Start development server
   [start command]
   ```

   ## Making Changes

   1. **Keep changes focused**: One feature or fix per pull request
   2. **Write tests**: Add tests for new features or bug fixes
   3. **Update docs**: Update documentation for any changed functionality
   4. **Follow code style**: Adhere to the project's coding conventions

   ## Testing

   ```bash
   # Run all tests
   [test command]

   # Run specific test
   [specific test command]

   # Check test coverage
   [coverage command]
   ```

   Aim for >80% code coverage for new code.

   ## Code Style

   [Based on detected linters and formatters]

   - We use [ESLint/Prettier/Black/RuboCop/etc.] for code formatting
   - Run linter: `[lint command]`
   - Auto-fix issues: `[fix command]`

   ### Style Guidelines

   - [Language-specific guidelines]
   - [Naming conventions]
   - [File organization]

   ## Commit Guidelines

   We follow [Conventional Commits](https://www.conventionalcommits.org/).

   Format: `<type>(<scope>): <subject>`

   Types:
   - **feat**: New feature
   - **fix**: Bug fix
   - **docs**: Documentation changes
   - **style**: Code style changes (formatting, missing semicolons, etc.)
   - **refactor**: Code refactoring
   - **test**: Adding or updating tests
   - **chore**: Build process or auxiliary tool changes

   Examples:
   - `feat(auth): add JWT authentication`
   - `fix(api): handle null response in user endpoint`
   - `docs(readme): update installation instructions`

   ## Pull Request Process

   1. **Update your branch** with latest main:
      ```bash
      git fetch upstream
      git rebase upstream/main
      ```

   2. **Run tests and linting** locally before pushing

   3. **Push to your fork**:
      ```bash
      git push origin feature/your-feature-name
      ```

   4. **Create Pull Request**:
      - Use a clear, descriptive title
      - Reference any related issues (#123)
      - Describe what changed and why
      - Include screenshots for UI changes
      - List any breaking changes

   5. **Code Review**:
      - Respond to feedback constructively
      - Make requested changes
      - Push updates to your branch (PR will auto-update)

   6. **Merge**:
      - Maintainer will merge once approved
      - Delete your branch after merge

   ## Reporting Bugs

   Before creating a bug report:
   - Check existing issues for duplicates
   - Update to the latest version
   - Verify it's reproducible

   When creating a bug report, include:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, version, browser, etc.)
   - Error messages or logs
   - Screenshots if applicable

   ## Feature Requests

   We welcome feature requests! When submitting:
   - Clearly describe the feature and use case
   - Explain why it would be valuable
   - Consider implementation approach
   - Be open to discussion and alternatives

   ## Questions?

   - Check existing documentation
   - Search closed issues
   - Ask in [discussion forum/chat]
   - Open a new issue with "Question:" prefix

   ## License

   By contributing, you agree that your contributions will be licensed under
   the same license as the project ([License Name]).
   ```

3. Customize based on project characteristics:
   - Add language-specific guidelines
   - Include framework-specific conventions
   - Reference project-specific tools or workflows

**Output**: CONTRIBUTING.md content ready to write

**Critical**: Wait for all applicable documentation generation agents to complete before proceeding to Wave 4.

---

### 4. Validation & Formatting Wave (Quality Assurance)

**Purpose**: Validate generated documentation for accuracy, completeness, and proper formatting before finalizing.

Launch validation tasks sequentially or in small parallel groups:

**Step 1 - Markdown Validation**

Validate markdown formatting and structure.

**Tasks**:
- For each generated documentation file:
  - Check markdown syntax is valid
  - Verify heading hierarchy (no skipped levels)
  - Check links are well-formed
  - Verify code fences have language tags
  - Check tables are properly formatted
  - Ensure lists are consistently formatted
  - Verify no broken internal links

**Validation checks**:
- Use Grep to find common markdown errors:
  - Broken links: `[text]()`, `[text]( )`
  - Missing code fence languages: ` ``` ` without language
  - Invalid table syntax
  - Inconsistent list markers (mixing - and *)
- Read generated files and review for:
  - Proper heading structure (# → ## → ###, no skips)
  - Consistent formatting throughout
  - Proper use of bold, italic, code formatting

**Fix issues found**:
- Use Edit tool to correct formatting problems
- Standardize list markers
- Add language tags to code fences
- Fix heading hierarchy

**Step 2 - Code Example Validation**

Validate that code examples are syntactically correct.

**Tasks**:
- Extract code examples from generated documentation
- For each example, based on language:
  - **JavaScript/TypeScript**: Check for obvious syntax errors (missing braces, quotes, etc.)
  - **Python**: Check indentation, colons, basic syntax
  - **JSON**: Validate JSON is well-formed (matching braces, proper quotes)
  - **Shell commands**: Check for common mistakes (unclosed quotes, invalid flags)

**Validation approach**:
- Use language-specific syntax checkers if available:
  - JavaScript: Node.js syntax check: `node --check example.js`
  - Python: `python -m py_compile example.py`
  - JSON: `python -m json.tool example.json`
- For inline examples, extract to temp file, validate, then delete
- If syntax error found:
  - Fix if simple (missing comma, quote, brace)
  - Or add comment: `// Note: This is pseudocode for illustration`

**Step 3 - Content Accuracy Review**

Review generated content for accuracy and completeness.

**Tasks**:
- **Cross-reference verification**:
  - Verify package versions mentioned match actual package.json
  - Check commands mentioned actually exist in package.json scripts
  - Verify file paths referenced actually exist
  - Check environment variables documented match code usage

- **Completeness check**:
  - README: All essential sections present
  - API docs: All endpoints from analysis documented
  - Code docs: All public functions documented
  - Examples: Cover main use cases

- **Consistency check**:
  - Terminology used consistently
  - Commands formatted consistently
  - Code style consistent across examples
  - Version numbers consistent

**Use Glob and Grep** to verify references:
- Check files mentioned in docs exist
- Verify environment variables in docs are used in code
- Confirm API endpoints in docs match route definitions

**Step 4 - Table of Contents Generation**

Generate or update tables of contents for longer documentation files.

**Tasks**:
- For README.md and other long files (>200 lines):
  - Extract all headings (##, ###, etc.)
  - Generate TOC with anchor links
  - Insert TOC after main title and description
  - Use proper indentation for heading levels

**TOC format**:
```markdown
## Table of Contents

- [Section 1](#section-1)
  - [Subsection 1.1](#subsection-11)
  - [Subsection 1.2](#subsection-12)
- [Section 2](#section-2)
```

**Anchor link format**: Convert heading to lowercase, replace spaces with hyphens, remove special chars

**Step 5 - Documentation Saving**

Save all generated and validated documentation to appropriate locations.

**Tasks**:
1. Determine save locations:
   - **README.md**: Project root
   - **API.md**: `docs/api.md` or `docs/API.md`
   - **CHANGELOG.md**: Project root
   - **CONTRIBUTING.md**: Project root or `docs/CONTRIBUTING.md`
   - **ADRs**: `docs/adr/` or `docs/decisions/`
   - **Code docs**: Edit existing source files in place

2. For each documentation file:
   - If file doesn't exist: Use Write tool to create
   - If file exists: Use Edit tool to update (preserve custom sections)
   - Backup strategy: If replacing significant content, consider saving old version

3. Create docs directory structure if needed:
   ```bash
   mkdir -p docs/adr
   mkdir -p docs/api
   ```

4. Save all documentation files using Write or Edit tools

5. Generate documentation manifest (optional):
   - Create `docs/README.md` or `.docs-manifest.md`
   - List all documentation files with descriptions
   - Provide quick links to each doc

**Step 6 - Validation Report Generation**

Generate comprehensive validation report.

**Tasks**:
- Compile validation results:
  - Files created/updated
  - Markdown issues found and fixed
  - Code examples validated
  - Accuracy checks performed
  - Completeness assessment
  - Any warnings or issues remaining

- Generate statistics:
  - Total documentation files generated
  - Lines of documentation added
  - Functions/classes documented
  - API endpoints documented
  - Code examples included
  - Coverage: % of code documented

**Output format**:
```
Documentation Validation Report

✓ Markdown Validation
  - 5 files validated
  - 3 formatting issues fixed
  - All headings properly structured
  - All links valid

✓ Code Examples
  - 23 code examples validated
  - 2 syntax errors corrected
  - All examples include language tags

✓ Accuracy Checks
  - Package versions verified
  - File paths verified
  - Commands verified in package.json
  - Environment variables cross-referenced

✓ Completeness
  - README: Complete (all sections)
  - API docs: 15/15 endpoints documented
  - Code docs: 87% function coverage
  - Examples: 8 use cases covered

⚠ Warnings
  - 3 TODO comments added for manual review
  - 1 complex function needs more detailed explanation

📊 Statistics
  - Files created: 6
  - Files updated: 12
  - Lines of documentation: 2,847
  - Functions documented: 156
  - API endpoints documented: 15
  - Code examples: 23
```

**Critical**: After all validation steps complete, proceed to final output.

---

## Execution Guidelines

### Parallelization Rules

**Wave 2 (Content Analysis)**: Always launch all 4 agents in SINGLE message with multiple Task calls.

**Wave 3 (Documentation Generation)**: Launch applicable agents in parallel based on TARGET type:
- README or ALL: Launch Agents 1, 3, 6 in parallel
- API or ALL: Launch Agents 2, 3 in parallel
- CODE: Launch Agent 3 only
- ADR: Launch Agent 4 only
- CHANGELOG: Launch Agent 5 only
- ALL: Launch Agents 1, 2, 3, 4, 5, 6 in parallel (if all applicable)

**Wave 4 (Validation)**: Execute steps sequentially as each may depend on previous validation fixes.

### Documentation Type Handling

**README** (default):
- Wave 2: All 4 analysis agents
- Wave 3: Agents 1 (README) and 6 (Contributing)
- Focus: Comprehensive project overview

**API**:
- Wave 2: All 4 analysis agents (focus on Agent 2 - API Mapper)
- Wave 3: Agents 2 (API docs) and optionally 1 (brief README with API overview)
- Focus: Detailed endpoint documentation

**CODE**:
- Wave 2: Agents 1 (Code Structure) and 4 (Usage Patterns)
- Wave 3: Agent 3 (Code Documentation)
- Focus: Inline docs and docstrings

**ADR**:
- Wave 2: Agents 1 (Code Structure) and 3 (Configuration)
- Wave 3: Agent 4 (ADR Generator)
- Focus: Architecture decisions

**CHANGELOG**:
- Wave 2: Skip (not needed)
- Wave 3: Agent 5 (Changelog)
- Focus: Git history analysis

**ALL**:
- Wave 2: All 4 analysis agents
- Wave 3: All 6 documentation agents
- Focus: Complete documentation suite

**File path** (e.g., `src/utils/validator.js`):
- Wave 2: Read target file(s) only
- Wave 3: Agent 3 (Code Documentation) for those files
- Focus: Document specific file(s)

### Context Management

**After Wave 2**: Consolidate findings into 1500-2500 token content map covering:
- Project overview
- Structure map
- API catalog (if applicable)
- Dependencies & setup
- Usage patterns
- Documentation gaps

**Wave 3 Input**: Pass content map to each documentation generation agent. Each agent extracts relevant sections for their documentation type.

**Wave 4 Input**: Access generated documentation files directly for validation.

### Error Handling

**Invalid TARGET path**:
```
Error: Path '[path]' does not exist.

Valid options:
- README (generate README.md)
- API (generate API documentation)
- CODE (add inline documentation)
- ADR (generate Architecture Decision Records)
- ALL (generate comprehensive documentation)
- Or provide a valid file/directory path

Examples:
  /document
  /document README
  /document API
  /document src/utils/
  /document src/auth/login.js
```

**No code found in target**:
- Display warning: "No source code found in [target]"
- Offer to generate documentation template
- Suggest checking path or project structure

**Git history unavailable** (for CHANGELOG):
- Display: "No git repository found, cannot generate CHANGELOG from history"
- Generate template CHANGELOG for manual population
- Continue with other documentation

**Cannot write documentation files**:
- Check file permissions
- Try alternative location
- Display error with suggested manual steps

**Code documentation conflicts**:
- If file already has documentation: Enhance rather than replace
- Preserve existing doc comments that look good
- Only add documentation where missing

### Adaptive Scaling

**Small project** (<20 files):
- Shorter documentation
- Focus on essentials
- Concise examples
- Quick validation

**Medium project** (20-100 files):
- Standard comprehensive documentation
- Multiple examples
- Detailed API docs
- Thorough validation

**Large project** (100+ files):
- Focus on high-level architecture
- Document public APIs thoroughly
- Sample important modules rather than documenting everything
- Prioritize entry points and critical paths
- Consider suggesting documentation in phases

**Project with existing docs**:
- Read all existing documentation first
- Merge mode: enhance and fill gaps rather than replace
- Preserve tone and style of existing docs
- Add missing sections
- Update outdated information

---

## Output Format

### Final User-Facing Output

After all waves complete successfully, display:

```
✓ Documentation Generation Complete

📝 Documentation Analysis:
- Project Type: [detected type]
- Primary Language: [language]
- Target: [what was documented]
- Scope: [README / API / CODE / ALL]

📊 Content Analysis Summary:
- Source files analyzed: [count]
- Functions/classes found: [count]
- API endpoints identified: [count]
- Dependencies analyzed: [count]
- Usage patterns extracted: [count]

📄 Documentation Generated:

✓ README.md
  - 847 lines
  - 12 sections
  - 8 code examples
  - Installation, usage, and contribution guidelines included

✓ docs/api.md
  - 15 endpoints documented
  - Request/response examples for each
  - Authentication requirements specified
  - curl examples provided

✓ Code Documentation
  - 156 functions documented
  - JSDoc comments added
  - 23 usage examples included
  - Coverage: 87% of public functions

✓ CONTRIBUTING.md
  - Development setup guide
  - Code style guidelines
  - PR process documented
  - Testing requirements specified

✓ docs/adr/
  - 3 Architecture Decision Records created
  - Key technical decisions documented
  - Rationale and consequences explained

✓ CHANGELOG.md
  - Generated from git history
  - 3 versions documented
  - Organized by change type
  - Follows Keep a Changelog format

✅ Validation Results:
- All markdown properly formatted
- 23 code examples syntax-validated
- Cross-references verified
- Tables of contents generated
- No critical issues found

⚠ Manual Review Recommended:
- 2 complex functions may need more detailed explanation
- Consider adding diagrams for architecture overview
- Verify API authentication examples with your setup

📁 Files Created/Updated:
- /README.md (created)
- /docs/api.md (created)
- /docs/adr/0001-use-react.md (created)
- /docs/adr/0002-jwt-authentication.md (created)
- /docs/adr/0003-postgresql-database.md (created)
- /CONTRIBUTING.md (created)
- /CHANGELOG.md (created)
- /src/auth/login.js (updated with documentation)
- /src/utils/validator.js (updated with documentation)
- [... additional files ...]

🎯 Next Steps:
1. Review generated documentation for accuracy
2. Add project-specific details where TODOs are marked
3. Consider adding screenshots or diagrams to README
4. Update documentation as code evolves
5. Commit documentation to version control

💡 Pro Tips:
- Keep documentation up-to-date with code changes
- Use /document CODE [file] to document specific files
- Re-run /document README when major features are added
- Use /document CHANGELOG after releases
```

**For README-only documentation**:
```
✓ README Documentation Complete

📝 README.md Generated:
- Project overview and features
- Installation instructions ([package manager] detected)
- Quick start guide with examples
- Configuration options documented
- Tech stack: [frameworks and tools]
- Development and testing instructions
- Contribution guidelines

✓ Validation:
- All markdown properly formatted
- 8 code examples validated
- Commands verified in package.json
- File paths checked

📁 File Created:
- /README.md (1,247 lines)

🎯 Next Steps:
1. Review README for accuracy and completeness
2. Add project logo or screenshots if desired
3. Update project description and features as needed
4. Commit to version control
```

**For API documentation**:
```
✓ API Documentation Complete

📝 API Documentation Generated:
- 15 endpoints documented
- Request parameters (path, query, body) specified
- Request/response examples for all endpoints
- Authentication requirements explained
- Error codes and messages documented
- curl examples provided

✓ Endpoints Documented:
  Authentication:
  - POST /api/auth/login
  - POST /api/auth/register
  - POST /api/auth/logout

  Users:
  - GET /api/users
  - GET /api/users/:id
  - PUT /api/users/:id
  - DELETE /api/users/:id

  [... additional endpoints ...]

✓ Validation:
- All JSON examples validated
- curl commands tested for syntax
- Status codes verified

📁 File Created:
- /docs/api.md (1,456 lines)

🎯 Next Steps:
1. Verify authentication flow is accurate
2. Test curl examples with your API
3. Consider adding Postman collection link
4. Keep updated as API evolves
```

**For code documentation**:
```
✓ Code Documentation Complete

📝 Inline Documentation Added:
- 156 functions documented
- JSDoc/docstrings added
- Parameter descriptions included
- Return types specified
- Usage examples provided
- Complex logic explained with comments

📊 Coverage:
- Public functions: 87% documented
- Classes: 100% documented
- Methods: 92% documented
- Complex algorithms: All commented

📁 Files Updated:
- /src/auth/login.js (12 functions documented)
- /src/utils/validator.js (8 functions documented)
- /src/api/controllers/userController.js (15 functions documented)
- [... additional files ...]

✓ Validation:
- Documentation format correct for [language]
- Type annotations validated
- Examples syntax-checked

🎯 Next Steps:
1. Review generated documentation for accuracy
2. Expand complex function examples if needed
3. Run documentation generator (JSDoc, Sphinx, etc.) if applicable
4. Maintain documentation with code changes
```

---

## Success Criteria

Documentation generation workflow is complete when:

- ✓ TARGET validated and documentation scope determined
- ✓ Wave 2: All 4 analysis agents completed (or appropriate subset)
- ✓ Content map consolidated with structure, APIs, dependencies, usage patterns
- ✓ Wave 3: All applicable documentation generation agents completed
- ✓ Documentation content generated according to type (README, API, CODE, etc.)
- ✓ Wave 4: All validation steps completed
- ✓ Markdown validated and formatted correctly
- ✓ Code examples syntax-checked
- ✓ Content accuracy verified
- ✓ Documentation files saved to appropriate locations
- ✓ User receives comprehensive summary with file locations and next steps
- ✓ Documentation is accurate, complete, and production-ready

---

## Usage Examples

**Generate README for current project**:
```
/document
/document README
```

**Generate API documentation**:
```
/document API
```

**Add inline code documentation**:
```
/document CODE
/document src/utils/
/document src/auth/login.js
```

**Generate Architecture Decision Records**:
```
/document ADR
```

**Generate changelog from git history**:
```
/document CHANGELOG
```

**Generate complete documentation suite**:
```
/document ALL
```

**Document specific module**:
```
/document src/api/
/document lib/authentication/
```

---

## Notes

- **Accuracy first**: Generated documentation is based on actual code analysis, not assumptions
- **Comprehensive coverage**: Analyzes structure, APIs, dependencies, and usage patterns for complete picture
- **Language-aware**: Generates documentation in appropriate format for each programming language
- **Merge-friendly**: Enhances existing documentation rather than blindly replacing
- **Production-ready**: Output is properly formatted, validated, and ready for use
- **Time-saving**: Automates documentation that would take hours manually
- **Maintainable**: Clear structure makes it easy to keep documentation up-to-date
- **Best practices**: Follows industry-standard documentation formats (JSDoc, Keep a Changelog, etc.)
- **Flexible scope**: Works for entire projects or specific files/modules
- **Privacy**: All analysis is performed locally on your codebase
