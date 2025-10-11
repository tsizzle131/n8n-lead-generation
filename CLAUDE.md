# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Core Principles for Autonomous Work

**Default to Action**: Don't ask for permission to use tools or make standard changes. Just do it and report what you did.

**Proactive Tool Usage**: Use MCP servers liberally. If there's a tool that could help, use it immediately.

**Test Everything**: Write tests before and during development. Every feature should have test coverage.

**Use Subagents**: For complex tasks, spawn subagents to work in parallel. Don't do everything sequentially.

**Document as You Go**: Update Linear, add code comments, and document decisions without being asked.

## System Overview

This is a multi-phase lead generation system that scrapes business data from Google Maps and enriches it with contact information from Facebook, LinkedIn, and email verification. The system uses AI (OpenAI) for intelligent ZIP code analysis and coverage planning.

## Autonomous Workflow Patterns

### Starting Your Work Session

**ALWAYS do this first without asking:**

1. **Check Linear for your tasks**
   ```
   Use: list_issues with assignee: "me"
   ```
   - Review assigned issues
   - Check for blockers or dependencies
   - Update issue status to "In Progress"

2. **Verify system health**
   ```
   Use: browser_navigate to http://localhost:3000
   Use: browser_console_messages to check for errors
   Use: list_tables to verify database connection
   ```

3. **Pull latest documentation if needed**
   ```
   Use: mcp__context7__resolve-library-id for any libraries you'll use
   ```

### During Development

**ALWAYS do these without asking:**

- **Found a bug?** → Create Linear issue immediately
- **Need library docs?** → Use Context7 right away
- **Database change needed?** → Run the migration and update advisors
- **Frontend not working?** → Use Playwright to debug
- **Uncertain about approach?** → Use Perplexity to research best practices
- **Feature complete?** → Write tests, update Linear, commit

### Complex Task Workflow

For tasks requiring multiple steps:

1. **Break it down** - Identify 3-5 subtasks
2. **Create Linear issues** for each subtask
3. **Use subagents** to work on independent subtasks in parallel
4. **Coordinate** - Merge results and test integration

**Example:**
```
Task: Add rate limiting to all endpoints

Subagents:
1. Research rate limiting libraries (Perplexity + Context7)
2. Implement middleware (code + tests)
3. Update all endpoints (code + tests)
4. Add monitoring/logging (code + tests)
5. Update documentation

Don't do these sequentially - spawn subagents!
```

## Available MCP Servers

### Context7 - Library Documentation

**When to use:** ALWAYS look up documentation before using a library, even if you think you know it.

```
Tools: mcp__context7__resolve-library-id, mcp__context7__get-library-docs
```

**Use proactively for:**
- Any npm package or Python library (even common ones)
- Checking latest API changes
- Verifying correct usage patterns
- Finding better alternatives

**Workflow:**
```javascript
// ALWAYS do this before using a library
1. resolve-library-id for "library-name"
2. get-library-docs with returned ID
3. Implement using current best practices
```

**Examples:**
- "Using React hooks" → Look up React docs first
- "Need to hash passwords" → Look up bcrypt docs
- "Rate limiting needed" → Research express-rate-limit

### Playwright - Browser Automation

**When to use:** ALWAYS test frontend changes in the browser.

```
Tools: browser_navigate, browser_snapshot, browser_click, browser_type,
       browser_evaluate, browser_take_screenshot, browser_console_messages
```

**Use proactively for:**
- Testing every frontend change you make
- Debugging console errors
- Verifying user flows
- Checking responsive design
- Testing forms and interactions

**Standard testing workflow:**
```javascript
1. browser_navigate to localhost:3000
2. browser_console_messages (check for errors)
3. browser_snapshot (understand page structure)
4. browser_click/type to test interactions
5. browser_take_screenshot for visual confirmation
```

**IMPORTANT**: Always check console messages after any page interaction. Don't assume it worked.

### Supabase - Database Operations

**When to use:** ALWAYS verify schema before writing queries.

```
Tools: list_tables, execute_sql, apply_migration, get_advisors,
       list_projects, get_project, generate_typescript_types
```

**Use proactively for:**
- Checking current schema before writing queries
- Running migrations immediately when needed
- Verifying RLS policies after schema changes
- Debugging data issues
- Generating TypeScript types after schema changes

