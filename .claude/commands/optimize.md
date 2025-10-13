---
description: Identify and fix performance bottlenecks to improve application speed
argument-hint: [target-path]
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
model: claude-sonnet-4-5-20250929
---

# Optimize

Orchestrate a sophisticated multi-wave agent workflow to systematically identify, analyze, and fix performance bottlenecks across a codebase. This command uses parallel agent execution within waves, with synchronization points between phases to ensure comprehensive performance improvements with measurable results.

## Variables

TARGET_PATH: $ARGUMENTS (defaults to current directory if not provided)

## Workflow

### 1. Validation & Baseline Assessment

**Purpose**: Validate inputs, establish scope, and assess current performance state before optimization.

**Steps**:
1. If `TARGET_PATH` is empty, use current working directory (`.`)
2. Verify target path exists and is readable
3. If path doesn't exist or lacks permissions:
   - Display clear error: "Path '[path]' not found or unreadable. Please verify the path."
   - STOP immediately
4. Determine path type (directory or single file)
5. If directory:
   - Estimate scope (file count, LOC) using `find` and `wc`
   - Identify project type (web app, API, library, etc.) from package.json, setup.py, go.mod
   - Detect technology stack (React, Vue, Express, Django, Go, etc.)
6. Display analysis scope:
   - "Performance optimization for: [path]"
   - "Project type: [type] | Stack: [technologies]"
   - "Starting 5-wave performance optimization workflow..."
7. Create performance report directory: `.claude/performance/[TIMESTAMP]/`
   - Store all benchmarks, reports, and optimization logs here
   - TIMESTAMP format: YYYYMMDD-HHMMSS

---

### 2. Performance Profiling Wave (Parallel Analysis)

**Purpose**: Comprehensively identify performance bottlenecks across multiple dimensions simultaneously.

Launch 4 agents **IN PARALLEL** (single message with multiple Task calls):

**Agent 1 - Database Query Analyzer**

Detect database performance issues and query inefficiencies.

**Tasks**:
- Use Glob to find database-related files:
  - Patterns: `**/*.sql`, `**/models/**/*`, `**/repositories/**/*`, `**/queries/**/*`, `**/migrations/**/*`
  - ORM files: files with `sequelize`, `mongoose`, `prisma`, `typeorm`, `sqlalchemy`, `gorm`, `activerecord`
- Use Grep to find query patterns:
  - N+1 queries: `\.map.*\.(find|query|get)`, nested queries in loops
  - Raw queries: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `raw(`, `exec(`, `query(`
  - Missing indexes: table scans, `full_table_scan`, large WHERE clauses without indexes
  - Inefficient joins: `JOIN.*JOIN.*JOIN` (3+ joins), subqueries in SELECT
  - Lazy loading in loops: `for.*await.*find`, `map.*query`, iteration with individual queries
- Check for:
  - Use of `SELECT *` without column specification
  - Missing query batching (no `Promise.all`, no bulk operations)
  - Lack of pagination on large datasets
  - Transactions spanning multiple files/functions
  - Connection pool configuration issues
- Read top 10-15 files with most query patterns
- Analyze query complexity and data access patterns

**Output**: Database performance report with:
- Issue type (N+1, missing index, slow query, etc.)
- File path and line number
- Query pattern snippet (10 lines context)
- Severity rating (CRITICAL/HIGH/MEDIUM/LOW)
- Estimated performance impact (response time increase)
- Suggested optimization (add index, use eager loading, batch queries)

**Agent 2 - Algorithm Complexity Detector**

Identify inefficient algorithms and computational bottlenecks.

**Tasks**:
- Use Glob to find all source files
- Use Grep to find complexity indicators:
  - **O(n²) nested loops**: nested `for`/`while` with array operations inside
    - `for.*for.*\[`, `while.*for`, `map.*filter`, `forEach.*map`
  - **O(n³+) deeply nested loops**: 3+ nested loops
    - `for.*for.*for`, deeply nested iterations
  - **Inefficient searching**: linear search with `find`, `indexOf` in loops
    - `for.*indexOf`, `while.*find`, repeated searches without caching
  - **Inefficient sorting**: repeated sorting in loops, bubble sort patterns
    - `for.*sort`, `while.*sort`, manual sorting implementations
  - **Redundant computations**: same calculation repeated in loops
    - `for.*Math\.`, `while.*calculate`, loop-invariant code
  - **Poor data structure choices**: arrays for lookups, objects for ordered data
    - Using arrays with `find` instead of Maps/Sets
- Look for algorithm anti-patterns:
  - Cartesian product operations without optimization
  - Recursive functions without memoization or depth limits
  - String concatenation in loops (instead of join/StringBuilder)
  - Deep object cloning in hot paths
  - Synchronous operations in async contexts
- Check for missing optimizations:
  - No binary search for sorted data
  - No hash maps for O(1) lookups
  - No memoization for expensive pure functions
  - No lazy evaluation for heavy computations
- Read top 15-20 files with high complexity indicators
- Calculate cyclomatic complexity estimates

**Output**: Algorithm complexity report with:
- Issue type (nested loops, inefficient search, redundant computation, etc.)
- File path, function name, and line number
- Complexity class (O(n²), O(n³), O(n log n), etc.)
- Code snippet showing problematic pattern (15 lines context)
- Severity rating (CRITICAL/HIGH/MEDIUM/LOW)
- Estimated impact (execution time, CPU usage)
- Suggested optimization (use Map, add memoization, use binary search, etc.)
- Code example of optimized version

**Agent 3 - Memory Leak Detector**

Identify memory management issues and resource leaks.

**Tasks**:
- Use Glob to find all source files
- Use Grep to find memory leak patterns:
  - **Unclosed file handles**:
    - `open(` without `close()` or `with` statement (Python)
    - `fs.readFile` without cleanup (Node.js)
    - File operations without try-finally
  - **Unclosed database connections**:
    - `connect()` without `close()` or `disconnect()`
    - Connections not returned to pool
    - Missing connection cleanup in error handlers
  - **Unclosed network sockets**:
    - `socket.connect` without `socket.close`
    - HTTP clients without timeout or cleanup
    - WebSocket connections without close handlers
  - **Event listener leaks**:
    - `addEventListener` without `removeEventListener` (JavaScript)
    - `on(` without `.off(` or `.removeListener(`
    - React useEffect without cleanup function
  - **Memory bloat**:
    - Large object retention in closures
    - Global variable accumulation
    - Cache without size limits or TTL
    - Large arrays/buffers not cleared
  - **Circular references**:
    - Parent-child references without weak references
    - Cache holding references to large objects
  - **Timers and intervals**:
    - `setTimeout`/`setInterval` without clear
    - Dangling timers in component unmount
- Check for resource cleanup patterns:
  - Try-finally blocks for resource cleanup
  - Context managers (Python `with`)
  - Defer statements (Go)
  - Cleanup functions in React hooks
- Read top 15-20 files with leak indicators
- Identify hot code paths where leaks would compound

**Output**: Memory leak report with:
- Issue type (unclosed resource, event leak, memory bloat, etc.)
- Resource type (file, connection, socket, listener, etc.)
- File path and line number
- Code snippet showing leak pattern (15 lines context)
- Severity rating (CRITICAL/HIGH/MEDIUM/LOW)
- Estimated impact (memory growth rate, resource exhaustion timeline)
- Suggested fix (add cleanup, use try-finally, add removeListener, etc.)
- Code example with proper cleanup

**Agent 4 - Frontend Performance Scanner**

Identify frontend-specific performance issues (if web application).

