---
description: Generate comprehensive test suites with intelligent test case design
argument-hint: [target-file-or-directory]
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
model: claude-sonnet-4-5-20250929
---

# Test Generator

Orchestrate a sophisticated multi-wave agent workflow to generate comprehensive, intelligent test suites for existing code. This command analyzes source code, identifies test gaps, designs test cases, implements tests following project conventions, and validates the generated tests run successfully. Uses parallel agent execution within waves with synchronization points for maximum efficiency and accuracy.

## Variables

TARGET: $ARGUMENTS (defaults to current directory if not provided)

## Workflow

### 1. Validation & Framework Detection

**Purpose**: Validate target and detect testing framework before proceeding.

**Steps**:
1. If `TARGET` is empty, use current working directory (`.`)
2. Verify target exists (file or directory):
   - Use Bash: `test -e "$TARGET" && echo "exists" || echo "not found"`
   - If not found:
     - Display error: "Target '[TARGET]' not found. Please verify the path."
     - Suggest: "Usage: /testgen [file-or-directory]"
     - STOP immediately
3. Determine target type:
   - If file: Validate it's a source code file (not binary, not config)
   - If directory: Estimate scope (file count, LOC)
4. Detect project testing framework by searching for:
   - **JavaScript/TypeScript**:
     - Grep package.json for: "jest", "vitest", "mocha", "jasmine", "@testing-library"
     - Look for config files: jest.config.js, vitest.config.js, mocha.opts
   - **Python**:
     - Grep requirements.txt, setup.py, pyproject.toml for: "pytest", "unittest", "nose"
     - Look for: pytest.ini, setup.cfg, tox.ini
   - **Java**:
     - Grep pom.xml, build.gradle for: "junit", "testng"
     - Look for test directories: src/test/java
   - **Go**:
     - Look for: *_test.go files (built-in testing)
     - Grep go.mod for: "testify", "ginkgo"
   - **Ruby**:
     - Grep Gemfile for: "rspec", "minitest"
     - Look for: spec/ directory
5. If no testing framework detected:
   - Warn: "No testing framework detected in project."
   - Suggest: "Consider installing one of: [Jest, Pytest, JUnit, etc.]"
   - Ask: "Continue without framework detection? (May generate generic tests)"
   - If user confirms, continue; otherwise STOP
6. Display analysis scope:
   - "Target: [TARGET]"
   - "Type: [file/directory]"
   - "Framework: [detected framework]"
   - "Estimated files to test: [N]"
   - "Starting test generation..."

---

### 2. Test Gap Analysis Wave (Parallel Reconnaissance)

**Purpose**: Analyze source code and identify what needs testing.

Launch 3 agents **IN PARALLEL** (single message with multiple Task calls):

**Agent 1 - Source Code Analyzer**

Analyze source files to identify testable units and their characteristics.

**Tasks**:
- Use Glob to find all source files in TARGET:
  - JavaScript/TypeScript: `**/*.js`, `**/*.ts`, `**/*.jsx`, `**/*.tsx`
  - Python: `**/*.py`
  - Java: `**/*.java`
  - Go: `**/*.go`
  - Ruby: `**/*.rb`
  - Exclude: test files, node_modules, dist, build, vendor, __pycache__
- For each source file, use Read to analyze:
  - **Functions/Methods**: Identify all function signatures, parameters, return types
  - **Classes**: Identify class names, constructors, public/private methods
  - **Exports**: What is exported and available for testing
  - **Dependencies**: What external modules/classes does it depend on
  - **Complexity**: Estimate complexity (lines per function, nesting depth, branching)
  - **Side effects**: I/O operations, API calls, database access, file operations
- Categorize functions by type:
  - Pure functions (no side effects, deterministic)
  - Impure functions (side effects, I/O, randomness)
  - Async functions (promises, async/await)
  - Class methods (instance methods, static methods)
  - Utility functions vs. business logic
- Identify edge cases from code:
  - Boundary values (0, -1, MAX_INT, empty strings)
  - Null/undefined handling
  - Array bounds (empty arrays, single element, large arrays)
  - Error handling (try/catch blocks, error returns)
  - Type validations (type checks, instanceof)

**Output**: Comprehensive source analysis including:
- Total testable units: [count]
- Functions by type: [pure: N, impure: N, async: N, class methods: N]
- Files analyzed: [list with line counts]
- Complexity hotspots: [functions with high complexity]
- Functions requiring mocks: [functions with external dependencies]
- Identified edge cases: [boundary conditions, null checks, error paths]
- Test priority recommendations: [high/medium/low priority units]

**Agent 2 - Existing Test Analyzer**

Analyze existing tests to identify coverage gaps.

**Tasks**:
- Use Glob to find existing test files:
  - JavaScript/TypeScript: `**/*.test.js`, `**/*.test.ts`, `**/*.spec.js`, `**/*.spec.ts`, `**/__tests__/**/*`
  - Python: `**/test_*.py`, `**/*_test.py`, `**/tests/**/*.py`
  - Java: `**/src/test/**/*.java`, `**/*Test.java`
  - Go: `**/*_test.go`
  - Ruby: `**/spec/**/*_spec.rb`
- For each test file, use Read to analyze:
  - What source files are being tested
  - What functions/methods have test coverage
  - What test types exist (unit, integration, edge cases, error cases)
  - Test patterns used (mocking strategy, assertion style, test structure)
- Calculate coverage gaps:
  - Functions with no tests
  - Functions with only happy path tests (missing edge cases)
  - Missing error handling tests
  - Missing integration tests
- Identify test file naming conventions:
  - Placement: same directory, __tests__ folder, parallel test directory
  - Naming: *.test.js, *.spec.js, test_*.py pattern
  - Structure: describe/it blocks, test classes, function-based tests

