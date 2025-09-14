"""
Coverage Analysis API Endpoints
Exposes the AI-powered ZIP code analyzer for dynamic location analysis
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
import sys
import os

# Add lead_generation modules to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'lead_generation', 'modules'))
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'lead_generation'))

from coverage_analyzer import CoverageAnalyzer
from gmaps_supabase_manager import GmapsSupabaseManager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["coverage"])

# Initialize the coverage analyzer
try:
    db_manager = GmapsSupabaseManager()
    coverage_analyzer = CoverageAnalyzer(supabase_manager=db_manager)
except Exception as e:
    logger.warning(f"Could not initialize database manager: {e}")
    coverage_analyzer = CoverageAnalyzer()

class CoverageAnalysisRequest(BaseModel):
    """Request model for coverage analysis"""
    location: str
    keywords: List[str]
    coverage_profile: str = "balanced"
    max_businesses_per_zip: Optional[int] = 50

class ZipCodeInfo(BaseModel):
    """ZIP code information"""
    zip: str
    neighborhood: str
    density_score: int
    relevance_score: int
    estimated_businesses: int
    combined_score: Optional[float] = None

class CoverageAnalysisResponse(BaseModel):
    """Response model for coverage analysis"""
    location_type: str
    primary_city: str
    state: str
    zip_codes: List[Dict[str, Any]]
    reasoning: str
    total_estimated_businesses: int
    coverage_notes: str
    estimated_cost: Optional[float] = None

@router.post("/analyze-coverage", response_model=CoverageAnalysisResponse)
async def analyze_coverage(request: CoverageAnalysisRequest):
    """
    Analyze a location and return optimal ZIP codes for scraping
    Uses AI to research the area and select ZIPs based on business density
    """
    try:
        logger.info(f"🔍 Analyzing coverage for: {request.location}")
        logger.info(f"   Keywords: {request.keywords}")
        logger.info(f"   Profile: {request.coverage_profile}")
        
        # Use the coverage analyzer to get optimal ZIP codes
        analysis = coverage_analyzer.analyze_location(
            location=request.location,
            keywords=request.keywords,
            profile=request.coverage_profile
        )
        
        # Add max businesses per ZIP to the response
        if "zip_codes" in analysis:
            for zip_data in analysis["zip_codes"]:
                zip_data["max_businesses"] = request.max_businesses_per_zip
        
        logger.info(f"✅ Selected {len(analysis.get('zip_codes', []))} ZIP codes")
        
        return CoverageAnalysisResponse(**analysis)
        
    except Exception as e:
        logger.error(f"Error analyzing coverage: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/coverage-profiles")
async def get_coverage_profiles():
    """
    Get available coverage profiles and their descriptions
    """
    profiles = {
        "budget": {
            "name": "Budget",
            "description": "Cost-effective coverage of high-value areas only",
            "max_zips": 5,
            "coverage_percentage": 0.85
        },
        "balanced": {
            "name": "Balanced",
            "description": "Good coverage focusing on business-dense areas",
            "max_zips": 10,
            "coverage_percentage": 0.94
        },
        "aggressive": {
            "name": "Aggressive",
            "description": "Complete market coverage - all available ZIP codes",
            "max_zips": 20,
            "coverage_percentage": 0.99
        }
    }
    
    return profiles

@router.post("/test-coverage")
async def test_coverage_analysis():
    """
    Test endpoint to verify coverage analysis is working
    """
    try:
        # Test with a sample location
        test_request = CoverageAnalysisRequest(
            location="Los Angeles, CA",
            keywords=["restaurants", "cafes"],
            coverage_profile="budget"
        )
        
        result = await analyze_coverage(test_request)
        
        return {
            "status": "success",
            "message": "Coverage analysis is working",
            "sample_result": result
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }