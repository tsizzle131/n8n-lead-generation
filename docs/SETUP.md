# Setup Guide

## Installation

### Backend Dependencies

```bash
npm install
```

### Frontend Dependencies

```bash
cd frontend && npm install
```

### Python Dependencies

**Recommended: Use conda/miniconda environment**

```bash
# Create conda environment (recommended)
conda create -n lead-gen python=3.10
conda activate lead-gen

# Install dependencies
pip install openai supabase requests apify-client fastapi uvicorn
```

## Environment Configuration

### 1. Create `.env` in Project Root

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

**Getting Supabase Credentials:**
1. Go to [Supabase Dashboard](https://app.supabase.io)
2. Select your project
3. Go to Settings → API
4. Copy the Project URL and anon/public key

### 2. Configure API Keys via Web Interface

Start the application and navigate to Settings:

1. **OpenAI API Key** (Required)
   - Get from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Used for ZIP code analysis and icebreaker generation

2. **Apify API Key** (Required for scraping)
   - Get from [Apify Integrations](https://console.apify.com/account/integrations)
   - Used for Google Maps, Facebook, and LinkedIn scraping

API keys are stored in `.app-state.json` automatically.

## Starting the System

### Quick Start (Recommended)

```bash
# Frontend + Express backend
./start-dev.sh

# Include FastAPI (port 8000) - Optional
./start-dev.sh --with-fastapi
./start-dev.sh -f  # Short form
```

The launcher handles:
- Port conflict detection
- Process management
- Auto-restart on crashes
- Colored output for easy debugging

### Manual Start

**1. Express Backend (Required)**
```bash
node simple-server.js
```
Server will start on port 5001.

**2. React Frontend (Required)**
```bash
cd frontend && npm start
```
Frontend will open at http://localhost:3000

**3. FastAPI Backend (Optional)**
```bash
cd api && python main.py
```
API docs available at http://localhost:8000/docs

## Desktop Launchers (macOS/Linux)

Desktop shortcuts available in root directory:
- `Lead-Gen-Frontend.command` - Opens frontend in browser
- `Lead-Gen-Dev-Server.command` - Starts full development environment

Make executable:
```bash
chmod +x *.command
```

## Verification

### 1. Test Backend Connection

Navigate to http://localhost:5001/health

Expected response:
```json
{"status": "healthy", "database": "connected"}
```

### 2. Test Frontend

Navigate to http://localhost:3000

You should see the Lead Generation AI Assistant interface with tabs:
- Apollo Campaigns
- Local Business (Google Maps)
- Organizations
- Settings

### 3. Test Database Connection

1. Go to Settings tab
2. Scroll to Database section
3. Click "Test Connection"

Expected: Green success message "Database connection successful!"

### 4. Test API Keys

1. Go to Settings tab
2. Scroll to API Keys section
3. Click "Test OpenAI Connection"

Expected: Green success message "OpenAI connection successful!"

## Troubleshooting

### Port Already in Use

If you see "Port 3000 already in use":
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

The `start-dev.sh` script will automatically detect and offer to kill conflicting processes.

### Module Import Errors (Python)

If you see `ModuleNotFoundError`:
```bash
# Ensure you're in the project root
cd /path/to/project

# Check Python path
python3 -c "import sys; print(sys.path)"

# Reinstall dependencies
pip install --upgrade openai supabase requests apify-client
```

### Database Connection Errors

If database tests fail:
1. Verify Supabase URL and key in `.env`
2. Check Supabase project is active (not paused)
3. Verify network connection
4. Check Supabase dashboard for service status

### Apify Integration Errors

If campaigns fail with "Apify actor not found":
1. Verify Apify API key in Settings
2. Check Apify account has available credits
3. Verify actor IDs are correct (check `simple-server.js`)

Current actor IDs:
- Google Maps: `compass/crawler-google-places`
- Facebook: `apify/facebook-pages-scraper`
- LinkedIn: `various actors` (configurable)

## Next Steps

After successful setup:
1. Create an organization in the Organizations tab
2. Configure your product details (automatic prompt after org creation)
3. Add API keys in Settings tab
4. Create your first campaign in Local Business tab
5. Execute campaign and download results

## Advanced Configuration

### AI Model Selection

In Settings → AI Configuration:
- **Summary Model**: Recommended `gpt-4o-mini` (cost-effective)
- **Icebreaker Model**: Recommended `gpt-4o` (higher quality)
- **Temperature**: 0.5 (balanced creativity)
- **Delay Between Calls**: 45s for production, 5s for testing

### Coverage Profiles

When creating campaigns:
- **Budget**: 5-15 ZIP codes (lower cost)
- **Balanced**: 10-30 ZIP codes (recommended)
- **Aggressive**: 20-50+ ZIP codes (comprehensive coverage)
- **Custom**: Specify exact ZIP code count

### Cost Management

Monitor costs in campaign details:
- Google Maps: ~$7 per 1000 results
- Facebook: ~$3 per 1000 pages
- LinkedIn: ~$10 per 1000 searches
- OpenAI: Varies by model and usage

Set monthly budgets in Organization settings to prevent overspending.