**Output**: Test coverage analysis including:
- Existing test files: [count and list]
- Coverage status: [X% of functions have tests]
- Untested functions: [list with file paths]
- Functions with incomplete coverage: [list with missing test types]
- Test file conventions: [naming, placement, structure patterns]
- Test patterns observed: [mocking approach, assertion style, fixture usage]
- Testing framework features used: [hooks, fixtures, parameterization, mocking]

**Agent 3 - Test Infrastructure Scout**

Identify test infrastructure, utilities, and conventions.

**Tasks**:
- Search for test utilities and helpers:
  - Use Glob: `**/test-utils.*`, `**/test-helpers.*`, `**/testUtils.*`, `**/fixtures/**/*`, `**/mocks/**/*`
  - Use Grep to find: custom test helpers, factory functions, shared fixtures
- Analyze test infrastructure patterns:
  - Setup/teardown patterns (beforeEach, afterEach, setUp, tearDown)
  - Fixture management (how test data is created)
  - Mock strategies (manual mocks, auto-mocking, spy usage)
  - Assertion libraries (expect, assert, should, chai)
- Search for test configuration:
  - Coverage settings (coverage thresholds, reporters)
  - Test environment setup (JSDOM, test databases, API mocks)
  - Custom matchers or assertions
  - Global test setup files
- Identify integration test patterns:
  - How are external services mocked (databases, APIs, file systems)
  - How are components integrated in tests
  - Test database patterns (in-memory, fixtures, transactions)

**Output**: Test infrastructure summary including:
- Test utilities available: [list with file paths and purpose]
- Fixture patterns: [how fixtures are created and managed]
- Mocking patterns: [mocking strategy and tools used]
- Setup/teardown conventions: [common setup patterns]
- Custom assertions: [custom matchers or assertion helpers]
- Integration test infrastructure: [how integration tests work]
- Configuration settings: [coverage thresholds, reporters, environment]

**Critical**: Wait for ALL 3 agents to complete before proceeding.

**Consolidation Step** (1500-2000 tokens):
Synthesize findings into comprehensive test gap report:

1. **Coverage Status**:
   - Total testable units: [N]
   - Units with tests: [N] ([X]%)
   - Units without tests: [N] ([X]%)
   - Units with incomplete tests: [N]

2. **Test Priorities**:
   - **HIGH Priority** (untested critical functions):
     - [Function 1: reason for high priority]
     - [Function 2: reason for high priority]
   - **MEDIUM Priority** (untested utility functions):
     - [Function list]
   - **LOW Priority** (simple functions, already covered):
     - [Function list]

3. **Test Requirements**:
   - Unit tests needed: [N functions]
   - Edge case tests needed: [N functions]
   - Error handling tests needed: [N functions]
   - Integration tests needed: [N components]
   - Mock setup needed: [N dependencies]

4. **Test Conventions**:
   - Framework: [detected framework]
   - File naming: [pattern]
   - File placement: [pattern]
   - Test structure: [describe/it, test functions, etc.]
   - Assertion style: [expect, assert, should]
   - Mocking approach: [manual mocks, jest.mock, sinon, etc.]

---

### 3. Test Case Design Wave (Parallel Test Planning)

**Purpose**: Design comprehensive test cases for each untested or under-tested unit.

Launch 4 agents **IN PARALLEL** (single message with multiple Task calls):

**Agent 1 - Unit Test Designer**

Design unit tests for pure functions and simple methods.

**Tasks**:
- For each untested function (prioritizing HIGH priority):
  - Read function source code
  - Identify function signature: parameters, return type, purpose
  - Design happy path tests:
    - Typical inputs with expected outputs
    - Multiple scenarios covering normal usage
  - Specify test structure:
    - Test description (what is being tested)
    - Input values (concrete test data)
    - Expected output (exact expected result)
    - Assertions to use

**Output**: Unit test specifications for each function:
```
Function: calculateTotal(items)
File: src/utils/pricing.js

Test 1: should calculate total for multiple items
  Input: [{price: 10, quantity: 2}, {price: 5, quantity: 3}]
  Expected: 35
  Assertions: expect(result).toBe(35)

Test 2: should return 0 for empty array
  Input: []
  Expected: 0
  Assertions: expect(result).toBe(0)

Test 3: should handle single item
  Input: [{price: 15, quantity: 1}]
  Expected: 15
  Assertions: expect(result).toBe(15)
```

**Agent 2 - Edge Case Test Designer**

Design tests for edge cases and boundary conditions.

**Tasks**:
- For each function, identify edge cases from code analysis:
  - **Boundary values**:
    - Empty inputs (empty string, empty array, empty object)
    - Zero values (0, 0.0, -0)
    - Negative values
    - Large values (MAX_INT, very large arrays)
    - Single-element collections
  - **Null/undefined handling**:
    - Null parameters
    - Undefined parameters
    - Missing optional parameters
  - **Type boundaries**:
    - Wrong types passed (string instead of number)
    - Special values (NaN, Infinity, null, undefined)
  - **Array/string boundaries**:
    - Empty collections
    - Single element
    - Very large collections
    - Out-of-bounds access
- Design test for each edge case:
  - Test description
  - Edge case input
  - Expected behavior (return value, thrown error, default value)

**Output**: Edge case test specifications:
```
Function: getUserById(id)
File: src/services/userService.js

Edge Case 1: should return null for non-existent user
  Input: id = 99999
  Expected: null
  Assertions: expect(result).toBeNull()

Edge Case 2: should throw error for null id
  Input: id = null
  Expected: throws TypeError
  Assertions: expect(() => getUserById(null)).toThrow(TypeError)

Edge Case 3: should handle id = 0
  Input: id = 0
  Expected: user object or null (based on data)
  Assertions: expect(result).toBeDefined()
```

**Agent 3 - Error Handling Test Designer**

Design tests for error conditions and exception handling.

