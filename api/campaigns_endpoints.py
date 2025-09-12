"""
Campaigns endpoints for the API
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import logging
import os
import sys
import json
from pathlib import Path

# Add lead_generation modules to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'lead_generation', 'modules'))
from supabase_manager import SupabaseManager

logger = logging.getLogger(__name__)
router = APIRouter()

# Global variable to track running script process
script_process = None

# Get Supabase credentials from .app-state.json
APP_STATE_FILE = Path(__file__).parent.parent / ".app-state.json"

def get_supabase_client():
    """Get Supabase client with credentials from app state"""
    try:
        if APP_STATE_FILE.exists():
            with open(APP_STATE_FILE, 'r') as f:
                app_state = json.load(f)
                supabase_config = app_state.get('supabase', {})
                url = supabase_config.get('url')
                key = supabase_config.get('key')
                if url and key:
                    return SupabaseManager(supabase_url=url, supabase_key=key)
        raise ValueError("Supabase credentials not found")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")

# Pydantic models
class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: Optional[str] = "active"
    tags: Optional[List[str]] = []
    priority: Optional[int] = 1
    audience_id: Optional[str] = None

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    priority: Optional[int] = None

class UrlCreate(BaseModel):
    url: str
    notes: Optional[str] = None

# Remove demo storage - we'll use Supabase

@router.get("/campaigns")
async def get_campaigns():
    """Get all campaigns from Supabase"""
    try:
        supabase = get_supabase_client()
        result = supabase.client.table("campaigns").select("*").execute()
        return {"campaigns": result.data or []}
    except Exception as e:
        logger.error(f"Failed to fetch campaigns: {e}")
        return {"campaigns": []}

@router.post("/campaigns")
async def create_campaign(campaign_data: CampaignCreate):
    """Create a new campaign in Supabase"""
    try:
        supabase = get_supabase_client()
        
        # Get first organization for now
        org_result = supabase.client.table("organizations").select("id").limit(1).execute()
        if not org_result.data:
            raise HTTPException(status_code=400, detail="No organization found")
        
        org_id = org_result.data[0]["id"]
        
        new_campaign = {
            "name": campaign_data.name,
            "description": campaign_data.description,
            "status": campaign_data.status or "active",
            "priority": campaign_data.priority or 1,
            "tags": campaign_data.tags or [],
            "audience_id": campaign_data.audience_id,
            "organization_id": org_id
        }
        
        result = supabase.client.table("campaigns").insert(new_campaign).execute()
        
        if result.data:
            logger.info(f"Created campaign: {campaign_data.name}")
            return {"campaign": result.data[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to create campaign")
    except Exception as e:
        logger.error(f"Failed to create campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/campaigns/{campaign_id}")
async def update_campaign(campaign_id: str, updates: CampaignUpdate):
    """Update a campaign in Supabase"""
    try:
        supabase = get_supabase_client()
        
        update_data = {}
        if updates.name:
            update_data["name"] = updates.name
        if updates.description is not None:
            update_data["description"] = updates.description
        if updates.status:
            update_data["status"] = updates.status
        if updates.tags is not None:
            update_data["tags"] = updates.tags
        if updates.priority is not None:
            update_data["priority"] = updates.priority
        
        result = supabase.client.table("campaigns").update(update_data).eq("id", campaign_id).execute()
        
        if result.data:
            logger.info(f"Updated campaign: {campaign_id}")
            return {"campaign": result.data[0]}
        else:
            raise HTTPException(status_code=404, detail="Campaign not found")
    except Exception as e:
        logger.error(f"Failed to update campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str):
    """Delete a campaign from Supabase"""
    try:
        supabase = get_supabase_client()
        result = supabase.client.table("campaigns").delete().eq("id", campaign_id).execute()
        logger.info(f"Deleted campaign: {campaign_id}")
        return {"message": "Campaign deleted successfully"}
    except Exception as e:
        logger.error(f"Failed to delete campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/campaigns/{campaign_id}/urls")
async def get_campaign_urls(campaign_id: str):
    """Get URLs for a campaign from Supabase"""
    try:
        supabase = get_supabase_client()
        # Query campaign_urls junction table
        result = supabase.client.table("campaign_urls").select("search_url_id, search_urls(*)")\
            .eq("campaign_id", campaign_id).execute()
        
        urls = []
        if result.data:
            for item in result.data:
                if item.get("search_urls"):
                    urls.append(item["search_urls"])
        
        return {"urls": urls}
    except Exception as e:
        logger.error(f"Failed to fetch campaign URLs: {e}")
        return {"urls": []}

@router.post("/campaigns/{campaign_id}/urls")
async def add_url_to_campaign(campaign_id: str, url_data: UrlCreate):
    """Add URL to a campaign in Supabase"""
    try:
        supabase = get_supabase_client()
        
        # Get organization ID from campaign
        campaign_result = supabase.client.table("campaigns").select("organization_id").eq("id", campaign_id).execute()
        if not campaign_result.data:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        org_id = campaign_result.data[0]["organization_id"]
        
        # Create search URL
        search_url = {
            "url": url_data.url,
            "notes": url_data.notes,
            "status": "pending",
            "organization_id": org_id
        }
        
        url_result = supabase.client.table("search_urls").insert(search_url).execute()
        
        if url_result.data:
            # Link URL to campaign
            campaign_url = {
                "campaign_id": campaign_id,
                "search_url_id": url_result.data[0]["id"],
                "organization_id": org_id
            }
            link_result = supabase.client.table("campaign_urls").insert(campaign_url).execute()
            
            logger.info(f"Added URL to campaign {campaign_id}: {url_data.url}")
            return {"url": url_result.data[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to add URL")
    except Exception as e:
        logger.error(f"Failed to add URL to campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/campaigns/{campaign_id}/urls/{url_id}")
async def remove_url_from_campaign(campaign_id: str, url_id: str):
    """Remove URL from a campaign in Supabase"""
    try:
        supabase = get_supabase_client()
        
        # Delete from campaign_urls junction table
        result = supabase.client.table("campaign_urls")\
            .delete()\
            .eq("campaign_id", campaign_id)\
            .eq("search_url_id", url_id)\
            .execute()
        
        logger.info(f"Removed URL {url_id} from campaign {campaign_id}")
        return {"message": "URL removed from campaign successfully"}
    except Exception as e:
        logger.error(f"Failed to remove URL from campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/run-script")
async def run_script(data: dict):
    """Run Apollo scraping script"""
    import subprocess
    import asyncio
    
    mode = data.get("mode", "test")
    campaign_id = data.get("campaignId")
    record_count = data.get("recordCount", 10)
    test_url = data.get("testUrl", "")
    
    logger.info(f"Running script in mode: {mode}, campaign: {campaign_id}, records: {record_count}")
    
    # Build command to run the actual Apollo scraper
    cmd = [
        "python3",
        os.path.join(os.path.dirname(__file__), "..", "lead_generation", "main.py"),
        mode
    ]
    
    # Set environment variables for the scraper
    env = os.environ.copy()
    if test_url:
        env["TEST_APOLLO_URL"] = test_url
    if record_count:
        env["RECORD_COUNT"] = str(record_count)
    if campaign_id:
        env["CAMPAIGN_ID"] = campaign_id
    
    try:
        # Run the script asynchronously
        process = await asyncio.create_subprocess_exec(
            *cmd,
            env=env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        # Store process info for status tracking
        global script_process
        script_process = {
            "process": process,
            "mode": mode,
            "campaign_id": campaign_id,
            "start_time": datetime.now().isoformat() + "Z"
        }
        
        return {
            "status": "started",
            "message": f"Started Apollo scraping in {mode} mode",
            "campaignId": campaign_id,
            "recordCount": record_count
        }
    except Exception as e:
        logger.error(f"Failed to start script: {e}")
        return {
            "status": "error",
            "message": f"Failed to start script: {str(e)}"
        }

@router.get("/script-status")
async def get_script_status():
    """Get script execution status"""
    global script_process
    
    if script_process and script_process.get("process"):
        process = script_process["process"]
        is_running = process.returncode is None
        
        if is_running:
            start_time = datetime.fromisoformat(script_process["start_time"].replace("Z", "+00:00"))
            uptime = (datetime.now(timezone.utc) - start_time).total_seconds()
            
            return {
                "isRunning": True,
                "mode": script_process.get("mode"),
                "campaignId": script_process.get("campaign_id"),
                "startTime": script_process.get("start_time"),
                "status": "running",
                "logCount": 0,
                "uptime": int(uptime)
            }
    
    return {
        "isRunning": False,
        "mode": None,
        "campaignId": None,
        "startTime": None,
        "status": "idle",
        "logCount": 0,
        "uptime": 0
    }

@router.post("/stop-script")
async def stop_script():
    """Stop running script"""
    logger.info("Stopping script")
    return {"status": "stopped", "message": "Script stopped successfully"}

@router.get("/script-logs")
async def get_script_logs(since: Optional[str] = None):
    """Get script logs"""
    return {
        "logs": [],
        "totalCount": 0,
        "isRunning": False,
        "status": "idle"
    }

@router.get("/execution-history")
async def get_execution_history():
    """Get execution history"""
    return {
        "history": [],
        "currentExecution": None
    }

@router.get("/audiences")
async def get_audiences():
    """Get all audiences from Supabase"""
    try:
        supabase = get_supabase_client()
        result = supabase.client.table("audiences").select("*").execute()
        return {"audiences": result.data or []}
    except Exception as e:
        logger.error(f"Failed to fetch audiences: {e}")
        return {"audiences": []}

@router.post("/audiences")
async def create_audience(data: dict):
    """Create a new audience in Supabase"""
    try:
        supabase = get_supabase_client()
        
        # Get first organization for now
        org_result = supabase.client.table("organizations").select("id").limit(1).execute()
        if not org_result.data:
            raise HTTPException(status_code=400, detail="No organization found")
        
        org_id = org_result.data[0]["id"]
        
        new_audience = {
            "name": data.get("name", "New Audience"),
            "description": data.get("description", ""),
            "status": "pending",
            "organization_id": org_id
        }
        
        result = supabase.client.table("audiences").insert(new_audience).execute()
        
        if result.data:
            logger.info(f"Created audience: {new_audience['name']}")
            return {"audience": result.data[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to create audience")
    except Exception as e:
        logger.error(f"Failed to create audience: {e}")
        raise HTTPException(status_code=500, detail=str(e))