**Tasks**:
- Detect if project is web-based:
  - Check for: `package.json`, `index.html`, `public/`, `src/components/`
  - Frameworks: React, Vue, Angular, Svelte
  - If no frontend detected, report "N/A - No frontend detected" and skip
- Use Glob to find frontend files:
  - Components: `**/*.jsx`, `**/*.tsx`, `**/*.vue`, `**/*.svelte`
  - Styles: `**/*.css`, `**/*.scss`, `**/*.less`
  - Assets: `**/public/**/*`, `**/assets/**/*`, `**/static/**/*`
- Use Grep to find frontend performance issues:
  - **Unnecessary re-renders**:
    - Components without `memo`, `useMemo`, `useCallback` (React)
    - Inline object/array creation in render: `style={{`, `items={[`
    - Anonymous functions in render: `onClick={() =>`
    - Props drilling without context
  - **Large bundle sizes**:
    - Missing code splitting: no `React.lazy`, `dynamic import`
    - Large imports: `import * as`, entire libraries imported
    - No tree shaking indicators
  - **Unoptimized images**:
    - Large image files (>500KB) in assets
    - No lazy loading: missing `loading="lazy"`
    - No responsive images: missing `srcset`
    - No modern formats (WebP, AVIF)
  - **Blocking JavaScript**:
    - Script tags without `defer` or `async`
    - Large synchronous JavaScript in main bundle
    - Third-party scripts blocking render
  - **Missing lazy loading**:
    - All routes loaded upfront
    - No virtual scrolling for long lists
    - No intersection observer for off-screen content
  - **CSS inefficiencies**:
    - Large unused CSS
    - Complex selectors (descendant, universal)
    - No CSS purging in production
- Check build configuration:
  - Webpack/Vite/Rollup config for optimizations
  - Minification settings
  - Compression (gzip, brotli)
  - Bundle analysis outputs
- Use Bash to check bundle sizes if build exists:
  - `du -sh dist/` or `du -sh build/`
  - `ls -lh dist/**/*.js | sort -k5 -hr | head -20`
- Read top 15-20 problematic frontend files

**Output**: Frontend performance report with:
- Issue type (re-renders, large bundle, unoptimized image, blocking script, etc.)
- File path and line number
- Code snippet showing issue (10 lines context)
- Severity rating (CRITICAL/HIGH/MEDIUM/LOW)
- Estimated impact (FCP, LCP, TTI, bundle size increase)
- Suggested optimization (add memo, code split, lazy load, optimize image, etc.)
- Code example of optimized version
- Bundle size metrics (if available)

**Critical**: Wait for ALL 4 agents to complete before proceeding. Synthesize findings into a consolidated performance bottleneck report.

**Consolidation Step** (2000-3000 tokens):
After all 4 agents complete, create comprehensive bottleneck summary:

1. **Performance Issues by Severity**:
   - CRITICAL: [count] issues - Severe impact on user experience
   - HIGH: [count] issues - Significant performance degradation
   - MEDIUM: [count] issues - Noticeable slowdowns
   - LOW: [count] issues - Minor optimizations

2. **Performance Issues by Category**:
   - Database: [count] issues
   - Algorithms: [count] issues
   - Memory: [count] issues
   - Frontend: [count] issues

3. **Estimated Impact**:
   - Response time: +[X]ms average
   - Memory usage: +[X]MB average
   - Bundle size: [X]MB (frontend)
   - Database queries: [X] avg per request

4. **Priority Issues** (top 10-15 bottlenecks):
   - For each: type, location, impact, severity

---

### 3. Optimization Strategy Wave (Planning)

**Purpose**: Design comprehensive optimization approach based on profiling results.

Launch 2 agents **IN PARALLEL** (single message with multiple Task calls):

**Agent 1 - Priority Ranker & Impact Estimator**

Prioritize bottlenecks by actual user impact and optimization feasibility.

**Tasks**:
1. **Calculate priority score** for each issue using formula:
   - Base score = Severity weight (CRITICAL=10, HIGH=7, MEDIUM=4, LOW=2)
   - User-facing multiplier: 2x for frontend/API, 1.5x for backend, 1x for internal
   - Frequency multiplier: hot path=3x, frequent=2x, occasional=1x
   - Fix complexity: easy=2x, medium=1x, hard=0.5x
   - Final priority = Base × User-facing × Frequency × Fix complexity

2. **Estimate performance gains** for each optimization:
   - Database optimizations: -30% to -80% query time
   - Algorithm improvements: -50% to -95% execution time
   - Memory fixes: -20% to -60% memory usage
   - Frontend optimizations: -200ms to -2s load time

3. **Group related issues**:
   - Issues in same file/module
   - Issues with same root cause
   - Issues requiring same type of fix

4. **Identify quick wins**:
   - High impact + low effort optimizations
   - One-line fixes with significant impact
   - Configuration changes

5. **Identify dependencies**:
   - Optimizations that must be done in order
   - Optimizations that enable other fixes
   - Potential conflicts between optimizations

**Output**: Prioritized optimization list with:
- Priority rank (1 = highest)
- Issue ID and description
- Priority score and calculation breakdown
- Estimated performance gain (specific metrics)
- Fix complexity (lines to change, files affected)
- Dependencies (what must be done first)
- Grouping (related issues)

**Agent 2 - Optimization Approach Designer**

Design specific optimization strategies for each category.

**Tasks**:
1. **Database optimization strategies**:
   - Add indexes: identify columns for indexing
   - Batch queries: combine multiple queries into one
   - Eager loading: use joins instead of N+1
   - Query optimization: rewrite slow queries
   - Connection pooling: configure optimal pool size
   - Caching: identify queries to cache

2. **Algorithm optimization strategies**:
   - Replace O(n²) with O(n) or O(n log n)
   - Use appropriate data structures (Map, Set, heap)
   - Add memoization for pure expensive functions
   - Implement caching for repeated computations
   - Add early exits and short-circuit evaluation
   - Parallelize independent operations

3. **Memory optimization strategies**:
   - Add resource cleanup (close files, connections)
   - Implement proper event listener cleanup
   - Add cache size limits and TTL
   - Use weak references for caches
   - Clear large objects when done
   - Implement object pooling for heavy objects

4. **Frontend optimization strategies**:
   - Add React.memo, useMemo, useCallback
   - Implement code splitting (route-based, component-based)
   - Add lazy loading for images and components
   - Optimize images (compress, WebP, responsive)
   - Move scripts to defer/async
   - Implement virtual scrolling for long lists
   - Add service worker for caching
   - Reduce bundle size (tree shaking, code splitting)

5. **Caching strategy**:
   - Identify cacheable data (static, slow-changing)
   - Choose cache type (memory, Redis, CDN)
   - Define cache TTL and invalidation
   - Implement cache-aside or write-through

6. **Cross-cutting optimizations**:
   - HTTP/2 server push
   - Compression (gzip, brotli)
   - CDN for static assets
   - API response compression
   - Async operations instead of sync

**Output**: Optimization strategy document with:
- Strategy by category (database, algorithm, memory, frontend)
- Specific techniques to apply
- Implementation approach for each technique
- Expected performance gain
- Risk assessment (low/medium/high)
- Rollback plan if optimization fails

**Critical**: Wait for both agents to complete. Create final optimization plan combining priority ranking and optimization strategies.