**Tasks**:
- For each function with error handling:
  - Identify error conditions from code:
    - Try/catch blocks (what exceptions are caught)
    - Error returns (functions that return error objects)
    - Validation errors (invalid input rejection)
    - Network/I/O errors (API failures, file not found)
  - Design error test cases:
    - Invalid inputs that should trigger errors
    - Expected error types (TypeError, ValidationError, etc.)
    - Expected error messages
    - Error recovery behavior
  - Design tests for error path coverage:
    - What happens in catch blocks
    - Fallback behavior
    - Error logging or reporting

**Output**: Error handling test specifications:
```
Function: createUser(userData)
File: src/services/userService.js

Error Test 1: should throw ValidationError for missing email
  Input: {name: "John", email: ""}
  Expected: throws ValidationError("Email is required")
  Assertions:
    - expect(() => createUser(data)).toThrow(ValidationError)
    - expect(() => createUser(data)).toThrow("Email is required")

Error Test 2: should handle database connection failure
  Setup: Mock database to throw connection error
  Input: {name: "John", email: "john@example.com"}
  Expected: throws DatabaseError
  Assertions: expect(createUser).rejects.toThrow(DatabaseError)

Error Test 3: should validate email format
  Input: {name: "John", email: "invalid-email"}
  Expected: throws ValidationError("Invalid email format")
  Assertions: expect(() => createUser(data)).toThrow("Invalid email format")
```

**Agent 4 - Integration & Async Test Designer**

Design integration tests and async function tests.

**Tasks**:
- For async functions:
  - Identify promises and async/await patterns
  - Design async test cases:
    - Successful promise resolution
    - Promise rejection handling
    - Async error handling
    - Timeouts and delays
  - Specify async test patterns (async/await, .resolves, .rejects)
- For functions with dependencies:
  - Identify external dependencies (databases, APIs, file system, modules)
  - Design integration scenarios:
    - Component interaction tests
    - Multiple function call sequences
    - State changes across function calls
  - Specify mock requirements:
    - What needs to be mocked
    - Mock return values
    - Mock implementations
    - Spy requirements (verify calls, arguments)

**Output**: Integration and async test specifications:
```
Function: fetchUserData(userId)
File: src/api/userApi.js

Async Test 1: should fetch user data successfully
  Setup: Mock axios.get to resolve with user data
  Input: userId = 123
  Expected: resolves to user object {id: 123, name: "John"}
  Assertions:
    - await expect(fetchUserData(123)).resolves.toEqual({id: 123, name: "John"})
    - expect(axios.get).toHaveBeenCalledWith('/api/users/123')

Async Test 2: should handle API error
  Setup: Mock axios.get to reject with 404 error
  Input: userId = 999
  Expected: rejects with ApiError
  Assertions: await expect(fetchUserData(999)).rejects.toThrow(ApiError)

Integration Test: should update cache after fetch
  Setup: Mock axios.get and cache.set
  Input: userId = 123
  Expected: cache.set called with user data
  Assertions:
    - await fetchUserData(123)
    - expect(cache.set).toHaveBeenCalledWith('user:123', userData)
```

**Critical**: Wait for ALL 4 agents to complete before proceeding.

**Consolidation Step** (1500-2000 tokens):
Consolidate all test designs into unified test plan:

1. **Test Summary**:
   - Total test cases designed: [N]
   - Unit tests: [N]
   - Edge case tests: [N]
   - Error handling tests: [N]
   - Integration/async tests: [N]

2. **Test Specifications by File**:
   - Group tests by source file
   - Organize by test type within each file
   - Include all input/output specifications
   - Include mock requirements

3. **Mock Requirements**:
   - External dependencies to mock: [list]
   - Mock implementations needed: [list]
   - Fixture data required: [list]

---

### 4. Test Implementation Wave (Parallel Test Writing)

**Purpose**: Generate actual test code following project conventions.

Launch 4 agents **IN PARALLEL** (single message with multiple Task calls):

**Agent 1 - Unit Test Writer**

Generate unit test code from specifications.

**Tasks**:
- For each unit test specification:
  - Read source file to understand implementation details
  - Generate test code using detected framework syntax:
    - **Jest/Vitest**: describe/it blocks, expect assertions
    - **Pytest**: test_ functions, assert statements
    - **JUnit**: @Test annotations, assertEquals
    - **Go**: TestXxx functions, t.Errorf
    - **RSpec**: describe/it blocks, expect().to
  - Follow project test conventions:
    - Match existing test file structure
    - Use same assertion style
    - Follow naming conventions
  - Include:
    - Clear test descriptions
    - Setup code if needed
    - Test execution
    - Assertions with clear messages
    - Comments explaining complex test logic
- Generate complete test files with:
  - Imports/requires for framework and source code
  - Test suite structure (describe blocks)
  - All unit test cases
  - Proper formatting and indentation

**Output**: Complete unit test files:
```javascript
// src/utils/pricing.test.js
import { calculateTotal } from './pricing';

describe('calculateTotal', () => {
  it('should calculate total for multiple items', () => {
    const items = [
      { price: 10, quantity: 2 },
      { price: 5, quantity: 3 }
    ];
    const result = calculateTotal(items);
    expect(result).toBe(35);
  });

  it('should return 0 for empty array', () => {
    const result = calculateTotal([]);
    expect(result).toBe(0);
  });

  it('should handle single item', () => {
    const items = [{ price: 15, quantity: 1 }];
    const result = calculateTotal(items);
    expect(result).toBe(15);
  });
});
```

**Agent 2 - Edge Case Test Writer**

Generate edge case test code from specifications.

**Tasks**:
- For each edge case specification:
  - Generate test code with edge case inputs
  - Use appropriate assertions for edge cases:
    - toBeNull(), toBeUndefined() for null checks
    - toThrow() for expected errors
    - toBe(0), toBe('') for boundary values
  - Include clear test descriptions mentioning the edge case
  - Add comments explaining why edge case is important