**Migration workflow:**
```sql
1. Write migration SQL
2. apply_migration with the SQL
3. get_advisors to check for security issues
4. generate_typescript_types to update frontend types
5. Update Linear issue with changes
```

**IMPORTANT Security:**
- ALWAYS run `get_advisors` after schema changes
- Fix any RLS policy warnings immediately
- Never skip this step

### Perplexity - Web Search & Research

**When to use:** BEFORE implementing anything non-trivial.

```
Tools: mcp__perplexity__search, mcp__perplexity__reason, mcp__perplexity__deep_research
```

**Use proactively for:**
- Researching best practices before coding
- Comparing implementation approaches
- Finding security vulnerabilities
- Checking current best practices
- Learning new technologies

**Decision tree:**

**Quick lookup** → `search`
- "What's the latest Node version?"
- "Current rate limits for OpenAI API?"
- "How to hash passwords in Node.js?"

**Comparing options** → `reason`
- "Best rate limiting library for Express?"
- "Puppeteer vs Playwright for scraping?"
- "PostgreSQL indexing strategies for this query?"

**Deep understanding** → `deep_research`
- "Complete guide to API security best practices"
- "Comprehensive web scraping architecture patterns"
- "CAPTCHA bypass strategies and ethics"

**IMPORTANT**: Use `reason` or `deep_research` for ANY new feature. Don't guess at implementation.

### Linear - Project Management

**When to use:** ALWAYS use Linear proactively throughout your work.

```
Tools: list_issues, create_issue, update_issue, get_issue,
       list_projects, create_project, list_comments, create_comment
```

**Use proactively for:**
- **Session start**: Check assigned issues
- **Found bug**: Create issue immediately
- **Starting work**: Update status to "In Progress"
- **Progress update**: Add comment every 30-60 minutes
- **Blocked**: Create comment explaining blocker
- **Feature complete**: Update to "Done" and add completion comment
- **New idea**: Create issue for future work

**Never ask permission** - Just use Linear. Examples:

```javascript
// Starting work on assigned issue
update_issue({
  issueId: "ABC-123",
  stateId: "in-progress-state-id",
  comment: "Starting implementation of rate limiting middleware"
})

// Found a bug while working
create_issue({
  title: "React console warning in campaign form",
  description: "Found warning about missing key prop in campaign list...",
  priority: 2,
  labels: ["bug", "frontend"]
})

// Progress update
create_comment({
  issueId: "ABC-123",
  body: "Rate limiting middleware complete. Running tests now."
})
```

**IMPORTANT**: Linear is your communication tool. Use it constantly.

## Testing Philosophy

### Test-Driven Development Approach

**ALWAYS write tests. No exceptions.**

1. **Before coding**: Write test cases for what you're building
2. **During coding**: Run tests frequently
3. **After coding**: Ensure 100% test coverage for new code

### Testing Patterns by Component

**Backend API Endpoints:**
```javascript
// Create test file: test_[feature].js
// Test: Success case, error cases, edge cases
// Run: node test_[feature].js
```

**Frontend Components:**
```javascript
// Use Playwright for E2E tests
// Test: Rendering, interactions, error states
// Verify: Console has no errors
```

**Database Operations:**
```javascript
// Test: CRUD operations, constraints, RLS policies
// Verify: Data integrity, security
```

**Python Modules:**
```python
# Create test file: test_[module].py
# Use pytest or unittest
# Test: Success path, exceptions, edge cases
```

### Automated Test Writing

**For every new feature:**

1. Create test file immediately
2. Write test cases based on requirements
3. Implement feature
4. Run tests
5. Fix until all pass
6. Add more edge case tests
7. Document test coverage in Linear

**Example workflow:**
```bash
# New feature: Add rate limiting
1. Create: test_rate_limiting.js
2. Write tests for:
   - Normal request (should succeed)
   - Too many requests (should get 429)
   - Rate limit reset (should work again)
   - Different endpoints (should have separate limits)
3. Implement middleware
4. Run: node test_rate_limiting.js
5. Fix bugs
6. Repeat until green
7. Update Linear: "Rate limiting complete with test coverage"
```

## Subagent Usage Patterns

### When to Use Subagents

**Use subagents for ANY task with multiple independent subtasks.**