**Final Optimization Plan** (2000-3000 tokens):
```markdown
# Performance Optimization Plan

## Executive Summary
- Total issues identified: [count]
- High-priority optimizations: [count]
- Estimated overall improvement: [percentage]% faster
- Implementation phases: 4

## Priority Optimizations (Top 15)

### 1. [Issue Title] - Priority Score: [X]
- **Type**: Database / Algorithm / Memory / Frontend
- **Location**: [file]:[line]
- **Current Impact**: +[X]ms response time / +[X]MB memory / [metric]
- **Estimated Gain**: -[X]% performance improvement
- **Fix Complexity**: Low/Medium/High
- **Strategy**: [specific optimization approach]
- **Implementation**: [brief description]

[Repeat for top 15 issues]

## Optimization Strategy by Category

### Database Optimizations
- Add indexes on: [tables/columns]
- Batch queries: [specific cases]
- Implement eager loading: [specific relations]
- Query rewrites: [count] queries to optimize

### Algorithm Optimizations
- Replace nested loops: [count] locations
- Add memoization: [count] functions
- Use better data structures: [specific changes]

### Memory Optimizations
- Add cleanup: [count] resource leaks
- Implement size limits: [count] caches
- Fix event leaks: [count] listeners

### Frontend Optimizations
- Code splitting: [count] routes/components
- Image optimization: [count] images, [size] reduction
- Add memoization: [count] components
- Lazy loading: [count] components

### Caching Strategy
- Cache type: [Memory/Redis/CDN]
- Cache locations: [API routes, queries, assets]
- TTL strategy: [times]

## Implementation Phases

### Phase 1: Quick Wins (High impact, low effort)
[List of 5-10 optimizations]
- Estimated time: [X] hours
- Expected gain: [Y]% improvement

### Phase 2: Database Optimizations
[List of database fixes]
- Estimated time: [X] hours
- Expected gain: [Y]% improvement

### Phase 3: Algorithm & Memory Fixes
[List of algorithm and memory fixes]
- Estimated time: [X] hours
- Expected gain: [Y]% improvement

### Phase 4: Frontend Optimizations
[List of frontend fixes]
- Estimated time: [X] hours
- Expected gain: [Y]% improvement

## Risk Assessment
- Low risk: [count] optimizations
- Medium risk: [count] optimizations
- High risk: [count] optimizations

## Success Metrics
- Target: 30%+ performance improvement
- No functionality broken
- All tests pass
```

---

### 4. Benchmark Baseline Wave (Pre-Optimization Measurement)

**Purpose**: Establish performance baseline before making changes for accurate before/after comparison.

Launch 2 agents **IN PARALLEL** (single message with multiple Task calls):

**Agent 1 - Automated Benchmark Runner**

Run automated performance tests to establish baseline.

**Tasks**:
1. **Detect test framework**:
   - Check package.json for: `jest`, `mocha`, `pytest`, `go test`, `rspec`
   - Look for test scripts: `npm test`, `yarn test`, `pytest`

2. **Check for existing performance tests**:
   - Use Grep to find: `benchmark`, `performance`, `speed`, `@Benchmark`
   - Look in test directories
   - Check for: Jest benchmarks, Python benchmark modules, Go benchmarks

3. **Run existing performance tests** (if any):
   - Execute test command with timing
   - Capture output and metrics
   - Save results to `.claude/performance/[TIMESTAMP]/baseline-tests.txt`

4. **Measure critical operations** (if tests exist):
   - API endpoint response times
   - Database query execution times
   - Algorithm execution times
   - Component render times (frontend)

5. **If no performance tests exist**:
   - Note: "No automated performance tests found"
   - Skip to manual measurement approach
   - Recommend: "Consider adding performance tests for continuous monitoring"

**Output**: Automated benchmark results with:
- Test framework used
- Number of performance tests found
- Baseline metrics for each test
- Full test output saved to file
- Recommendations for missing tests

**Agent 2 - Manual Performance Measurement**

Manually measure performance of critical code paths.

**Tasks**:
1. **Identify critical entry points**:
   - API routes: main endpoints from routes files
   - Main functions: entry points to key algorithms
   - UI components: high-traffic pages/components
   - Database operations: frequently called queries

2. **For each critical code path identified in Wave 2**:
   - Estimate current performance based on code analysis
   - Look for existing timing/logging code
   - Check for monitoring/APM integration (New Relic, Datadog)

3. **Measure application startup**:
   - If server: time to start listening
   - If CLI: time to execute main command
   - If frontend: time to first render

4. **Check build performance** (if applicable):
   - Run build command: `npm run build`, `cargo build --release`
   - Measure build time
   - Measure output size (bundle size, binary size)
   - Use Bash: `time npm run build`

5. **Database query timing** (if possible):
   - Check for query logging in config
   - Enable slow query log if available
   - Estimate query times from complexity analysis

6. **Memory usage baseline**:
   - Check runtime memory usage if app is running
   - Use Bash: `ps aux | grep [process]` (if applicable)
   - Check heap size, RSS, etc.

**Output**: Manual measurement report with:
- Critical paths identified: [count]
- Entry point performance estimates
- Build performance metrics (time, size)
- Memory usage baseline
- Database query time estimates
- Baseline data saved to `.claude/performance/[TIMESTAMP]/baseline-manual.txt`

**Critical**: Wait for both agents to complete. Consolidate all baseline metrics.

**Baseline Performance Report** (1000-1500 tokens):
```markdown
# Performance Baseline Report

**Measured**: [timestamp]
**Target**: [path]

## Automated Test Results
- Tests found: [count]
- [Test 1]: [metric] = [value]
- [Test 2]: [metric] = [value]
- [Full results]: .claude/performance/[TIMESTAMP]/baseline-tests.txt

## Manual Measurements
- API response time (avg): [X]ms
- Database query time (avg): [X]ms
- Algorithm execution time: [X]ms
- Frontend load time: [X]ms
- Memory usage: [X]MB
- Bundle size: [X]MB

## Critical Path Performance
1. [Path 1]: [current performance]
2. [Path 2]: [current performance]
3. [Path 3]: [current performance]

## Build Performance
- Build time: [X]s
- Output size: [X]MB

This baseline will be compared against post-optimization metrics.
```

**Note**: If benchmarking fails or is not possible:
- Document inability to measure
- Proceed with best-effort optimization based on code analysis
- Recommend adding performance monitoring for future
- Skip baseline, continue to optimization implementation

---

### 5. Optimization Implementation Wave (Parallel Fixes)

**Purpose**: Apply optimizations systematically across all performance categories.

Launch 4 agents **IN PARALLEL** (single message with multiple Task calls):

**Agent 1 - Database Optimizer**

Implement database performance optimizations.

**Tasks**:
1. **Review database issues** from optimization plan
2. **Add database indexes**:
   - Identify tables and columns needing indexes
   - Create migration files for indexes
   - Add index definitions to ORM models
   - Document index rationale in comments
   - Example: `CREATE INDEX idx_users_email ON users(email);`

3. **Fix N+1 query problems**:
   - Replace lazy loading with eager loading
   - Use ORM's `include`, `with`, `preload` features
   - Convert map+query loops to single batch query
   - Example (Sequelize): `User.findAll({ include: [Posts] })`
   - Example (SQLAlchemy): `query.options(joinedload(User.posts))`

4. **Batch queries**:
   - Group multiple individual queries into batch operations
   - Use `Promise.all` for parallel queries (Node.js)
   - Use bulk operations: `bulkCreate`, `bulkUpdate`
   - Implement query result caching

5. **Optimize slow queries**:
   - Rewrite queries to avoid full table scans
   - Add WHERE clause optimizations
   - Reduce number of joins
   - Use subqueries strategically
   - Add LIMIT clauses where appropriate