- Group edge case tests logically:
  - Group by edge case type (null handling, boundaries, etc.)
  - Place in appropriate test suites
- Handle different edge case patterns:
  - Null/undefined checks
  - Empty collection handling
  - Boundary value testing
  - Type edge cases

**Output**: Edge case test code integrated into test files:
```javascript
describe('getUserById', () => {
  // ... happy path tests ...

  describe('edge cases', () => {
    it('should return null for non-existent user', () => {
      const result = getUserById(99999);
      expect(result).toBeNull();
    });

    it('should handle id = 0', () => {
      const result = getUserById(0);
      expect(result).toBeDefined();
    });

    it('should handle very large id', () => {
      const result = getUserById(Number.MAX_SAFE_INTEGER);
      expect(result).toBeDefined();
    });
  });
});
```

**Agent 3 - Error Handling Test Writer**

Generate error handling test code from specifications.

**Tasks**:
- For each error handling specification:
  - Generate test code that triggers errors
  - Use appropriate error assertion patterns:
    - **Jest**: expect().toThrow(), expect().rejects.toThrow()
    - **Pytest**: pytest.raises(), with pytest.raises(Exception)
    - **JUnit**: @Test(expected=Exception.class), assertThrows()
    - **Go**: if err == nil { t.Error("expected error") }
  - Test both error occurrence and error messages
  - For async errors, use proper async error handling
- Structure error tests clearly:
  - Separate describe block for error cases
  - Clear test names indicating error condition
  - Setup code to trigger errors (invalid inputs, mocked failures)
- Include error recovery tests:
  - Verify graceful degradation
  - Test fallback behavior
  - Verify error logging if applicable

**Output**: Error handling test code:
```javascript
describe('createUser', () => {
  // ... happy path tests ...

  describe('error handling', () => {
    it('should throw ValidationError for missing email', () => {
      const userData = { name: 'John', email: '' };
      expect(() => createUser(userData)).toThrow(ValidationError);
      expect(() => createUser(userData)).toThrow('Email is required');
    });

    it('should throw ValidationError for invalid email format', () => {
      const userData = { name: 'John', email: 'invalid-email' };
      expect(() => createUser(userData)).toThrow('Invalid email format');
    });

    it('should handle database connection failure', async () => {
      // Mock database to throw error
      jest.spyOn(database, 'insert').mockRejectedValue(
        new DatabaseError('Connection failed')
      );

      const userData = { name: 'John', email: 'john@example.com' };
      await expect(createUser(userData)).rejects.toThrow(DatabaseError);
    });
  });
});
```

**Agent 4 - Mock & Async Test Writer**

Generate integration tests with mocks and async tests.

**Tasks**:
- For each async/integration specification:
  - Generate async test code:
    - Use async/await in test functions
    - Use .resolves/.rejects matchers for promises
    - Handle promise resolution/rejection properly
  - Generate mock setup code:
    - **Jest**: jest.mock(), jest.spyOn(), mockResolvedValue()
    - **Pytest**: unittest.mock, @patch decorator
    - **Go**: Mock interfaces, test doubles
    - **Sinon**: sinon.stub(), sinon.spy() (for Mocha)
  - Create test fixtures:
    - Sample data for mocks
    - Reusable mock implementations
  - Setup and teardown:
    - beforeEach/afterEach for mock setup/reset
    - Mock restore in cleanup
- Generate integration scenarios:
  - Multi-step test flows
  - State verification across steps
  - Spy assertions (verify call count, arguments)
- Follow mocking best practices:
  - Clear mock setup
  - Restore mocks in cleanup
  - Verify mock calls when relevant

**Output**: Async and integration test code:
```javascript
import axios from 'axios';
import { fetchUserData } from './userApi';

jest.mock('axios');

describe('fetchUserData', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch user data successfully', async () => {
    const mockUser = { id: 123, name: 'John' };
    axios.get.mockResolvedValue({ data: mockUser });

    const result = await fetchUserData(123);

    expect(result).toEqual(mockUser);
    expect(axios.get).toHaveBeenCalledWith('/api/users/123');
  });

  it('should handle API error', async () => {
    axios.get.mockRejectedValue(new Error('404 Not Found'));

    await expect(fetchUserData(999)).rejects.toThrow('404 Not Found');
  });

  it('should update cache after fetch', async () => {
    const mockUser = { id: 123, name: 'John' };
    axios.get.mockResolvedValue({ data: mockUser });
    const cacheSpy = jest.spyOn(cache, 'set');

    await fetchUserData(123);

    expect(cacheSpy).toHaveBeenCalledWith('user:123', mockUser);
  });
});
```

**Critical**: Wait for ALL 4 agents to complete before proceeding.

**Consolidation Step**:
1. Merge all test code by source file
2. Organize tests within each file:
   - Imports at top
   - Mock setup before tests
   - Happy path tests first
   - Edge cases second
   - Error handling third
   - Integration tests last
3. Ensure proper formatting and syntax
4. Verify all imports and dependencies are included

---

### 5. Test File Writing & Integration Wave

**Purpose**: Write test files to disk following project conventions.

**Single Specialized Agent**:

**Agent - Test File Manager**

Write generated tests to appropriate locations.

**Tasks**:
1. **Determine test file paths**:
   - Follow detected naming convention:
     - Same directory: `pricing.js` → `pricing.test.js`
     - __tests__ directory: `pricing.js` → `__tests__/pricing.test.js`
     - Parallel test directory: `src/utils/pricing.js` → `test/utils/pricing.test.js`
   - Handle existing test files:
     - If test file exists: Append new tests to existing file (use Edit to add test cases)
     - If test file doesn't exist: Create new file (use Write)

