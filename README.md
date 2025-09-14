# Lead Generation System - Google Maps & Facebook Enrichment

A Node.js-based lead generation system that scrapes business data from Google Maps and enriches it with contact information from Facebook pages.

## Overview

This system performs a 4-phase enrichment process to find business contact information:
1. **Phase 1**: Google Maps scraping - Finds businesses and extracts initial data
2. **Phase 2A**: Facebook enrichment - Extracts emails from Facebook pages (for businesses with Facebook URLs)
3. **Phase 2B**: Google Search - Finds Facebook pages for businesses without Facebook URLs
4. **Phase 2C**: Facebook enrichment - Extracts emails from newly discovered Facebook pages

## Setup

### Prerequisites
- Node.js (v14 or higher)
- Python 3 with miniconda/anaconda
- Supabase account and project

### Required API Keys

Create a `.env` file in the root directory with:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

The system also requires these API keys (set through the web interface after starting):
- **OpenAI API Key** - For ZIP code analysis
- **Apify API Key** - For web scraping (Google Maps & Facebook)

### Installation

1. Install backend dependencies:
```bash
npm install
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

3. Ensure Python environment has required packages:
```bash
pip install openai supabase requests
```

### Database Setup

The system uses Supabase PostgreSQL. Required tables:
- `gmaps_campaigns` - Stores campaign metadata
- `gmaps_businesses` - Stores business data
- `gmaps_campaign_coverage` - Stores ZIP code coverage
- `gmaps_facebook_enrichments` - Stores Facebook enrichment results

## Running the Application

The system consists of three parts that need to be running:

### 1. Python API Backend (FastAPI)
```bash
cd api
python main.py
```
Runs on `http://localhost:8000`
Handles organization management, campaign operations, and AI processing.

### 2. Node.js Backend API Server
```bash
node simple-server.js
```
Runs on `http://localhost:5001`
Handles Google Maps scraping, Facebook enrichment, and campaign execution.

### 3. React Frontend
```bash
cd frontend
npm start
```
Runs on `http://localhost:3000`

### Web Interface

Access the React frontend at `http://localhost:3000` to:
- Create and manage campaigns (Google Maps Campaigns section)
- Set API keys
- Monitor campaign progress
- Export results to CSV

The React app automatically connects to the backend API at localhost:5001.

## Core Files

### Python API Backend (FastAPI)
- `api/main.py` - FastAPI server for organization and campaign management
- `api/organizations_endpoints.py` - Organization management endpoints
- `api/campaigns_endpoints.py` - Campaign creation and management
- `api/coverage_endpoints.py` - ZIP code coverage analysis

### Node.js Backend
- `simple-server.js` - Express server handling Google Maps/Facebook scraping and campaign execution
- `supabase-db.js` - Database operations for Supabase

### Python Modules
- `lead_generation/modules/coverage_analyzer.py` - ZIP code analysis using OpenAI
- `lead_generation/modules/apify_client.py` - Apify API integration
- `lead_generation/modules/ai_processor.py` - AI processing for icebreakers and analysis
- `lead_generation/modules/supabase_manager.py` - Supabase database management

### Frontend (React App)
- `frontend/src/components/GoogleMapsCampaigns.tsx` - Main campaign management interface
- `frontend/.env` - Contains API URL configuration (points to localhost:5001)

## API Endpoints

### Campaign Management
- `GET /api/gmaps/campaigns` - List all campaigns
- `POST /api/gmaps/campaigns/create` - Create new campaign
- `POST /api/gmaps/campaigns/:id/execute` - Execute a campaign
- `GET /api/gmaps/campaigns/:id/export` - Export results to CSV

### Settings
- `GET /api-keys` - Get API key status
- `POST /api-keys` - Set API keys

## Campaign Workflow

1. **Create Campaign**
   - Specify location (city, state, or ZIP)
   - Add keywords (e.g., "dentist", "salon")
   - Choose coverage profile (budget/balanced/aggressive)

2. **Campaign Execution**
   - Analyzes location to determine ZIP codes
   - Scrapes Google Maps for businesses
   - Enriches with Facebook data in multiple phases
   - Saves all data to Supabase

3. **Export Results**
   - Download CSV with all business data
   - Includes email source tracking (Google Maps/Facebook/Not Found)

## Email Source Tracking

The system tracks where each email was found:
- **Google Maps** - Found during initial scraping
- **Facebook** - Extracted from Facebook page
- **Not Found** - No email discovered

## Important Notes

- ZIP code analysis requires OpenAI API quota
- Each campaign execution uses Apify credits
- Facebook enrichment may take several minutes for large campaigns
- All data is stored in Supabase for persistence

## Troubleshooting

### OpenAI Quota Issues
If you see "OpenAI API quota exceeded", the system will block campaign creation. Wait for quota reset or upgrade your OpenAI plan.

### Campaign Stuck
If a campaign appears stuck, check the server console for errors. The system includes error handling but some edge cases may cause hanging.

### Missing Emails
All discovered emails are saved to the database and included in CSV exports. Check the "Email Source" column to see where emails were found.

## Testing

Test files for specific functionality:
- `test_yorktown_campaign.js` - Test full campaign flow
- `test_simple_state.py` - Test ZIP code analysis
- `test_coverage_direct.py` - Test coverage analysis directly

## Environment Variables

Required in `.env`:
```
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_KEY=[anon-key]
```

API keys are stored in browser localStorage and passed to server per request.