6. **Configure connection pooling**:
   - Check current pool configuration
   - Set optimal pool size (typically: CPU cores × 2)
   - Configure connection timeout
   - Add connection retry logic

7. **Implement query caching**:
   - Identify queries with cacheable results
   - Add cache layer (Redis, in-memory)
   - Set appropriate TTL
   - Implement cache invalidation

8. **For each optimization**:
   - Use Edit tool to modify code
   - Add comments explaining optimization
   - Preserve existing functionality
   - Handle edge cases

**Output**: Database optimization results with:
- Indexes added: [count] with locations
- N+1 fixes: [count] with locations
- Queries batched: [count] with locations
- Queries optimized: [count] with locations
- Connection pooling: configured in [file]
- Caching: implemented for [count] queries
- All changes documented with file paths and line numbers

**Agent 2 - Algorithm Optimizer**

Implement algorithm and computational optimizations.

**Tasks**:
1. **Review algorithm issues** from optimization plan

2. **Replace nested loops** with efficient algorithms:
   - O(n²) → O(n): use hash maps, sets
   - O(n²) → O(n log n): use sorting + two-pointer technique
   - Example: Replace nested find with Map lookup
   ```javascript
   // Before: O(n²)
   items.forEach(item => {
     const match = others.find(o => o.id === item.id);
   });

   // After: O(n)
   const otherMap = new Map(others.map(o => [o.id, o]));
   items.forEach(item => {
     const match = otherMap.get(item.id);
   });
   ```

3. **Optimize searching and sorting**:
   - Use binary search for sorted arrays
   - Cache sort results instead of re-sorting
   - Use appropriate sort algorithm for data size
   - Pre-sort data when search is frequent

4. **Add memoization**:
   - Identify pure expensive functions
   - Implement memoization wrapper
   - Use LRU cache for bounded memory
   - Example (JavaScript):
   ```javascript
   const memoize = (fn) => {
     const cache = new Map();
     return (...args) => {
       const key = JSON.stringify(args);
       if (cache.has(key)) return cache.get(key);
       const result = fn(...args);
       cache.set(key, result);
       return result;
     };
   };
   ```

5. **Eliminate redundant computations**:
   - Move loop-invariant code outside loops
   - Cache expensive calculations
   - Use lazy evaluation where appropriate
   - Add early exits and short-circuit logic

6. **Improve data structure usage**:
   - Use Map/Set for O(1) lookups instead of arrays
   - Use heap/priority queue for min/max operations
   - Use appropriate collection types
   - Example: `Set` for uniqueness checks, `Map` for key-value lookups

7. **Optimize string operations**:
   - Use array join instead of += concatenation
   - Use StringBuilder/StringBuffer (Java)
   - Use template literals efficiently (JavaScript)
   - Pre-allocate string buffers

8. **Add parallelization** where appropriate:
   - Use Promise.all for independent async operations
   - Use worker threads for CPU-intensive tasks
   - Use goroutines (Go) or async/await properly

9. **For each optimization**:
   - Use Edit tool to modify code
   - Preserve functionality and edge cases
   - Add comments explaining optimization
   - Include time complexity in comments

**Output**: Algorithm optimization results with:
- Nested loops fixed: [count] with O(n) to O(n log n) improvements
- Memoization added: [count] functions with cache hit benefits
- Data structures improved: [count] locations
- String operations optimized: [count] locations
- Parallelization added: [count] locations
- All changes documented with file paths, before/after complexity

**Agent 3 - Memory & Resource Optimizer**

Fix memory leaks and resource management issues.

**Tasks**:
1. **Review memory issues** from optimization plan

2. **Fix unclosed file handles**:
   - Add try-finally blocks for file operations
   - Use context managers (Python `with`)
   - Use defer (Go)
   - Ensure close() called in all paths (success, error)
   - Example (Python):
   ```python
   # Before
   f = open('file.txt')
   data = f.read()

   # After
   with open('file.txt') as f:
     data = f.read()
   ```

3. **Fix unclosed database connections**:
   - Ensure connections returned to pool
   - Add finally blocks for connection cleanup
   - Use connection context managers
   - Handle errors properly

4. **Fix unclosed network sockets**:
   - Add socket cleanup in error handlers
   - Set timeouts on connections
   - Close sockets in finally blocks
   - Handle connection failures gracefully

5. **Fix event listener leaks**:
   - Add removeEventListener for each addEventListener
   - Add cleanup functions to React useEffect
   - Remove component event handlers on unmount
   - Use AbortController for fetch requests
   - Example (React):
   ```javascript
   useEffect(() => {
     const handler = () => { /* ... */ };
     window.addEventListener('resize', handler);
     return () => window.removeEventListener('resize', handler);
   }, []);
   ```

6. **Add cache size limits**:
   - Implement LRU cache with max size
   - Add TTL (time-to-live) for cache entries
   - Implement cache eviction policy
   - Clear cache periodically

7. **Clear large objects**:
   - Explicitly set to null when done
   - Clear arrays after processing
   - Release references in closures
   - Avoid global variable accumulation

8. **Fix timer leaks**:
   - Clear all setTimeout/setInterval
   - Clean timers on component unmount
   - Use clearTimeout/clearInterval properly

9. **For each fix**:
   - Use Edit tool to modify code
   - Add proper error handling
   - Test edge cases
   - Add comments explaining cleanup

**Output**: Memory optimization results with:
- File handle leaks fixed: [count] with locations
- Connection leaks fixed: [count] with locations
- Event listener leaks fixed: [count] with locations
- Caches with size limits: [count] with limits
- Timer leaks fixed: [count] with locations
- Memory cleared: [count] large object cleanups
- All changes documented with file paths and cleanup patterns

**Agent 4 - Frontend Optimizer**

Implement frontend-specific performance optimizations (if applicable).

**Tasks**:
1. **Review frontend issues** from optimization plan
2. **If no frontend detected**: Report "N/A - No frontend to optimize" and complete

3. **Reduce unnecessary re-renders** (React):
   - Wrap components with React.memo
   - Use useMemo for expensive computations
   - Use useCallback for event handlers
   - Move inline objects/arrays to constants
   - Example:
   ```javascript
   // Before
   <Component onClick={() => handler(id)} style={{margin: 10}} />

   // After
   const handleClick = useCallback(() => handler(id), [id]);
   const style = useMemo(() => ({margin: 10}), []);
   <Component onClick={handleClick} style={style} />
   ```

4. **Implement code splitting**:
   - Add React.lazy for route components
   - Add Suspense boundaries
   - Split large components
   - Use dynamic imports
   - Example:
   ```javascript
   const Dashboard = React.lazy(() => import('./Dashboard'));

   <Suspense fallback={<Loading />}>
     <Dashboard />
   </Suspense>
   ```

5. **Add lazy loading**:
   - Add loading="lazy" to images
   - Use Intersection Observer for off-screen content
   - Implement virtual scrolling for long lists
   - Lazy load third-party widgets

6. **Optimize images**:
   - Compress large images (>100KB)
   - Convert to WebP format where supported
   - Add responsive images with srcset
   - Add image dimensions (width/height)
   - Use CDN for image delivery

7. **Optimize JavaScript loading**:
   - Add defer attribute to script tags
   - Move non-critical scripts to async
   - Reduce third-party script impact
   - Implement script loading strategy

8. **Reduce bundle size**:
   - Check webpack/vite config for optimizations
   - Enable tree shaking
   - Enable minification and compression
   - Split vendor bundle from app code
   - Example webpack config:
   ```javascript
   optimization: {
     splitChunks: {
       chunks: 'all',
       cacheGroups: {
         vendor: {
           test: /node_modules/,
           name: 'vendors'
         }
       }
     }
   }
   ```