2. **Handle existing tests**:
   - If test file exists:
     - Read existing test file
     - Identify where to insert new tests
     - Use Edit to add new describe blocks or test cases
     - Preserve existing tests and formatting
     - Add comment: `// Generated by /testgen` before new tests
   - If conflicts arise (duplicate test names):
     - Rename generated tests with suffix: "should calculate total (generated)"
     - Log conflicts for user review

3. **Write test files**:
   - For new test files: Use Write tool with complete test file content
   - For existing test files: Use Edit tool to append new tests
   - Ensure proper formatting matches project style
   - Include all necessary imports
   - Add file header comment:
     ```javascript
     // Test file for pricing.js
     // Generated: [timestamp]
     // Framework: Jest
     ```

4. **Create test utilities if needed**:
   - If mocks are needed but no mock utilities exist:
     - Create __mocks__ directory if framework supports it
     - Generate mock files for external dependencies
   - If fixtures are needed:
     - Create test-fixtures.js or fixtures/ directory
     - Generate fixture data

5. **Update test configuration if needed**:
   - If new test patterns added, verify they're included in test runner config
   - Check coverage configuration includes new files

**Output**:
- Test files written to disk: [list of file paths]
- New test files created: [count]
- Existing test files updated: [count]
- Mock files created: [list]
- Fixture files created: [list]

---

### 6. Test Execution & Validation Wave (Parallel Verification)

**Purpose**: Run generated tests and verify they work correctly.

Launch 3 agents **IN PARALLEL** (single message with multiple Task calls):

**Agent 1 - Test Runner**

Execute generated tests and verify they pass.

**Tasks**:
- Identify test command based on detected framework:
  - **Jest**: `npm test` or `npx jest [test-file]`
  - **Vitest**: `npx vitest run [test-file]`
  - **Pytest**: `pytest [test-file]` or `python -m pytest [test-file]`
  - **JUnit**: `mvn test` or `gradle test`
  - **Go**: `go test [package]`
  - **RSpec**: `rspec [test-file]`
- Run tests for generated test files:
  - Use Bash to execute test command
  - Capture output (stdout and stderr)
  - Parse test results:
    - Number of tests run
    - Number passed
    - Number failed
    - Failure details (error messages, stack traces)
- If tests fail:
  - Analyze failure reasons:
    - Syntax errors in generated code
    - Import/require errors
    - Incorrect assertions
    - Mock setup issues
    - Missing dependencies
  - Categorize failures:
    - Fixable (syntax, imports, simple logic)
    - Requires source code understanding (complex logic)

**Output**: Test execution results:
```
Test Execution Results:
- Tests run: 45
- Passed: 42
- Failed: 3

Failures:
1. pricing.test.js: "should calculate total for multiple items"
   Error: ReferenceError: calculateTotal is not defined
   Fix: Incorrect import path

2. userService.test.js: "should handle database error"
   Error: TypeError: Cannot read property 'insert' of undefined
   Fix: Mock setup issue - database not properly mocked

3. userApi.test.js: "should fetch user data successfully"
   Error: AssertionError: expected { id: 123 } to equal { id: 123, name: 'John' }
   Fix: Incomplete mock data
```

**Agent 2 - Test Fixer**

Fix failing tests based on execution results.

**Tasks**:
- For each failing test (provided by Agent 1):
  - Read test file and analyze failure
  - Identify fix required:
    - **Syntax errors**: Fix syntax issues (missing braces, semicolons, etc.)
    - **Import errors**: Correct import paths, add missing imports
    - **Mock setup errors**: Fix mock implementations, add missing mocks
    - **Assertion errors**: Adjust assertions to match actual behavior
    - **Missing dependencies**: Add missing test utilities or fixtures
  - Apply fixes using Edit tool:
    - Fix one issue at a time
    - Verify fix doesn't break other tests
  - Re-run specific failing tests to verify fix
- Continue fixing until all fixable tests pass
- For unfixable tests (require source code changes):
  - Document the issue
  - Recommend manual review
  - Comment out failing test with TODO

**Output**:
- Fixed tests: [count]
- Remaining failures: [count]
- Fixes applied: [list of files and changes]
- Manual review needed: [list of issues requiring human review]

**Agent 3 - Coverage Analyzer**

Analyze code coverage achieved by generated tests.

**Tasks**:
- Run coverage tool based on framework:
  - **Jest**: `npx jest --coverage [test-file]`
  - **Pytest**: `pytest --cov=[module] [test-file]`
  - **Go**: `go test -cover [package]`
  - Coverage.py for Python, Istanbul/nyc for JavaScript
- Parse coverage report:
  - Line coverage percentage
  - Branch coverage percentage
  - Uncovered lines
  - Functions with no coverage
- Analyze coverage gaps:
  - Which functions still need tests
  - Which branches are uncovered
  - Which edge cases are missed
- If coverage < 80%:
  - Identify specific gaps
  - Recommend additional test cases
  - Prioritize missing coverage areas

**Output**: Coverage analysis:
```
Coverage Analysis:
- Overall coverage: 85%
- Line coverage: 87%
- Branch coverage: 82%
- Function coverage: 90%

Coverage by File:
- pricing.js: 95% (excellent)
- userService.js: 78% (below target)
  - Uncovered: lines 45-52 (error handling branch)
  - Uncovered: line 67 (edge case for null user)
- userApi.js: 88% (good)

Recommendations:
1. Add test for error handling in userService.js:45-52
2. Add edge case test for null user in userService.js:67
3. Consider parameterized tests for repeated patterns
```

**Critical**: Wait for ALL 3 agents to complete before proceeding.

**Consolidation Step**:
1. Verify all fixable tests now pass
2. Compile final test execution status
3. Summarize coverage results
4. List remaining issues (if any)
5. Prepare recommendations for next steps

