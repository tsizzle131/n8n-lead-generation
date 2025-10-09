# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## System Overview

This is a multi-phase lead generation system that scrapes business data from Google Maps and enriches it with contact information from Facebook, LinkedIn, and email verification. The system uses AI (OpenAI) for intelligent ZIP code analysis and coverage planning.

## Available MCP Servers

Claude Code has access to several Model Context Protocol (MCP) servers that provide specialized capabilities. Use these tools when appropriate:

### Context7 - Library Documentation
**When to use:** Looking up documentation for any npm package, Python library, or framework.

```
Tools: mcp__context7__resolve-library-id, mcp__context7__get-library-docs
```

**Examples:**
- "How do I use React hooks?"
- "Show me Next.js routing documentation"
- "What's the latest Supabase client API?"

Always call `resolve-library-id` first to get the Context7 ID, then use `get-library-docs` with that ID.

### Playwright - Browser Automation
**When to use:** Testing web UIs, debugging frontend issues, or automating browser interactions.

```
Tools: browser_navigate, browser_snapshot, browser_click, browser_type,
       browser_evaluate, browser_take_screenshot, browser_console_messages
```

**Examples:**
- "Navigate to the frontend and check if the campaign form loads"
- "Take a screenshot of the dashboard"
- "Click the 'Create Campaign' button and see what happens"

**Common workflow:**
1. `browser_navigate` - Go to URL
2. `browser_snapshot` - Get page structure (better than screenshot for actions)
3. `browser_click` / `browser_type` - Interact with elements
4. `browser_console_messages` - Check for JavaScript errors

### Supabase - Database Operations
**When to use:** Querying the database, managing tables, running migrations, or checking project status.

```
Tools: list_tables, execute_sql, apply_migration, get_advisors,
       list_projects, get_project, generate_typescript_types
```

**Examples:**
- "Show me all tables in the database"
- "Run a migration to add a new column"
- "Execute SQL to find all campaigns from last week"
- "Check for security advisories on the database"

**Important:**
- Use `apply_migration` for DDL operations (CREATE, ALTER, DROP)
- Use `execute_sql` for queries (SELECT) and data changes (INSERT, UPDATE)
- Always run `get_advisors` after schema changes to check for missing RLS policies

### Perplexity - Web Search & Research
**When to use:** Need current information, compare technologies, or research best practices.

```
Tools: mcp__perplexity__search, mcp__perplexity__reason, mcp__perplexity__deep_research
```

**When to use each:**

**`search`** - Quick lookups and simple questions
- "What's the latest version of Node.js?"
- "Current pricing for Apify API"
- "OpenAI API rate limits"

**`reason`** - Complex comparisons and multi-step analysis
- "Compare Puppeteer vs Playwright for web scraping"
- "Pros and cons of using Supabase vs Firebase"
- "Best architecture for distributed scraping"

**`deep_research`** - Comprehensive topic exploration (10,000+ word reports)
- "Best practices for web scraping at scale"
- "Complete guide to CAPTCHA handling strategies"
- "Comprehensive analysis of proxy rotation techniques"

### Linear - Project Management
**When to use:** Creating issues, tracking tasks, managing projects, or checking team status.

```
Tools: list_issues, create_issue, update_issue, get_issue,
       list_projects, create_project, list_comments
```

**Examples:**
- "Show me my open issues"
- "Create an issue for adding rate limiting to the scraper"
- "List all issues in the current sprint"
- "Add a comment to issue ABC-123"

**Filters available:**
- By assignee: `assignee: "me"` or user ID/name/email
- By status: `state: "In Progress"`
- By team: `team: "Engineering"`
- By label: `label: "bug"`
- By date: `createdAt: "-P7D"` (last 7 days)

**IMPORTANT - Use Linear Proactively:**
- **Check Linear when starting work** - Always check for assigned issues before asking what to work on
- **Create bug tickets when you find issues** - Don't just report bugs, create Linear issues with details
- **Update issue status as you progress** - Move issues to "In Progress" when starting, "Done" when complete
- **Add comments with updates** - Document progress, blockers, or findings directly in Linear
- **Never ask permission** - Just use Linear tools proactively, don't ask first

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

Database operations abstracted in `supabase-db.js` for Node.js and `lead_generation/modules/gmaps_supabase_manager.py` for Python.

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

## Testing

Test files demonstrate specific functionality:
- `test_yorktown_campaign.js` - Full campaign flow
- `test_simple_state.py` - ZIP code analysis
- `test_coverage_direct.py` - Coverage analysis
- `test_email_enrichment.js` - Facebook enrichment

Run tests from project root:
```bash
node test_yorktown_campaign.js
python test_simple_state.py
```

## Important Notes

### OpenAI Quota Management

ZIP code analysis requires OpenAI API access. The system will block campaign creation if quota is exceeded. Monitor usage in OpenAI dashboard.

### Apify Credits

Each campaign execution consumes Apify credits:
- Google Maps scraping (primary cost)
- Facebook page scraping
- LinkedIn profile scraping

Budget accordingly based on coverage profile.

### State File Persistence

Application state (API keys, settings, prompts) stored in `.app-state.json`. This file is shared between Express and FastAPI backends.

### Database Field Mapping

When saving businesses from scrapers:
- `facebookUrl` / `facebook` → `facebook_url` in database
- `linkedInUrl` / `linkedin` → `linkedin_url` in database
- `placeId` / `place_id` → `place_id` (unique identifier)

## Working with Campaigns

### Creating a Campaign (via API)

```javascript
POST /api/gmaps/campaigns/create
{
  "name": "Campaign Name",
  "location": "Austin, TX",  // or "Texas" or "90210"
  "keywords": ["restaurants", "cafes"],
  "coverage_profile": "balanced",  // budget|balanced|aggressive|custom
  "organization_id": "uuid"
}
```

### Executing a Campaign

```javascript
POST /api/gmaps/campaigns/:id/execute
```

Execution is synchronous and can take 15-45 minutes for large campaigns.

### Exporting Results

```javascript
GET /api/gmaps/campaigns/:id/export
```

Returns CSV with all businesses and enriched contact data.

## Common Development Patterns

### Adding New Enrichment Sources

1. Create scraper module in `lead_generation/modules/`
2. Add enrichment method to `GmapsCampaignManager`
3. Create database table for enrichment results
4. Update `gmaps_supabase_manager.py` with save methods
5. Add cost tracking in campaign execution

### Modifying Coverage Profiles

Edit `coverage_analyzer.py`:
- Update `CoverageProfile` dataclass definitions
- Adjust min/max ZIP limits
- Modify scoring algorithms in `_smart_select_zips()`

### Database Schema Changes

Run migrations via Supabase dashboard or `run_migration.py`. Update corresponding methods in:
- `supabase-db.js` (Node.js)
- `gmaps_supabase_manager.py` (Python)

## Port Configuration

- **3000**: React frontend
- **5001**: Express backend (primary)
- **8000**: FastAPI backend (optional)

Ensure these ports are available before starting. The `start-dev.sh` script will detect conflicts.