9. **Implement virtual scrolling**:
   - For lists >100 items, use react-window or react-virtualized
   - Render only visible items
   - Example:
   ```javascript
   import { FixedSizeList } from 'react-window';

   <FixedSizeList
     height={600}
     itemCount={items.length}
     itemSize={50}
   >
     {Row}
   </FixedSizeList>
   ```

10. **Optimize CSS**:
    - Enable CSS purging/tree shaking
    - Remove unused CSS
    - Minify CSS in production
    - Use CSS modules to avoid global styles

11. **Add service worker** (if applicable):
    - Cache static assets
    - Implement offline functionality
    - Pre-cache critical resources

12. **For each optimization**:
    - Use Edit tool to modify code
    - Test component functionality
    - Preserve existing behavior
    - Add comments

**Output**: Frontend optimization results with:
- Re-renders optimized: [count] components with memo/useMemo
- Code splitting: [count] routes/components split
- Lazy loading: [count] components/images made lazy
- Images optimized: [count] images with size reduction
- Bundle size reduced: -[X]MB/-[Y]%
- Virtual scrolling: [count] long lists optimized
- All changes documented with file paths and techniques used

**Critical**: Wait for ALL 4 agents to complete. Document all optimizations made.

**Optimization Implementation Summary** (2000-3000 tokens):
```markdown
# Optimization Implementation Summary

## Database Optimizations
### Indexes Added: [count]
- [Table.column]: [reason] - [file]:[line]
- [Table.column]: [reason] - [file]:[line]

### N+1 Queries Fixed: [count]
- [Location]: Changed to eager loading - [file]:[line]
- [Location]: Batched queries - [file]:[line]

### Query Optimizations: [count]
- [Query]: Rewrote with better joins - [file]:[line]

### Caching Implemented
- [Query type]: Redis cache, TTL=5min - [file]:[line]

## Algorithm Optimizations
### Complexity Improvements: [count]
- [Function]: O(n²) → O(n) using Map - [file]:[line]
- [Function]: O(n²) → O(n log n) using sort - [file]:[line]

### Memoization Added: [count]
- [Function]: Added memoization wrapper - [file]:[line]

### Data Structure Changes: [count]
- [Location]: Array → Map for O(1) lookup - [file]:[line]

## Memory Optimizations
### Resource Leaks Fixed: [count]
- [File]: Added file handle cleanup - [file]:[line]
- [File]: Fixed event listener leak - [file]:[line]

### Cache Limits Added: [count]
- [Cache]: Max size 1000, LRU eviction - [file]:[line]

## Frontend Optimizations
### Re-render Optimizations: [count]
- [Component]: Added React.memo - [file]:[line]
- [Component]: Added useMemo/useCallback - [file]:[line]

### Code Splitting: [count]
- [Route]: Added lazy loading - [file]:[line]

### Image Optimizations: [count]
- [Image]: Added lazy loading - [file]:[line]
- [Image]: Compressed, -[X]KB - [file path]

### Bundle Size Reduction
- Before: [X]MB
- After: [Y]MB
- Reduction: -[Z]MB (-[P]%)

## Files Modified: [count]
[List of all modified files with brief description of changes]

## Risks Mitigated
- All changes preserve existing functionality
- Edge cases handled
- Error handling maintained
- Tests should still pass
```

---

### 6. Validation & Benchmarking Wave (Post-Optimization Measurement)

**Purpose**: Verify optimizations worked, measure improvements, and ensure no functionality broken.

Launch 3 agents **IN PARALLEL** (single message with multiple Task calls):

**Agent 1 - Post-Optimization Benchmark Runner**

Run benchmarks again to measure performance improvements.

**Tasks**:
1. **Re-run all baseline tests** from Wave 4:
   - Execute same test commands
   - Capture new metrics
   - Save to `.claude/performance/[TIMESTAMP]/post-optimization-tests.txt`

2. **Measure critical operations** again:
   - Same API endpoints as baseline
   - Same database queries as baseline
   - Same algorithms as baseline
   - Same frontend metrics as baseline

3. **Re-measure application metrics**:
   - Startup time
   - Build time and output size
   - Memory usage
   - Database query times

4. **Compare with baseline**:
   - Calculate percentage improvements
   - Identify metrics that improved
   - Identify metrics that regressed (if any)
   - Calculate overall improvement

5. **If benchmarks fail**:
   - Note the failure
   - Try to identify cause
   - Check if code changes broke tests
   - Report to validation agent

**Output**: Post-optimization benchmark results with:
- All metrics re-measured
- Comparison with baseline
- Percentage improvements for each metric
- Any regressions detected
- Overall performance improvement percentage
- Results saved to file

**Agent 2 - Functionality Validator**

Verify that optimizations didn't break existing functionality.

**Tasks**:
1. **Run existing test suite**:
   - Detect test command: `npm test`, `pytest`, `go test`, etc.
   - Execute full test suite
   - Capture test results
   - Save to `.claude/performance/[TIMESTAMP]/test-results.txt`

2. **Check for test failures**:
   - If tests pass: Report success
   - If tests fail: Identify which tests failed
   - Analyze if failures related to optimizations
   - Check for timing-related test failures

3. **Code review of changes**:
   - Review all modified files
   - Verify edge cases handled
   - Check error handling preserved
   - Ensure async/await used correctly
   - Verify resource cleanup in all code paths

4. **Check for common issues**:
   - Race conditions introduced by parallelization
   - Caching causing stale data
   - Memory leaks from incomplete cleanup
   - Off-by-one errors from algorithm changes

5. **Build verification**:
   - Try to build the project
   - Check for compilation errors
   - Verify build succeeds
   - Check build artifacts

6. **If tests fail or issues found**:
   - Document specific failures
   - Identify problematic optimizations
   - Recommend rollback of specific changes
   - Suggest fixes

**Output**: Functionality validation report with:
- Test results: [X] passed, [Y] failed
- Test failures analyzed (if any)
- Code review findings
- Build status: Success/Failed
- Issues found: [count] with descriptions
- Recommendations for fixing issues

**Agent 3 - Performance Report Generator**

Generate comprehensive performance optimization report.

**Tasks**:
1. **Compile all data**:
   - Profiling results from Wave 2
   - Optimization plan from Wave 3
   - Baseline metrics from Wave 4
   - Optimizations implemented from Wave 5
   - Post-optimization metrics from Wave 6
   - Test results from validation

2. **Calculate improvements**:
   - For each metric category
   - Overall performance improvement
   - Improvement by optimization type
   - Cost/benefit analysis

3. **Create detailed report** with sections:
   - Executive summary
   - Methodology
   - Baseline performance
   - Issues identified
   - Optimizations implemented
   - Performance improvements
   - Test results
   - Recommendations

4. **Generate visualizations** (text-based):
   - Before/after comparison tables
   - Performance improvement chart (ASCII)
   - Optimization impact breakdown

5. **Save report**:
   - Main report: `.claude/performance/[TIMESTAMP]/performance-report.md`
   - Create summary for user display

**Output**: Performance optimization report saved to file with:
- Complete methodology and findings
- Before/after metrics with improvements
- List of all optimizations with impact
- Test results and validation
- Recommendations for further optimization
- Success criteria evaluation

**Critical**: Wait for ALL 3 agents to complete before final report.