---

### 7. Report Generation Wave

**Purpose**: Generate comprehensive test generation report.

**Single Specialized Agent**:

**Agent - Report Generator**

Create detailed test generation report.

**Tasks**:
1. Compile comprehensive report including:
   - Executive summary
   - Test generation statistics
   - Coverage analysis
   - Generated test details
   - Execution results
   - Known issues and recommendations
2. Format report in markdown
3. Display to user

**Output**: Comprehensive test generation report:

```markdown
# Test Generation Report

**Generated**: [timestamp]
**Target**: [TARGET path]
**Framework**: [detected framework]
**Status**: [Success / Partial Success / Failed]

---

## Executive Summary

[2-3 sentence summary of test generation results]

**Test Generation**:
- Test files created: [N]
- Test files updated: [N]
- Total test cases generated: [N]
- Test execution: [N passed / N failed / N total]
- Code coverage: [X]%

---

## Test Generation Statistics

### Source Code Analysis
- Source files analyzed: [N]
- Testable functions identified: [N]
- Functions previously tested: [N]
- Functions requiring tests: [N]
- Complexity hotspots: [N]

### Test Cases Generated
- **Unit tests**: [N]
  - Happy path tests: [N]
  - Basic functionality: [N]
- **Edge case tests**: [N]
  - Boundary value tests: [N]
  - Null/undefined handling: [N]
  - Empty input tests: [N]
- **Error handling tests**: [N]
  - Exception tests: [N]
  - Validation tests: [N]
- **Integration/Async tests**: [N]
  - Async function tests: [N]
  - Integration scenarios: [N]
  - Mock-based tests: [N]

### Test Files
- New test files created: [N]
- Existing test files updated: [N]
- Mock files created: [N]
- Fixture files created: [N]

---

## Coverage Analysis

### Overall Coverage
- **Line Coverage**: [X]%
- **Branch Coverage**: [X]%
- **Function Coverage**: [X]%
- **Statement Coverage**: [X]%

**Coverage Target**: 80%
**Status**: [✓ Met / ✗ Below Target]

### Coverage by File

**File**: src/utils/pricing.js
- Coverage: 95%
- Status: ✓ Excellent
- Tests generated: 8 test cases

**File**: src/services/userService.js
- Coverage: 78%
- Status: ✗ Below target
- Tests generated: 12 test cases
- Gaps:
  - Lines 45-52: Error handling branch (uncovered)
  - Line 67: Edge case for null user (uncovered)

**File**: src/api/userApi.js
- Coverage: 88%
- Status: ✓ Good
- Tests generated: 10 test cases

---

## Generated Test Details

### src/utils/pricing.test.js (New File)

**Test Suite**: calculateTotal
- ✓ should calculate total for multiple items
- ✓ should return 0 for empty array
- ✓ should handle single item
- ✓ should handle items with zero quantity
- ✓ should handle negative prices (edge case)

**Test Suite**: formatPrice
- ✓ should format price with currency symbol
- ✓ should handle zero price
- ✓ should handle very large numbers

**Total**: 8 test cases | 8 passed | 0 failed

---

### src/services/userService.test.js (Updated Existing File)

**Existing Tests**: 15 test cases (preserved)

**New Tests Generated**:

**Test Suite**: getUserById (added edge cases)
- ✓ should return null for non-existent user (edge case)
- ✓ should handle id = 0 (edge case)
- ✓ should handle very large id (edge case)

**Test Suite**: createUser (added error handling)
- ✓ should throw ValidationError for missing email
- ✓ should throw ValidationError for invalid email format
- ✓ should handle database connection failure
- ✗ should handle duplicate user email (FAILED - mock setup issue)

**Test Suite**: updateUser (new tests)
- ✓ should update user successfully
- ✓ should return null for non-existent user
- ✓ should validate updated email format
- ✓ should preserve unchanged fields

**New Tests**: 12 test cases | 11 passed | 1 failed
**Total**: 27 test cases | 26 passed | 1 failed

---

### src/api/userApi.test.js (Updated Existing File)

**Existing Tests**: 8 test cases (preserved)

**New Tests Generated**:

**Test Suite**: fetchUserData (added async tests)
- ✓ should fetch user data successfully (async)
- ✓ should handle API error (async error)
- ✓ should update cache after fetch (integration)
- ✓ should retry on network failure (async)

**Test Suite**: updateUserData (new tests)
- ✓ should send PUT request with user data (async)
- ✓ should handle validation error from API (async error)
- ✓ should update local cache on success (integration)

**Test Suite**: deleteUser (new tests)
- ✓ should send DELETE request (async)
- ✓ should clear cache on delete (integration)
- ✓ should handle 404 error (async error)

**New Tests**: 10 test cases | 10 passed | 0 failed
**Total**: 18 test cases | 18 passed | 0 failed

---

## Test Execution Results

### Summary
- **Total test cases**: 53 (30 new + 23 existing)
- **Passed**: 52 (98%)
- **Failed**: 1 (2%)
- **Skipped**: 0

### Execution Time
- Total time: 3.45s
- Average per test: 0.065s

### Failures

**1. userService.test.js**: "should handle duplicate user email"
```
Error: TypeError: Cannot read property 'findByEmail' of undefined
Location: userService.test.js:145
Reason: Mock setup issue - database.findByEmail not properly mocked
Status: Requires manual fix
```

**Recommended Fix**:
```javascript
// Add to beforeEach in userService.test.js
jest.spyOn(database, 'findByEmail').mockResolvedValue(existingUser);
```

---

## Known Issues & Limitations

### Test Failures (1)
1. **userService.test.js:145** - Mock setup incomplete for duplicate email test
   - **Impact**: Medium - Missing coverage for duplicate email validation
   - **Fix**: Add `database.findByEmail` mock in test setup
   - **Estimated effort**: 5 minutes

### Coverage Gaps (2)
1. **userService.js:45-52** - Error handling branch uncovered
   - **Impact**: Medium - Database error handling not tested
   - **Recommendation**: Add test for database connection failure scenario
   - **Estimated effort**: 10 minutes

2. **userService.js:67** - Null user edge case uncovered
   - **Impact**: Low - Edge case for null user handling
   - **Recommendation**: Add edge case test for null user scenario
   - **Estimated effort**: 5 minutes

### Test Quality Observations
- ✓ All critical functions have test coverage
- ✓ Edge cases well covered (boundary values, null checks)
- ✓ Error handling mostly tested
- ✓ Async functions properly tested with async/await
- ✓ Mock usage appropriate and follows project patterns
- ⚠ Some integration tests could use more comprehensive scenarios
- ⚠ Performance tests not generated (out of scope)

---

## Test Infrastructure

### Mocks Created
- None (used existing mocking infrastructure)

### Fixtures Created
- None (used inline test data)

### Test Utilities Used
- Existing test utilities from test-utils.js
- Project's mock configuration

### Dependencies
- All tests use existing testing dependencies
- No new packages required

---

## Recommendations

### Immediate Actions (Fix Failures)
1. **Fix mock setup in userService.test.js**
   - Add `database.findByEmail` mock
   - Re-run test to verify fix
   - Estimated: 5 minutes

### Short-term (Improve Coverage)
2. **Add missing error handling test**
   - Test database connection failure in userService.js:45-52
   - Target: increase coverage to 82%
   - Estimated: 10 minutes

3. **Add null user edge case test**
   - Test null user handling in userService.js:67
   - Target: increase coverage to 85%
   - Estimated: 5 minutes

### Long-term (Test Quality)
4. **Consider parameterized tests**
   - Multiple similar tests could use parameterized approach
   - Files: pricing.test.js (boundary value tests)
   - Benefit: Reduce test code duplication

5. **Add integration test scenarios**
   - More comprehensive multi-step user flows
   - Example: Create user → Update user → Delete user sequence
   - Benefit: Better coverage of real-world usage

6. **Consider performance tests**
   - Large array handling in pricing.js
   - API response time tests in userApi.js
   - Benefit: Catch performance regressions

---

## Test Maintenance Guide

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test pricing.test.js

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### Updating Tests
- When source code changes, review and update corresponding tests
- Add new test cases for new functionality
- Keep edge cases and error handling in sync with code changes

### Test Conventions
- **Naming**: [sourceFile].test.js
- **Structure**: describe/it blocks
- **Assertions**: expect() style
- **Mocking**: jest.mock() and jest.spyOn()
- **Async**: async/await pattern

---

## Success Criteria

**Definition of Done**:
- [✓] All source files analyzed
- [✓] Test cases designed for uncovered code
- [✓] Tests generated following project conventions
- [✓] Test files written to disk
- [✗] All generated tests pass (1 failure)
- [✗] Coverage target met (78% vs 80% target in one file)

**Overall Status**: Partial Success

**Next Steps**:
1. Fix the 1 failing test (5 min effort)
2. Add 2 missing tests for coverage gaps (15 min effort)
3. Consider long-term recommendations for test quality

---

## Summary

Generated **30 new test cases** across **3 test files** with **98% success rate**. Achieved **85% overall code coverage** (target: 80%).

**Key Achievements**:
- ✓ Comprehensive edge case coverage (boundary values, null checks)
- ✓ Strong error handling tests (validation, exceptions)
- ✓ Async/integration tests with proper mocking
- ✓ Tests follow project conventions perfectly

**Remaining Work**:
- 1 test requires mock setup fix (5 min)
- 2 coverage gaps identified with recommendations (15 min)

**Overall**: High-quality test suite generated with minimal manual intervention required.

---

**Report End**
```

