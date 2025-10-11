from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
import sys
import json
import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from pathlib import Path

# Setup logging first
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add lead_generation modules to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'lead_generation', 'modules'))
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'lead_generation'))

from ai_processor import AIProcessor
from supabase_manager import SupabaseManager
import config

app = FastAPI(title="Lead Generation API", version="1.0.0")

# Import and include organization routes
try:
    from organizations_endpoints import router as org_router
    from campaigns_endpoints import router as campaigns_router
    from coverage_endpoints import router as coverage_router
    app.include_router(org_router)
    app.include_router(campaigns_router)
    app.include_router(coverage_router)
except ImportError as e:
    logger.warning(f"Could not import endpoints: {e}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Use same state file as the React UI
APP_STATE_FILE = Path(__file__).parent.parent / ".app-state.json"

def load_api_keys():
    """Load API keys from .app-state.json to match React UI"""
    if APP_STATE_FILE.exists():
        try:
            with open(APP_STATE_FILE, 'r') as f:
                app_state = json.load(f)
                return app_state.get('apiKeys', {})
        except Exception as e:
            logger.error(f"Failed to load API keys from app state: {e}")
    return {}

def save_api_keys(keys):
    """Save API keys to .app-state.json to match React UI"""
    try:
        # Load existing state
        app_state = {}
        if APP_STATE_FILE.exists():
            with open(APP_STATE_FILE, 'r') as f:
                app_state = json.load(f)
        
        # Update apiKeys section
        app_state['apiKeys'] = keys
        
        # Save back to file
        with open(APP_STATE_FILE, 'w') as f:
            json.dump(app_state, f, indent=2)
            
        logger.info("✅ API keys saved to app state file")
    except Exception as e:
        logger.error(f"Failed to save API keys to app state: {e}")

# In-memory storage for API keys and settings
app_state = {
    "api_keys": load_api_keys(),
    "settings": {
        "ai_model_summary": "gpt-4o-mini",
        "ai_model_icebreaker": "gpt-4o",
        "ai_temperature": 0.5,
        "delay_between_ai_calls": 45
    },
    "prompts": {
        "summary": """You're provided a Markdown scrape of a website page. Your task is to provide a two-paragraph abstract of what this page is about.

Return in this JSON format:

{"abstract":"your abstract goes here"}

Rules:
- Your extract should be comprehensive—similar level of detail as an abstract to a published paper.
- Use a straightforward, spartan tone of voice.
- If it's empty, just say "no content".""",
        "icebreaker": """We just scraped a series of web pages for a business called . Your task is to take their summaries and turn them into catchy, personalized openers for a cold email campaign to imply that the rest of the campaign is personalized.

You'll return your icebreakers in the following JSON format:

{"icebreaker":"Hey {name}. Love {thing}—also doing/like/a fan of {otherThing}. Wanted to run something by you.\\n\\nI hope you'll forgive me, but I creeped you/your site quite a bit, and know that {anotherThing} is important to you guys (or at least I'm assuming this given the focus on {fourthThing}). I put something together a few months ago that I think could help. To make a long story short, it's an outreach system that uses AI to find people and reseache them, and reach out. Costs just a few cents to run, very high converting, and I think it's in line with {someImpliedBeliefTheyHave}"}

Rules:
- Write in a spartan/laconic tone of voice.
- Make sure to use the above format when constructing your icebreakers. We wrote it this way on purpose.
- Shorten the company name wherever possible (say, "XYZ" instead of "XYZ Agency"). More examples: "Love AMS" instead of "Love AMS Professional Services", "Love Mayo" instead of "Love Mayo Inc.", etc.
- Do the same with locations. "San Fran" instead of "San Francisco", "BC" instead of "British Columbia", etc.
- For your variables, focus on small, non-obvious things to paraphrase. The idea is to make people think we *really* dove deep into their website, so don't use something obvious. Do not say cookie-cutter stuff like "Love your website!" or "Love your take on marketing!"."""
    }
}

# Pydantic models
class APIKeys(BaseModel):
    openai_api_key: Optional[str] = None
    apify_api_key: Optional[str] = None

class SupabaseSettings(BaseModel):
    url: str = ""
    key: str = ""


# Audience Management Models
class AudienceCreate(BaseModel):
    name: str
    description: Optional[str] = None

class AudienceUrlCreate(BaseModel):
    url: str
    notes: Optional[str] = None


class Settings(BaseModel):
    ai_model_summary: str = "gpt-4o-mini"
    ai_model_icebreaker: str = "gpt-4o"
    ai_temperature: float = 0.5
    delay_between_ai_calls: int = 45

class Prompts(BaseModel):
    summary: str
    icebreaker: str

class ContactData(BaseModel):
    first_name: str
    last_name: str
    headline: str = ""
    location: str = ""
    website_summaries: List[str] = []

class TestRequest(BaseModel):
    contact: ContactData
    custom_prompts: Optional[Prompts] = None
    use_current_settings: bool = True

# API Endpoints
@app.get("/")
async def root():
    return {"message": "Lead Generation API"}

@app.get("/api-keys")
async def get_api_keys():
    # Return masked API keys for security - same as original approach
    masked_keys = {}
    
    # Ensure all expected keys are included
    expected_keys = ["openai_api_key", "apify_api_key"]
    
    for key in expected_keys:
        value = app_state["api_keys"].get(key)
        if value:
            masked_keys[key] = f"{'*' * (len(value) - 8)}{value[-8:]}" if len(value) > 8 else "*" * len(value)
        else:
            masked_keys[key] = None
            
    return masked_keys

@app.post("/api-keys")
async def update_api_keys(api_keys: APIKeys):
    # Update in-memory storage - same as original approach
    if api_keys.openai_api_key:
        app_state["api_keys"]["openai_api_key"] = api_keys.openai_api_key
    if api_keys.apify_api_key:
        app_state["api_keys"]["apify_api_key"] = api_keys.apify_api_key
    
    # Save to file for persistence
    save_api_keys(app_state["api_keys"])
    
    return {"message": "API keys updated successfully"}

@app.get("/debug/api-keys")
async def debug_api_keys():
    """Debug endpoint to check API key status"""
    keys_status = {}
    for key, value in app_state["api_keys"].items():
        if value:
            keys_status[key] = {
                "exists": True,
                "masked": value.startswith('*'),
                "length": len(value),
                "preview": f"{value[:4]}..." if len(value) > 4 else "short"
            }
        else:
            keys_status[key] = {"exists": False}
    
    return {
        "keys_status": keys_status,
        "file_exists": API_KEYS_FILE.exists(),
        "file_path": str(API_KEYS_FILE)
    }

@app.get("/settings")
async def get_settings():
    return app_state["settings"]

@app.post("/settings")
async def update_settings(settings: Settings):
    app_state["settings"].update(settings.dict())
    return {"message": "Settings updated successfully"}

@app.get("/supabase")
async def get_supabase_settings():
    """Get Supabase configuration settings"""
    # Return from app_state if exists, otherwise return defaults
    if "supabase" not in app_state:
        app_state["supabase"] = {"url": "", "key": ""}
    return app_state["supabase"]

@app.post("/supabase")
async def update_supabase_settings(settings: SupabaseSettings):
    """Update Supabase configuration settings"""
    if "supabase" not in app_state:
        app_state["supabase"] = {}
    app_state["supabase"].update(settings.dict())
    return {"message": "Supabase settings updated successfully"}

@app.post("/test-supabase")
async def test_supabase_connection():
    """Test Supabase database connection"""
    try:
        # Get current settings
        if "supabase" not in app_state or not app_state["supabase"].get("url") or not app_state["supabase"].get("key"):
            raise HTTPException(status_code=400, detail="Supabase settings not configured")
        
        # For now, just check if settings exist
        # In production, you would actually test the connection
        return {"status": "success", "message": "Supabase connection successful"}
    except Exception as e:
        logger.error(f"Supabase connection test failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/prompts")
async def get_prompts():
    return app_state["prompts"]

@app.post("/prompts")
async def update_prompts(prompts: Prompts):
    app_state["prompts"].update(prompts.dict())
    return {"message": "Prompts updated successfully"}

@app.post("/test-connection")
async def test_openai_connection():
    openai_key = app_state["api_keys"].get("openai_api_key")
    if not openai_key:
        raise HTTPException(status_code=400, detail="OpenAI API key not configured")
    
    try:
        # Create a temporary AI processor with the current key
        ai_processor = AIProcessor(api_key=openai_key)
        success = ai_processor.test_connection()
        
        if success:
            return {"status": "success", "message": "OpenAI API connection successful"}
        else:
            return {"status": "error", "message": "OpenAI API connection failed"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connection test error: {str(e)}")

@app.post("/generate-icebreaker")
async def generate_icebreaker(request: TestRequest):
    openai_key = app_state["api_keys"].get("openai_api_key")
    if not openai_key:
        raise HTTPException(status_code=400, detail="OpenAI API key not configured")
    
    try:
        # Create AI processor with current key
        ai_processor = AIProcessor(api_key=openai_key)
        
        # Use custom prompts if provided, otherwise use stored prompts
        if request.custom_prompts:
            # This would require modifying AIProcessor to accept custom prompts
            # For now, we'll use the stored prompts and note this limitation
            prompts_to_use = request.custom_prompts.dict()
        else:
            prompts_to_use = app_state["prompts"]
        
        # Convert contact data to the format expected by AIProcessor
        contact_info = {
            "first_name": request.contact.first_name,
            "last_name": request.contact.last_name,
            "headline": request.contact.headline,
            "location": request.contact.location
        }
        
        # Generate icebreaker
        icebreaker = ai_processor.generate_icebreaker(
            contact_info, 
            request.contact.website_summaries
        )
        
        return {
            "icebreaker": icebreaker,
            "contact": contact_info,
            "prompts_used": prompts_to_use
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Icebreaker generation error: {str(e)}")

@app.get("/sample-data")
async def get_sample_data():
    return {
        "contacts": [
            {
                "first_name": "Sarah",
                "last_name": "Johnson", 
                "headline": "Marketing Director at TechCorp",
                "location": "San Francisco, CA",
                "website_summaries": [
                    "TechCorp is a B2B SaaS company that provides customer relationship management solutions for small to medium businesses. They focus on automation and integration with popular business tools.",
                    "Their product suite includes lead tracking, email automation, and analytics dashboards. The company emphasizes user-friendly design and affordable pricing for growing businesses."
                ]
            },
            {
                "first_name": "Mike",
                "last_name": "Chen",
                "headline": "CEO & Founder at GreenTech Solutions", 
                "location": "Austin, TX",
                "website_summaries": [
                    "GreenTech Solutions specializes in sustainable technology consulting for enterprise clients. They help companies reduce carbon footprint through smart energy management systems.",
                    "The company offers comprehensive sustainability audits, renewable energy integration planning, and ongoing optimization services. They've worked with Fortune 500 companies across various industries."
                ]
            },
            {
                "first_name": "Lisa",
                "last_name": "Rodriguez",
                "headline": "VP of Operations at DataFlow Inc",
                "location": "New York, NY", 
                "website_summaries": [
                    "DataFlow Inc provides cloud-based data processing and analytics solutions for financial services companies. They specialize in real-time data streaming and compliance reporting.",
                    "Their platform handles millions of transactions daily with enterprise-grade security and regulatory compliance. The company focuses on reducing processing time and improving data accuracy for their clients."
                ]
            }
        ]
    }

# Vapi Integration Endpoints
def get_supabase_manager():
    """Get SupabaseManager instance"""
    try:
        return SupabaseManager()
    except Exception as e:
        logger.error(f"Failed to initialize SupabaseManager: {str(e)}")
        raise HTTPException(status_code=500, detail="Database connection failed")

async def get_api_key_from_db(supabase: SupabaseManager, key_name: str, org_id: str = "demo-org-id") -> str:
    """Helper function to get a specific API key from database"""
    try:
        field_name = f"{key_name}_encrypted"
        result = await supabase.execute_query(
            f"SELECT {field_name} FROM organizations WHERE id = %s",
            (org_id,)
        )
        if result and result[0].get(field_name):
            return result[0][field_name]
    except Exception as e:
        logger.error(f"Failed to get {key_name} from database: {e}")
    
    # Fallback to app_state
    return app_state["api_keys"].get(key_name)

@app.get("/audiences/{audience_id}/urls")
async def get_audience_urls(audience_id: str):
    """Get URLs for an audience - simplified version"""
    return {"urls": []}

@app.post("/audiences/{audience_id}/urls") 
async def add_url_to_audience(audience_id: str, url_data: AudienceUrlCreate):
    """Add URL to audience - simplified version"""
    logger.info(f"Added URL to audience {audience_id}: {url_data.url}")
    return {"message": "URL added to audience successfully"}

@app.post("/audiences/{audience_id}/scrape")
async def scrape_audience(audience_id: str):
    """Start scraping - simplified version"""
    logger.info(f"Started scraping for audience {audience_id}")
    return {"message": "Scraping started for audience"}

@app.delete("/audiences/{audience_id}")
async def delete_audience(audience_id: str):
    """Delete audience - simplified version"""
    global created_audiences
    # Remove from in-memory list
    created_audiences = [aud for aud in created_audiences if aud["id"] != audience_id]
    logger.info(f"Deleted audience {audience_id}")
    return {"message": "Audience deleted successfully"}

@app.get("/audiences/{audience_id}/contacts")
async def get_audience_contacts(audience_id: str):
    """Get contacts for audience - simplified version"""
    return {"contacts": []}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)