**Final Performance Report** (3000-5000 tokens):
```markdown
# Performance Optimization Report

**Generated**: [timestamp]
**Target**: [path]
**Optimization Duration**: [time elapsed]

---

## Executive Summary

Performance optimization completed successfully with **[X]%** overall performance improvement across [Y] bottlenecks. [Z] optimizations were implemented spanning database, algorithm, memory, and frontend categories.

**Key Achievements**:
- Response time reduced by [X]%
- Memory usage reduced by [Y]%
- Bundle size reduced by [Z]MB
- Database queries [W]% faster
- All tests passing: [Yes/No]

**Success Criteria**: [Met/Not Met]
- Target: 30%+ improvement - [Achieved: X%]
- No functionality broken - [Status]
- Tests passing - [Status]
- Changes documented - [Status]

---

## Methodology

### Wave 1: Profiling (Performance Analysis)
Analyzed codebase across 4 dimensions:
- Database queries (N+1, missing indexes, slow queries)
- Algorithm complexity (nested loops, inefficient algorithms)
- Memory management (leaks, unclosed resources)
- Frontend performance (re-renders, bundle size)

**Issues Identified**: [count] bottlenecks
- CRITICAL: [count]
- HIGH: [count]
- MEDIUM: [count]
- LOW: [count]

### Wave 2: Strategy (Optimization Planning)
Prioritized bottlenecks by impact and designed optimization approaches:
- Priority ranking by user impact
- Impact estimation for each fix
- Optimization strategy selection
- Implementation planning

### Wave 3: Baseline (Pre-Optimization Metrics)
Established performance baseline:
- Automated benchmarks
- Manual measurements
- Critical path performance
- Build and memory metrics

### Wave 4: Implementation (Apply Optimizations)
Applied optimizations in parallel across:
- Database (indexes, batching, eager loading)
- Algorithms (better data structures, memoization)
- Memory (cleanup, size limits, leak fixes)
- Frontend (code splitting, lazy loading, memoization)

### Wave 5: Validation (Post-Optimization Metrics)
Verified improvements and functionality:
- Re-ran all benchmarks
- Validated functionality with tests
- Measured actual improvements
- Generated this report

---

## Baseline Performance

**Measured**: [timestamp]

### Response Times
- API average: [X]ms
- Slowest endpoint: [Y]ms
- Database query avg: [Z]ms

### Resource Usage
- Memory usage: [X]MB
- Bundle size: [Y]MB
- Build time: [Z]s

### Critical Paths
1. [Path 1]: [performance]
2. [Path 2]: [performance]
3. [Path 3]: [performance]

[Full baseline data in: .claude/performance/[TIMESTAMP]/baseline-*.txt]

---

## Issues Identified

### Database Issues: [count]

#### Critical Issues
1. **N+1 Query in User Posts** - [file]:[line]
   - Impact: +500ms per request
   - Severity: CRITICAL

2. **Missing Index on email** - [table]
   - Impact: +200ms per query
   - Severity: HIGH

[List top 10-15 database issues]

### Algorithm Issues: [count]

#### Critical Issues
1. **O(n²) Loop in processItems** - [file]:[line]
   - Complexity: O(n²) with n=1000
   - Impact: +2000ms execution time
   - Severity: CRITICAL

[List top 10-15 algorithm issues]

### Memory Issues: [count]

#### Critical Issues
1. **Unclosed Database Connections** - [file]:[line]
   - Leak rate: ~10MB/hour
   - Impact: Server crash after 48h
   - Severity: CRITICAL

[List top 10-15 memory issues]

### Frontend Issues: [count]

#### Critical Issues
1. **Large Bundle Size** - [file]
   - Size: 5.2MB (uncompressed)
   - Impact: +3s load time
   - Severity: HIGH

[List top 10-15 frontend issues]

---

## Optimizations Implemented

### Database Optimizations: [count]

#### Indexes Added: [count]
1. `users.email` - B-tree index for login queries
   - File: [migration file]
   - Estimated improvement: -80% query time

2. `posts.user_id` - Foreign key index
   - File: [migration file]
   - Estimated improvement: -60% query time

#### N+1 Queries Fixed: [count]
1. User posts loading - Changed to eager loading
   - File: [file]:[line]
   - Before: 1 + N queries
   - After: 1 query with JOIN
   - Improvement: -90% query time

#### Query Optimizations: [count]
1. Dashboard query - Rewritten with better joins
   - File: [file]:[line]
   - Before: 3 separate queries
   - After: 1 optimized query
   - Improvement: -70% query time

#### Caching Implemented
1. User profile queries - Redis cache, TTL=5min
   - File: [file]:[line]
   - Cache hit rate: ~80% expected
   - Improvement: -95% avg query time

### Algorithm Optimizations: [count]

#### Complexity Improvements: [count]
1. findMatchingItems - O(n²) → O(n)
   - File: [file]:[line]
   - Technique: HashMap lookup instead of nested find
   - Before: 2000ms for n=1000
   - After: 2ms for n=1000
   - Improvement: -99% execution time

2. sortAndFilter - O(n²) → O(n log n)
   - File: [file]:[line]
   - Technique: Single pass with sort
   - Improvement: -75% execution time

#### Memoization Added: [count]
1. calculateExpensiveValue - Memoized with LRU cache
   - File: [file]:[line]
   - Cache size: 100 entries
   - Improvement: -98% for cached calls

#### Data Structure Changes: [count]
1. userMap - Changed from Array to Map
   - File: [file]:[line]
   - Before: O(n) lookup with find
   - After: O(1) lookup with Map.get
   - Improvement: -95% lookup time

### Memory Optimizations: [count]

#### Resource Leaks Fixed: [count]
1. File handles - Added try-finally cleanup
   - File: [file]:[line]
   - Before: Handles left open
   - After: Properly closed in all paths

2. Event listeners - Added cleanup in useEffect
   - File: [file]:[line]
   - Before: Listeners accumulate
   - After: Removed on unmount

#### Cache Limits Added: [count]
1. responseCache - LRU with max 1000 entries
   - File: [file]:[line]
   - Before: Unlimited growth
   - After: Bounded memory, LRU eviction

### Frontend Optimizations: [count]

#### Re-render Optimizations: [count]
1. Dashboard component - Added React.memo
   - File: [file]:[line]
   - Improvement: -60% re-renders

2. ListItem components - Added useMemo for calculations
   - File: [file]:[line]
   - Improvement: -40% render time

#### Code Splitting: [count]
1. Dashboard route - Lazy loaded with React.lazy
   - File: [file]:[line]
   - Bundle size: Moved 500KB to separate chunk
   - Improvement: -500KB initial bundle

2. Settings route - Lazy loaded
   - File: [file]:[line]
   - Bundle size: Moved 300KB to separate chunk

#### Image Optimizations: [count]
1. Hero image - Compressed and added WebP
   - File: [file path]
   - Before: 2.5MB PNG
   - After: 150KB WebP
   - Reduction: -94%

2. Product images - Added lazy loading
   - File: [file]:[line]
   - Improvement: -2s initial page load

#### Bundle Size Reduction
- Before: 5.2MB (uncompressed), 1.8MB (gzipped)
- After: 3.1MB (uncompressed), 1.1MB (gzipped)
- Reduction: -2.1MB (-40% uncompressed), -700KB (-39% gzipped)
- Techniques: Code splitting, tree shaking, vendor bundle split

---

## Performance Improvements

### Before vs. After Comparison

#### Response Times
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| API avg response | [X]ms | [Y]ms | -[Z]% |
| Dashboard load | [X]ms | [Y]ms | -[Z]% |
| Database query avg | [X]ms | [Y]ms | -[Z]% |
| Search operation | [X]ms | [Y]ms | -[Z]% |

#### Resource Usage
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Memory usage | [X]MB | [Y]MB | -[Z]% |
| Bundle size (gz) | [X]MB | [Y]MB | -[Z]% |
| Build time | [X]s | [Y]s | -[Z]% |

#### Critical Paths
| Path | Before | After | Improvement |
|------|--------|-------|-------------|
| [Path 1] | [X]ms | [Y]ms | -[Z]% |
| [Path 2] | [X]ms | [Y]ms | -[Z]% |
| [Path 3] | [X]ms | [Y]ms | -[Z]% |

### Overall Performance Improvement: **[X]%**

### Improvement by Category
- Database optimizations: -[X]% query time
- Algorithm optimizations: -[Y]% execution time
- Memory optimizations: -[Z]% memory usage
- Frontend optimizations: -[W]% load time

### Performance Improvement Chart
```
Response Time (ms)
[Visual ASCII chart showing before/after]
```

---

## Test Results & Validation

### Test Suite Execution
- **Status**: [PASSED / FAILED]
- **Tests run**: [count]
- **Tests passed**: [count]
- **Tests failed**: [count]
- **Coverage**: [X]%

### Test Failures (if any)
[List any test failures with analysis]

1. **[Test name]** - [file]:[line]
   - Reason: [Why it failed]
   - Related to optimization: [Yes/No]
   - Fix recommended: [Description]

### Functionality Verification
- ✓ All critical paths tested
- ✓ Edge cases validated
- ✓ Error handling preserved
- ✓ Resource cleanup verified
- [✓/✗] No regressions detected

### Build Verification
- **Status**: [SUCCESS / FAILED]
- **Build time**: [X]s
- **Output size**: [Y]MB
- **Errors**: [count]

---

## Code Changes Summary

### Files Modified: [count]

#### Database Layer
- [file1]: Added indexes, eager loading
- [file2]: Implemented query caching
- [file3]: Connection pool configuration

#### Business Logic
- [file1]: Algorithm optimization O(n²) → O(n)
- [file2]: Added memoization
- [file3]: Data structure changes

#### Frontend
- [file1]: Code splitting, lazy loading
- [file2]: React.memo, useMemo optimizations
- [file3]: Image optimization

#### Resource Management
- [file1]: File handle cleanup
- [file2]: Event listener cleanup
- [file3]: Cache size limits

[Full list of changes in optimization summary]

---

## Recommendations

### Further Optimizations (Not Implemented)
1. **[Optimization name]**
   - Reason not implemented: [e.g., high risk, requires architectural change]
   - Potential impact: -[X]% additional improvement
   - Recommended timeline: [When to consider]

2. **[Optimization name]**
   - Reason not implemented: [e.g., requires external dependency]
   - Potential impact: -[Y]% additional improvement

### Monitoring Recommendations
1. **Add performance monitoring**: Implement APM (New Relic, Datadog)
2. **Add performance budgets**: Set thresholds for key metrics
3. **Continuous benchmarking**: Run performance tests in CI/CD
4. **Database monitoring**: Track slow queries and index usage
5. **Frontend monitoring**: Track Core Web Vitals (LCP, FID, CLS)

### Best Practices Going Forward
1. **Database**: Always use eager loading for relations, add indexes for foreign keys
2. **Algorithms**: Profile before optimizing, use appropriate data structures
3. **Memory**: Always cleanup resources in finally blocks, use LRU caches
4. **Frontend**: Code split by route, lazy load images, memoize expensive components

### Prevention Strategies
1. **Code Review Checklist**: Add performance review criteria
2. **Performance Tests**: Add performance tests for critical paths
3. **Linting Rules**: Add ESLint rules for common anti-patterns
4. **Documentation**: Document performance patterns and anti-patterns

---

## Success Criteria Evaluation

### Target: 30%+ Performance Improvement
- **Result**: [X]% improvement
- **Status**: [✓ MET / ✗ NOT MET]

### No Functionality Broken
- **Tests passing**: [Yes/No]
- **Regressions**: [count]
- **Status**: [✓ MET / ✗ NOT MET]

### All Tests Pass
- **Test results**: [X] passed, [Y] failed
- **Status**: [✓ MET / ✗ NOT MET]

### Optimizations Documented
- **Files changed**: [count] with descriptions
- **Comments added**: Yes
- **Status**: [✓ MET]

### Overall Success: [✓ SUCCESS / ✗ PARTIAL SUCCESS / ✗ FAILURE]

---

## Conclusion

Performance optimization completed with **[overall status]**. Achieved **[X]%** performance improvement across [Y] bottlenecks through [Z] optimizations.

**Key Wins**:
- [Top improvement 1]
- [Top improvement 2]
- [Top improvement 3]

**Challenges**:
- [Challenge 1 if any]
- [Challenge 2 if any]

**Next Steps**:
1. [Immediate next action]
2. [Short-term recommendation]
3. [Long-term recommendation]

---

## Appendix

### Files Generated
- Performance report: `.claude/performance/[TIMESTAMP]/performance-report.md`
- Baseline tests: `.claude/performance/[TIMESTAMP]/baseline-tests.txt`
- Baseline manual: `.claude/performance/[TIMESTAMP]/baseline-manual.txt`
- Post-optimization tests: `.claude/performance/[TIMESTAMP]/post-optimization-tests.txt`
- Test results: `.claude/performance/[TIMESTAMP]/test-results.txt`

### References
- Profiling results: Wave 2 output
- Optimization plan: Wave 3 output
- Implementation details: Wave 5 output

---

**Report End**
```