Display report to user.

---

## Execution Guidelines

### Parallelization Rules

**Within Each Wave**: Always launch agents in a SINGLE message with multiple Task tool calls. This is critical for performance.

Examples:
```
Wave 2: Launch 3 agents in parallel:
- Agent 1: Source Code Analyzer (analyzing source files...)
- Agent 2: Existing Test Analyzer (analyzing test coverage...)
- Agent 3: Test Infrastructure Scout (identifying test patterns...)

Wave 3: Launch 4 agents in parallel:
- Agent 1: Unit Test Designer (designing happy path tests...)
- Agent 2: Edge Case Test Designer (designing boundary tests...)
- Agent 3: Error Handling Test Designer (designing error tests...)
- Agent 4: Integration Test Designer (designing async/integration tests...)

Wave 4: Launch 4 agents in parallel:
- Agent 1: Unit Test Writer (generating unit test code...)
- Agent 2: Edge Case Test Writer (generating edge case code...)
- Agent 3: Error Handling Test Writer (generating error test code...)
- Agent 4: Mock & Async Test Writer (generating async/integration code...)

Wave 6: Launch 3 agents in parallel:
- Agent 1: Test Runner (executing generated tests...)
- Agent 2: Test Fixer (fixing failing tests...)
- Agent 3: Coverage Analyzer (analyzing code coverage...)
```

**Between Waves**: ALWAYS wait for all agents in current wave to complete before starting the next wave. Synthesize findings between waves.

### Context Management Strategy

**After Each Wave**:
1. Consolidate agent outputs into concise summary (1500-2000 tokens max)
2. Remove redundant details, keep only actionable information
3. Pass summaries (not full outputs) to next wave

**For Large Codebases**:
1. Prioritize high-complexity files and untested critical functions
2. Sample rather than exhaustive analysis if >100 files
3. Focus on files with business logic over simple utilities

