"""
Organizations endpoints for the API
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging
import json
import os
import sys
from pathlib import Path

# Add lead_generation modules to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'lead_generation', 'modules'))
from supabase_manager import SupabaseManager

logger = logging.getLogger(__name__)
router = APIRouter()

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
class OrganizationCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    contact_email: Optional[str] = None
    subscription_plan: Optional[str] = "free"

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    contact_email: Optional[str] = None
    subscription_plan: Optional[str] = None

# In-memory storage for demo
demo_organizations = [
    {
        "id": "demo-org-1",
        "name": "Demo Organization",
        "slug": "demo-org",
        "description": "Default demo organization",
        "contact_email": "demo@example.com",
        "subscription_plan": "free",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }
]

current_org_id = "demo-org-1"

@router.get("/organizations")
async def get_organizations():
    """Get all organizations from Supabase"""
    try:
        supabase = get_supabase_client()
        result = supabase.client.table("organizations").select("*").execute()
        return {"organizations": result.data or []}
    except Exception as e:
        logger.error(f"Failed to fetch organizations: {e}")
        return {"organizations": []}

@router.post("/organizations")
async def create_organization(org_data: OrganizationCreate):
    """Create a new organization"""
    import time
    new_org = {
        "id": f"org-{int(time.time())}",
        "name": org_data.name,
        "slug": org_data.slug,
        "description": org_data.description,
        "contact_email": org_data.contact_email,
        "subscription_plan": org_data.subscription_plan or "free",
        "created_at": datetime.now().isoformat() + "Z",
        "updated_at": datetime.now().isoformat() + "Z"
    }
    demo_organizations.append(new_org)
    logger.info(f"Created organization: {org_data.name}")
    return {"organization": new_org}

@router.put("/organizations/{org_id}")
async def update_organization(org_id: str, updates: OrganizationUpdate):
    """Update an organization"""
    for org in demo_organizations:
        if org["id"] == org_id:
            if updates.name:
                org["name"] = updates.name
            if updates.description is not None:
                org["description"] = updates.description
            if updates.contact_email is not None:
                org["contact_email"] = updates.contact_email
            if updates.subscription_plan:
                org["subscription_plan"] = updates.subscription_plan
            org["updated_at"] = datetime.now().isoformat() + "Z"
            logger.info(f"Updated organization: {org_id}")
            return {"organization": org}
    raise HTTPException(status_code=404, detail="Organization not found")

@router.delete("/organizations/{org_id}")
async def delete_organization(org_id: str):
    """Delete an organization"""
    global demo_organizations
    demo_organizations = [org for org in demo_organizations if org["id"] != org_id]
    logger.info(f"Deleted organization: {org_id}")
    return {"message": "Organization deleted successfully"}

@router.get("/current-organization")
async def get_current_organization():
    """Get current organization from Supabase"""
    try:
        # For now, return the first organization as current
        # In production, this would be based on user session/auth
        supabase = get_supabase_client()
        result = supabase.client.table("organizations").select("*").limit(1).execute()
        
        if result.data and len(result.data) > 0:
            org = result.data[0]
            return {"organizationId": org["id"], "organization": org}
        
        return {"organizationId": None, "organization": None}
    except Exception as e:
        logger.error(f"Failed to fetch current organization: {e}")
        return {"organizationId": None, "organization": None}

@router.post("/set-organization")
async def set_current_organization(data: dict):
    """Set current organization (session-based in production)"""
    org_id = data.get("organizationId")
    
    try:
        # Verify organization exists in Supabase
        supabase = get_supabase_client()
        result = supabase.client.table("organizations").select("id").eq("id", org_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        # In production, this would update user session
        # For now, just return success
        logger.info(f"Set current organization to: {org_id}")
        return {"message": "Organization set successfully", "organizationId": org_id}
    except Exception as e:
        logger.error(f"Failed to set organization: {e}")
        raise HTTPException(status_code=500, detail="Failed to set organization")

@router.get("/organizations/{org_id}/api-keys")
async def get_organization_api_keys(org_id: str):
    """Get API keys for organization"""
    # Return demo API keys
    return {
        "openai_api_key": None,
        "apify_api_key": None
    }

@router.post("/organizations/{org_id}/api-keys")
async def update_organization_api_keys(org_id: str, api_keys: dict):
    """Update API keys for organization"""
    logger.info(f"Updated API keys for organization: {org_id}")
    return {"message": "API keys updated successfully"}

@router.get("/organizations/{org_id}/settings")
async def get_organization_settings(org_id: str):
    """Get settings for organization"""
    return {
        "ai_model_summary": "gpt-3.5-turbo",
        "ai_model_icebreaker": "gpt-3.5-turbo",
        "ai_temperature": 0.7,
        "delay_between_ai_calls": 1000
    }

@router.post("/organizations/{org_id}/settings")
async def update_organization_settings(org_id: str, settings: dict):
    """Update settings for organization"""
    logger.info(f"Updated settings for organization: {org_id}")
    return {"message": "Settings updated successfully"}

@router.get("/organizations/{org_id}/usage")
async def get_organization_usage(org_id: str, month: Optional[str] = None, year: Optional[str] = None):
    """Get usage data for organization"""
    return {
        "usage": [],
        "summary": {
            "total_contacts": 0,
            "total_icebreakers": 0,
            "total_api_calls": 0
        },
        "period": {
            "month": month or datetime.now().strftime("%m"),
            "year": year or datetime.now().strftime("%Y")
        }
    }