Display summary to user and save full report to file.

---

## Execution Guidelines

### Parallelization Rules

**Within Each Wave**: Always launch agents in a SINGLE message with multiple Task tool calls. This is critical for performance.

Example Wave 2:
```
Launching 4 profiling agents in parallel:
- Agent 1: Database Query Analyzer (searching for N+1 queries, indexes...)
- Agent 2: Algorithm Complexity Detector (searching for nested loops, O(n²)...)
- Agent 3: Memory Leak Detector (searching for unclosed resources, leaks...)
- Agent 4: Frontend Performance Scanner (searching for re-renders, bundle issues...)
```

**Between Waves**: ALWAYS wait for all agents in current wave to complete before starting the next wave. Synthesize findings between waves.

### Context Management Strategy

**After Wave 2 (Profiling)**:
1. Consolidate all 4 agent outputs into concise summary (2000-3000 tokens)
2. Focus on: severity, impact, location, suggested fixes
3. Remove redundant details from full agent reports
4. Pass consolidated bottleneck summary (not full outputs) to Wave 3

**After Wave 3 (Strategy)**:
1. Optimization plan document (2000-3000 tokens) contains prioritized plan
2. This becomes primary input to Wave 5 (skip to Wave 4 for baseline)
3. No need to carry forward Wave 2 profiling details

**After Wave 5 (Implementation)**:
1. Implementation summary (2000-3000 tokens) lists all changes made
2. Pass summary + baseline metrics to Wave 6 for validation
3. Remove detailed code snippets, keep file paths and change descriptions

**Token Budget Tracking**:
- Wave 1 (Validation): ~500 tokens
- Wave 2 (Profiling): ~20,000-30,000 tokens (4 parallel agents)
- Wave 2 Consolidation: ~3,000 tokens
- Wave 3 (Strategy): ~8,000-10,000 tokens (2 parallel agents)
- Wave 4 (Baseline): ~5,000-8,000 tokens (2 parallel agents)
- Wave 5 (Implementation): ~25,000-35,000 tokens (4 parallel agents)
- Wave 5 Consolidation: ~3,000 tokens
- Wave 6 (Validation): ~10,000-15,000 tokens (3 parallel agents)
- Total estimated: ~80,000-110,000 tokens for full optimization
- If approaching limits (>80% budget), prioritize high-severity issues only