**Good candidates:**
- Parallel API endpoint creation
- Multi-file refactoring
- Independent component development
- Documentation updates across files
- Testing multiple scenarios
- Research + implementation in parallel

**Poor candidates:**
- Sequential dependent tasks
- Single file changes
- Tasks requiring shared context

### Subagent Task Assignment

**Pattern:**
```
Main agent: Break task into independent subtasks
Subagent 1: Research best practices (Perplexity)
Subagent 2: Implement backend (code + tests)
Subagent 3: Implement frontend (code + tests)
Subagent 4: Update documentation
Subagent 5: Create Linear issues for follow-ups

Main agent: Coordinate, merge, integration test
```

**Example: Adding New Enrichment Source**

```
Task: Add Instagram scraping to enrichment pipeline

Subagent 1: Research Instagram scraping
- Use Perplexity deep_research
- Find available APIs/services
- Document costs and limitations

Subagent 2: Create scraper module
- Implement instagram_scraper.py
- Add to campaign manager
- Write unit tests

Subagent 3: Database layer
- Design enrichment table
- Write migration
- Add Supabase methods
- Test queries

Subagent 4: Frontend integration
- Add Instagram toggle to UI
- Update campaign form
- Test with Playwright

Subagent 5: Documentation
- Update CLAUDE.md
- Add API documentation
- Create usage examples

Main: Integration testing and Linear updates
```

### Subagent Communication

**Main agent responsibilities:**
- Break down task clearly
- Assign specific deliverables
- Set completion criteria
- Coordinate conflicts
- Merge results
- Run integration tests

**Subagent responsibilities:**
- Complete assigned task fully
- Write tests for changes
- Document decisions
- Report blockers immediately
- Don't wait for permission

## Architecture

### Three-Tier Architecture

1. **React Frontend** (`frontend/`) - Port 3000
   - Main UI component: `GoogleMapsCampaigns.tsx` for campaign management
   - Communicates with Express backend on port 5001
   - Configuration in `frontend/.env`

2. **Node.js Express Backend** (`simple-server.js`) - Port 5001
   - Primary API server handling Google Maps/Facebook scraping
   - Campaign execution orchestration
   - Database operations via `supabase-db.js`
   - State management via `.app-state.json`

3. **Python FastAPI Backend** (`api/main.py`) - Port 8000 (Optional)
   - Organization management endpoints (`organizations_endpoints.py`)
   - Campaign creation endpoints (`campaigns_endpoints.py`)
   - Coverage analysis endpoints (`coverage_endpoints.py`)
   - Optional - not required for core functionality

### Database Layer

**Supabase PostgreSQL** with these key tables:
- `gmaps_campaigns` - Campaign metadata and status
- `gmaps_businesses` - Business records with contact info
- `gmaps_campaign_coverage` - ZIP code coverage tracking
- `gmaps_facebook_enrichments` - Facebook enrichment results
- `gmaps_linkedin_enrichments` - LinkedIn enrichment results

**BEFORE any database work:**
1. Run `list_tables` to see current schema
2. Check table structure with `execute_sql`
3. Plan changes
4. Apply migration
5. Run `get_advisors`

Database operations abstracted in:
- `supabase-db.js` (Node.js)
- `lead_generation/modules/gmaps_supabase_manager.py` (Python)

### Core Python Modules (`lead_generation/modules/`)

**Campaign Management:**
- `gmaps_campaign_manager.py` - Main orchestrator for campaign execution
- `coverage_analyzer.py` - AI-powered ZIP code analysis using OpenAI
- `gmaps_supabase_manager.py` - Database operations

**Scraping Components:**
- `local_business_scraper.py` - Google Maps scraping via Apify
- `facebook_scraper.py` - Facebook page enrichment via Apify
- `linkedin_scraper.py` - LinkedIn profile enrichment via Apify
- `bouncer_verifier.py` - Email verification

**Supporting:**
- `ai_processor.py` - AI operations for icebreakers and summaries
- `supabase_manager.py` - Legacy Supabase operations

## Development Commands

### Starting the System

**Quick Start (Recommended):**
```bash
./start-dev.sh                 # Frontend + Express backend
./start-dev.sh --with-fastapi  # Include FastAPI (port 8000)
./start-dev.sh -f              # Short form
```