**Token Budget Tracking**:
- Reserve 15K tokens for test code generation
- Reserve 5K tokens for final report
- If approaching 80% token usage, reduce scope to high-priority tests only
- Prioritize: Critical functions > Complex functions > Utility functions

### Error Handling

**If Target Not Found**:
- Display clear error message with the invalid path
- Suggest checking spelling or using absolute path
- Exit gracefully (do not proceed with analysis)

**If No Testing Framework Detected**:
- Warn user about missing framework
- Suggest popular frameworks for detected language
- Ask user if they want to continue with generic tests
- If user declines, exit; if accepts, generate generic test patterns

**If Source File Has No Testable Functions**:
- Valid outcome for config files, types, etc.
- Report: "No testable functions found in [file]"
- Skip test generation for that file
- Continue with other files

**If Tests Fail After Generation**:
- Agent 2 in Wave 6 attempts automatic fixes
- If auto-fix succeeds, re-run tests
- If auto-fix fails, document issue in report
- Do not block report generation on unfixable test failures
- Provide clear guidance for manual fixes

**If Coverage Below Target**:
- Still report success (tests were generated and run)
- Highlight coverage gap in report
- Recommend additional test cases to improve coverage
- List specific uncovered lines and branches

**If Test File Already Exists**:
- Default: Append new tests to existing file
- Use Edit tool to add new describe blocks
- Preserve existing tests
- Add comment indicating generated tests
- If conflicts (duplicate test names), rename with suffix

### Adaptive Scaling

**Single File Target**:
- Focus analysis on that file only
- Generate comprehensive tests for all functions
- Detailed test design for each function
- Aim for 90%+ coverage

**Small Directory (<10 files)**:
- Analyze all files thoroughly
- Generate tests for all testable functions
- Comprehensive test design
- Aim for 80%+ coverage

**Medium Directory (10-50 files)**:
- Analyze all files as designed
- Prioritize complex and critical functions
- Standard test generation
- Aim for 75%+ coverage

**Large Directory (>50 files)**:
- Warn user about scope
- Suggest targeting specific subdirectories
- If user confirms, prioritize:
  - High-complexity files
  - Files with no existing tests
  - Critical business logic
- Aim for 70%+ coverage on prioritized files

---

## Framework-Specific Patterns

### JavaScript/TypeScript (Jest/Vitest)

**Test Structure**:
```javascript
import { functionName } from './source';

describe('functionName', () => {
  it('should do something', () => {
    const result = functionName(input);
    expect(result).toBe(expected);
  });
});
```

**Async Tests**:
```javascript
it('should fetch data', async () => {
  await expect(fetchData()).resolves.toEqual(data);
});
```

**Mocking**:
```javascript
jest.mock('./module');
jest.spyOn(object, 'method').mockResolvedValue(value);
```

### Python (Pytest)

**Test Structure**:
```python
from source import function_name

def test_function_name():
    result = function_name(input)
    assert result == expected
```

**Async Tests**:
```python
@pytest.mark.asyncio
async def test_fetch_data():
    result = await fetch_data()
    assert result == expected
```

**Mocking**:
```python
from unittest.mock import patch

@patch('module.function')
def test_with_mock(mock_func):
    mock_func.return_value = value
    # test code
```

### Java (JUnit)

**Test Structure**:
```java
import org.junit.Test;
import static org.junit.Assert.*;

public class FunctionNameTest {
    @Test
    public void shouldDoSomething() {
        Type result = functionName(input);
        assertEquals(expected, result);
    }
}
```

### Go

**Test Structure**:
```go
func TestFunctionName(t *testing.T) {
    result := FunctionName(input)
    if result != expected {
        t.Errorf("Expected %v, got %v", expected, result)
    }
}
```

### Ruby (RSpec)

**Test Structure**:
```ruby
require 'rspec'
require_relative './source'

describe '#function_name' do
  it 'should do something' do
    result = function_name(input)
    expect(result).to eq(expected)
  end
end
```

---

## Success Criteria

The test generation workflow is only complete when:

- ✓ Target validated and testing framework detected
- ✓ All source files analyzed for test gaps
- ✓ Comprehensive test cases designed (unit, edge, error, integration)
- ✓ Test code generated following project conventions
- ✓ Test files written to disk (new files or updates to existing)
- ✓ Generated tests executed
- ✓ Fixable test failures resolved automatically
- ✓ Coverage analyzed and gaps identified
- ✓ Comprehensive report generated with all findings
- ✓ User receives actionable next steps

**Acceptable outcomes**:
- 80%+ tests passing (some failures acceptable if documented)
- 70%+ code coverage (some gaps acceptable if identified)
- All critical functions have test coverage
- All generated tests follow project conventions

---

## Usage Examples

**Generate tests for single file**:
```
/testgen src/utils/validator.js
/testgen src/services/userService.py
/testgen pkg/api/handler.go
```

**Generate tests for directory**:
```
/testgen src/services/
/testgen src/utils/
/testgen pkg/api/
```

**Generate tests for current directory**:
```
/testgen
```

**Generate tests for specific module**:
```
/testgen backend/api/users/
/testgen frontend/components/
```

---

## Notes

- This command generates tests for **existing code**, not new code. For new features, write tests alongside implementation.
- **Coverage target**: 80% is a reasonable goal. Some code may not need tests (simple getters, configuration).
- **Test quality**: Generated tests cover common scenarios. Complex business logic may require manual test refinement.
- **Mocking**: Generated tests use project mocking patterns. Complex mock scenarios may need manual adjustment.
- **Framework support**: Best results with Jest, Pytest, JUnit, Go test, and RSpec. Other frameworks may have limited support.
- **Maintenance**: Review generated tests before committing. Adjust test descriptions and assertions as needed.
- **Complementary approach**: Use alongside manual testing, TDD, and code review for comprehensive quality assurance.
- **Privacy note**: All analysis is performed locally. No code is transmitted externally.
