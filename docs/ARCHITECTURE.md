# System Architecture

## Three-Tier Architecture

### 1. React Frontend (`frontend/`) - Port 3000
- Main UI component: `GoogleMapsCampaigns.tsx` for campaign management
- Communicates with Express backend on port 5001
- Configuration in `frontend/.env`

**Component Organization:**
```
frontend/src/components/
├── campaigns/
│   ├── Campaigns.tsx (Apollo campaigns)
│   └── GoogleMapsCampaigns.tsx (Local Business) - PRIMARY INTERFACE
├── settings/
│   ├── Settings.tsx - Configuration management
│   ├── ApiKeyManager.tsx - API key management
│   └── ProductConfiguration.tsx - Product details for messaging
├── organizations/
│   ├── Organizations.tsx - Multi-org management
│   └── OrganizationSelector.tsx - Org switching
└── archived/
    └── [Legacy components not currently in use]
```

### 2. Node.js Express Backend (`simple-server.js`) - Port 5001
- Primary API server handling Google Maps/Facebook scraping
- Campaign execution orchestration
- Database operations via `supabase-db.js`
- State management via `.app-state.json`

**Key Endpoints:**
- `/api/gmaps/campaigns/*` - Campaign CRUD operations
- `/api/gmaps/campaigns/:id/execute` - Campaign execution
- `/api/gmaps/campaigns/:id/export` - CSV export
- `/api/organizations/*` - Organization management
- `/api/settings/*` - API keys and configuration

### 3. Python FastAPI Backend (`api/main.py`) - Port 8000 (Optional)
- Organization management endpoints (`organizations_endpoints.py`)
- Campaign creation endpoints (`campaigns_endpoints.py`)
- Coverage analysis endpoints (`coverage_endpoints.py`)
- **Note:** Optional - not required for core functionality

### Database Layer

**Supabase PostgreSQL** with these key tables:

#### Campaign Management
- `gmaps_campaigns` - Campaign metadata and status
- `gmaps_campaign_coverage` - ZIP code coverage tracking
- `gmaps_api_costs` - Cost tracking per service

#### Business Data
- `gmaps_businesses` - Business records with contact info
- `gmaps_facebook_enrichments` - Facebook enrichment results
- `gmaps_linkedin_enrichments` - LinkedIn enrichment results

#### Organization Data
- `organizations` - Multi-tenant organization management
- `organization_users` - User-organization relationships

**Database Abstraction:**
- Node.js: `supabase-db.js`
- Python: `lead_generation/modules/gmaps_supabase_manager.py`

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

## Data Flow

### Campaign Creation Flow
```
1. User creates campaign in React Frontend (GoogleMapsCampaigns.tsx)
   ↓
2. POST /api/gmaps/campaigns/create (Express Backend)
   ↓
3. Coverage analysis if location is state/city (OpenAI + coverage_analyzer.py)
   ↓
4. Campaign record created in gmaps_campaigns table
   ↓
5. Coverage records created in gmaps_campaign_coverage table
```

### Campaign Execution Flow
```
1. User clicks "Execute" in Frontend
   ↓
2. POST /api/gmaps/campaigns/:id/execute (Express Backend)
   ↓
3. Backend spawns Python process (lead_generation/main.py)
   ↓
4. Phase 1: Google Maps scraping → gmaps_businesses table
   ↓
5. Phase 2A: Facebook enrichment (first pass) → gmaps_facebook_enrichments
   ↓
6. Phase 2B: Google Search for Facebook pages (discovery)
   ↓
7. Phase 2C: Facebook enrichment (second pass)
   ↓
8. Phase 2.5: LinkedIn enrichment → gmaps_linkedin_enrichments
   ↓
9. Campaign status updated to 'completed'
```

### Data Export Flow
```
1. User clicks "Export" in Frontend
   ↓
2. GET /api/gmaps/campaigns/:id/export (Express Backend)
   ↓
3. Paginated query of gmaps_businesses (1000 records per page)
   ↓
4. Join with enrichment tables (facebook, linkedin)
   ↓
5. CSV generated and returned to user
```

## Port Configuration

- **3000**: React frontend
- **5001**: Express backend (PRIMARY)
- **8000**: FastAPI backend (OPTIONAL)

Ensure these ports are available before starting. The `start-dev.sh` script will detect conflicts.

## State Management

- **Frontend State**: React component state + API service layer
- **Backend State**: `.app-state.json` (API keys, settings, prompts)
- **Database State**: Supabase PostgreSQL (all persistent data)

## Security Model

- **API Keys**: Stored in `.app-state.json` (server-side only)
- **Environment Config**: `.env` (Supabase credentials)
- **Organization Isolation**: All database queries filtered by `organization_id`
- **No Authentication**: Currently single-user system (add auth for production)