The launcher handles port conflict detection, process management, and auto-restart.

**Manual Start:**
```bash
# 1. Express Backend (Required)
node simple-server.js

# 2. React Frontend (Required)
cd frontend && npm start

# 3. FastAPI Backend (Optional)
cd api && python main.py
```

### Installation

```bash
# Backend dependencies
npm install

# Frontend dependencies
cd frontend && npm install

# Python dependencies (use conda/miniconda environment)
pip install openai supabase requests apify-client fastapi uvicorn
```

### Environment Configuration

Create `.env` in root:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

API keys (OpenAI, Apify) are set through the web interface and stored in `.app-state.json`.

## Campaign Workflow

### 4-Phase Enrichment Process

**Phase 1: Google Maps Scraping**
- AI analyzes location → selects optimal ZIP codes
- Coverage profiles: `budget`, `balanced`, `aggressive`, `custom`
- Scrapes businesses by ZIP code via Apify
- Saves to `gmaps_businesses` table

**Phase 2A: Facebook Enrichment (First Pass)**
- Identifies businesses with Facebook URLs from Phase 1
- Extracts emails from Facebook pages
- Saves to `gmaps_facebook_enrichments`

**Phase 2B: Google Search (Facebook Discovery)**
- For businesses without Facebook URLs
- Searches Google for Facebook pages
- Updates business records with discovered URLs

**Phase 2C: Facebook Enrichment (Second Pass)**
- Enriches newly discovered Facebook pages
- Extracts additional contact information

**Phase 2.5: LinkedIn Enrichment**
- Searches for LinkedIn company profiles
- Extracts contact information from profiles
- Verifies emails using Bouncer API
- Saves to `gmaps_linkedin_enrichments`

### Campaign States

- `draft` - Created but not executed
- `running` - Currently executing
- `paused` - Execution paused
- `completed` - Finished successfully
- `failed` - Execution failed

## Key Implementation Details

### Coverage Analysis (AI-Powered)

The `coverage_analyzer.py` module uses OpenAI to:
1. Detect location type (state/city/neighborhood/ZIP)
2. For states: Multi-step analysis across major/medium/small cities
3. For cities: Single-step ZIP code selection
4. Apply coverage profile limits and scoring

**State-level searches** can return 100-300+ ZIP codes for aggressive profiles. The system uses parallel processing when available (`coverage_analyzer_parallel.py`).

### Email Source Tracking

Emails are tagged by source:
- `google_maps` - Found during initial Google Maps scrape
- `facebook` - Extracted from Facebook page
- `linkedin` - Found from LinkedIn profiles
- `not_found` - No email discovered

### Cost Tracking

The system tracks API costs per service:
- Google Maps: ~$7 per 1000 results
- Facebook: ~$3 per 1000 pages
- LinkedIn: ~$10 per 1000 searches
- Bouncer: ~$5 per 1000 verifications

Costs saved to `gmaps_api_costs` table.

### CSV Export with Pagination

Large campaigns use paginated export (1000 records per page) to handle 10,000+ businesses. See `gmapsExport.getExportData()` in `supabase-db.js`.

## Common Development Patterns

### Adding New Enrichment Sources

**BEFORE coding, use subagents:**

1. **Research** (Perplexity)
   - Find available APIs/scrapers
   - Compare costs and capabilities
   - Check legal/ethical considerations

2. **Design** (main agent)
   - Design database table
   - Plan integration points
   - Create Linear issues for work

3. **Implement** (parallel subagents)
   - Scraper module + tests
   - Database layer + tests
   - Frontend integration + tests
   - Documentation updates

4. **Integration** (main agent)
   - Merge all changes
   - Run full test suite
   - Update Linear issues

### Modifying Coverage Profiles

Edit `coverage_analyzer.py`:
- Update `CoverageProfile` dataclass definitions
- Adjust min/max ZIP limits
- Modify scoring algorithms in `_smart_select_zips()`

**ALWAYS:**
1. Research similar algorithms first (Perplexity)
2. Write tests before changing
3. Test with real locations
4. Document changes in Linear

### Database Schema Changes

**Standard workflow (DO NOT ASK):**

1. Design change
2. Write migration SQL
3. `apply_migration` with SQL
4. `get_advisors` to check security
5. `generate_typescript_types` for frontend
6. Update backend methods
7. Write tests
8. Update Linear with changes