### Error Handling

**If TARGET_PATH Invalid**:
- Display clear error message with the invalid path
- Suggest checking spelling or using absolute path
- Exit gracefully (do not proceed with analysis)

**If No Performance Issues Found**:
- Valid outcome for well-optimized code
- Report: "No significant performance bottlenecks detected"
- Still provide analysis metadata and recommendations for monitoring
- Suggest: "Consider adding performance monitoring for continuous tracking"

**If Agent Fails During Wave**:
- Log the failure but continue with other agents
- Note missing analysis category in consolidation
- Do not let single agent failure block entire workflow
- Include gap note in final report

**If Baseline Benchmarking Fails**:
- Document inability to measure
- Proceed with best-effort optimization based on code analysis
- Skip baseline metrics, continue to implementation
- Note in final report: "Baseline unavailable, improvements estimated from code analysis"
- Recommend adding performance tests for future

**If Optimization Breaks Tests**:
- **Critical**: If tests were passing before and fail after
- Identify which optimizations caused failures
- Options:
  1. **Rollback problematic optimization**: Use Edit to revert specific changes
  2. **Fix the optimization**: Correct the implementation
  3. **Update tests**: If tests need updating for valid change
- Re-run tests after fix
- Document the issue and resolution in report
- If cannot fix: Mark optimization as "Attempted but rolled back" in report

**If Cannot Measure Improvement**:
- Document all changes made
- Estimate improvements based on complexity analysis
- Suggest manual testing scenarios
- Recommend: "Add performance monitoring to measure impact"
- Include estimated improvements in report with disclaimer

**If Token Budget Exhausted**:
- Immediately finalize with current progress
- Generate partial report noting incomplete analysis
- Provide summary of what was covered vs. skipped
- Recommend: "Run /optimize on specific subdirectories for focused analysis"

### Adaptive Scaling

**Small Target (<1K LOC, <50 files)**:
- Use all agents as designed
- Comprehensive optimization
- Detailed reporting
- Estimated time: 5-10 minutes

**Medium Target (1K-50K LOC, 50-1000 files)**:
- Use all agents as designed
- Standard optimization depth
- Comprehensive reporting
- Estimated time: 15-30 minutes

**Large Target (50K-100K LOC, 1000-5000 files)**:
- Use all agents with focused scope
- Prioritize high-impact files (entry points, hot paths)
- Sample rather than exhaustive analysis
- Summary reporting for low-priority findings
- Estimated time: 30-50 minutes

**Huge Target (>100K LOC, >5000 files)**:
- Warn user about large scope
- Suggest: "Consider targeting specific subdirectories for more focused optimization"
- If user confirms, optimize only:
  - Entry points and API routes
  - Most complex files (top 20%)
  - Files with most imports/dependencies
  - Database interaction code
- Brief reporting focused on critical optimizations only
- Estimated time: 60+ minutes

**Single File Target**:
- Adapt Wave 2 agents to focus on single file
- Analyze file-specific performance issues
- Apply relevant optimizations
- Quick validation
- Concise reporting

### Wave-Specific Guidelines

**Wave 2 - Profiling**:
- Focus on code patterns, not exhaustive coverage
- Prioritize security-critical and high-traffic code
- Use severity ratings to guide depth of analysis
- Sample large codebases intelligently

**Wave 3 - Strategy**:
- Always prioritize user-facing performance over backend
- Consider fix risk: low-risk optimizations first
- Group related optimizations for efficiency
- Plan for rollback if optimization fails

**Wave 4 - Baseline**:
- If no automated tests exist, skip to manual estimation
- Don't spend excessive time on measurement
- Best-effort baseline is sufficient
- Document measurement methodology

**Wave 5 - Implementation**:
- Make one optimization at a time where possible
- Test after each significant change (if fast tests available)
- Add comments explaining each optimization
- Preserve existing functionality meticulously
- Use Edit tool for precision changes

**Wave 6 - Validation**:
- Always run tests if available
- If tests fail, identify root cause immediately
- Rollback failed optimizations quickly
- Document all improvements and issues honestly

---

## Report Format

The final report will be a comprehensive markdown document including:

1. **Executive Summary**: High-level results and key achievements
2. **Methodology**: Overview of 5-wave approach
3. **Baseline Performance**: Pre-optimization metrics
4. **Issues Identified**: Detailed breakdown by category with severity
5. **Optimizations Implemented**: Comprehensive list of all changes
6. **Performance Improvements**: Before/after comparison with metrics
7. **Test Results & Validation**: Test pass/fail, functionality verification
8. **Code Changes Summary**: Files modified with descriptions
9. **Recommendations**: Further optimizations, monitoring, best practices
10. **Success Criteria Evaluation**: Met/not met for each criterion
11. **Conclusion**: Overall status and next steps
12. **Appendix**: Files generated, references

Each optimization includes:
- Type and category
- File location and line number
- Before and after code/metrics
- Performance improvement
- Technique used
- Rationale

---

## Success Criteria

The optimization workflow is only complete when:

- ✓ All 6 waves executed (or Wave 4 skipped if no baseline possible)
- ✓ At least Wave 2 (Profiling) and Wave 5 (Implementation) completed
- ✓ Performance improvements measured or estimated
- ✓ Functionality validated (tests pass or no tests available)
- ✓ Final report generated with all required sections
- ✓ All changes documented with file paths and descriptions
- ✓ User receives actionable performance improvement summary

**Ideal Success**:
- ✓ 30%+ performance improvement achieved
- ✓ All tests passing
- ✓ No regressions
- ✓ Changes fully documented

**Acceptable Success**:
- ✓ 10-29% performance improvement achieved
- ✓ Most tests passing (minor failures unrelated to optimizations)
- ✓ Changes documented

**Partial Success**:
- ✓ Optimizations implemented but improvements not measured
- ✓ Some test failures requiring investigation
- ✓ Improvements estimated based on code analysis

---

## Usage Examples

**Optimize entire project**:
```
/optimize
```

**Optimize specific directory**:
```
/optimize src/api/
/optimize backend/services/
```

**Optimize specific file**:
```
/optimize src/components/Dashboard.tsx
/optimize backend/queries/user.py
```

**Optimize with specific focus**:
```
/optimize src/database/    # Focus on database performance
/optimize src/frontend/    # Focus on frontend performance
```

---

## Notes

- **Comprehensive approach**: This command performs profiling, optimization, and validation in a systematic 6-wave workflow.
- **Measurable results**: Focuses on measurable performance improvements with before/after metrics.
- **Safe optimizations**: Preserves functionality, validates with tests, documents all changes.
- **Parallel execution**: Uses parallel agents within each wave for maximum efficiency.
- **Adaptive**: Scales approach based on codebase size and target path.
- **Best results**: Most effective with JavaScript, TypeScript, Python, Go, Java codebases with test suites.
- **Optimization categories**: Database (indexes, batching), Algorithms (complexity reduction), Memory (leak fixes), Frontend (bundle size, re-renders).
- **Not exhaustive**: Focuses on common performance bottlenecks. May not detect all possible optimizations.
- **Complementary**: Use alongside profiling tools (Chrome DevTools, py-spy, pprof), APM tools (New Relic, Datadog), and manual performance testing.
- **Privacy note**: All analysis is performed locally. No code is transmitted externally.