### Frontend Component Changes

**Standard workflow:**

1. Make changes
2. Save file
3. `browser_navigate` to localhost:3000
4. `browser_console_messages` for errors
5. `browser_snapshot` to verify changes
6. Test interactions with `browser_click`/`browser_type`
7. `browser_take_screenshot` for documentation
8. Update Linear

## Debugging Workflows

### Backend API Issue

**Autonomous debugging process:**

1. Check logs in terminal
2. Test endpoint with curl or Postman
3. Add console.log statements
4. Check database with `execute_sql`
5. Verify environment variables
6. Check `.app-state.json`
7. Create Linear issue if bug found
8. Fix and test
9. Update Linear when resolved

### Frontend Issue

**Autonomous debugging process:**

1. `browser_navigate` to page
2. `browser_console_messages` for errors
3. `browser_snapshot` for structure
4. Check Network tab for API errors
5. Verify component props
6. Test user interactions
7. Create Linear issue if bug found
8. Fix and test with Playwright
9. Update Linear when resolved

### Database Issue

**Autonomous debugging process:**

1. `list_tables` to verify schema
2. `execute_sql` to check data
3. `get_advisors` for security issues
4. Check RLS policies
5. Verify indexes
6. Test queries directly
7. Create Linear issue if needed
8. Apply migration to fix
9. Update Linear when resolved

### Python Module Issue

**Autonomous debugging process:**

1. Add logging statements
2. Write test case that reproduces issue
3. Run test in isolation
4. Check dependencies
5. Verify API keys in `.app-state.json`
6. Use Perplexity to research error
7. Create Linear issue
8. Fix and verify with tests
9. Update Linear when resolved

## Port Configuration

- **3000**: React frontend
- **5001**: Express backend (primary)
- **8000**: FastAPI backend (optional)

Ensure these ports are available before starting. The `start-dev.sh` script will detect conflicts.

## Performance Monitoring

**Proactively check these:**

- API response times (should be <500ms)
- Database query performance (use `EXPLAIN ANALYZE`)
- Frontend bundle size (should be <500KB)
- Memory usage (check for leaks)
- Error rates in logs

**If you notice issues:**
1. Create Linear issue immediately
2. Research optimization strategies (Perplexity)
3. Implement fixes
4. Add monitoring/logging
5. Update Linear

## Security Checklist

**ALWAYS verify after schema changes:**

1. Run `get_advisors` on Supabase
2. Check RLS policies exist
3. Verify API authentication
4. Check input validation
5. Review error messages (no sensitive data)
6. Test with invalid inputs

**Create Linear issues for any security concerns.**

## Communication Guidelines

### When to Create Linear Issues

**ALWAYS create issues for:**
- Bugs you discover
- Features you're implementing
- Technical debt you identify
- Security concerns
- Performance problems
- Documentation needs

### When to Add Linear Comments

**Add comments for:**
- Starting work on an issue
- Every hour of progress
- When blocked
- When asking questions
- When completing work

### When to Update Issue Status

**Update status when:**
- Starting work (→ In Progress)
- Blocked (→ Blocked, add comment)
- Complete (→ Done, add summary comment)
- Can't complete (→ Backlog, explain why)

## Final Notes

### The Autonomous Mindset

**Good Claude Code:**
- Uses tools proactively
- Creates Linear issues without asking
- Writes tests automatically
- Spawns subagents for parallel work
- Documents as they go
- Makes decisions based on research
- Reports what was done, not what could be done

**Bad Claude Code:**
- Asks permission for everything
- Waits for instructions
- Skips tests
- Works sequentially on everything
- Forgets to update Linear
- Guesses instead of researching
- Proposes without implementing

### Success Metrics

**You're doing it right if:**
- Linear issues are created and updated constantly
- Tests exist for all new code
- Tools are used liberally
- Work happens in parallel
- Documentation stays current
- Changes are small and frequent
- Bugs are caught early

**You need to improve if:**
- Asking "should I...?" frequently
- No Linear activity
- No tests written
- Only using one tool
- Everything is sequential
- Documentation is stale
- Bugs found in production

---

**Remember: Default to action. Research first, implement with tests, document as you go, and communicate through Linear. You have all the tools you need to work autonomously.**