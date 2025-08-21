import os
import json
import logging
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
import httpx
from datetime import datetime, timezone

# Vapi SDK-like interface for phone number and call management
logger = logging.getLogger(__name__)

class VapiError(Exception):
    """Base exception for Vapi API errors"""
    pass

class PhoneNumber(BaseModel):
    """Vapi phone number model"""
    id: str
    name: Optional[str] = None
    assistantId: Optional[str] = None
    squadId: Optional[str] = None
    serverUrl: Optional[str] = None
    serverUrlSecret: Optional[str] = None
    number: str
    twilioPhoneNumber: Optional[str] = None
    twilioAccountSid: Optional[str] = None
    twilioAuthToken: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime

class Assistant(BaseModel):
    """Vapi AI assistant model"""
    id: str
    name: Optional[str] = None
    firstMessage: Optional[str] = None
    systemPrompt: Optional[str] = None
    model: Dict[str, Any] = Field(default_factory=dict)
    voice: Dict[str, Any] = Field(default_factory=dict)
    voicemailDetection: Optional[bool] = None
    voicemailMessage: Optional[str] = None
    endCallMessage: Optional[str] = None
    endCallPhrases: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    serverUrl: Optional[str] = None
    serverUrlSecret: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime

class Call(BaseModel):
    """Vapi call model"""
    id: str
    orgId: str
    assistantId: Optional[str] = None
    phoneNumberId: Optional[str] = None
    customerId: Optional[str] = None
    status: str  # "queued", "ringing", "in-progress", "forwarding", "ended"
    type: str    # "inboundPhoneCall", "outboundPhoneCall", "webCall"
    customer: Dict[str, Any] = Field(default_factory=dict)
    phoneCallProvider: str = "twilio"
    phoneCallTransport: str = "pstn"
    startedAt: Optional[datetime] = None
    endedAt: Optional[datetime] = None
    cost: Optional[float] = None
    transcript: Optional[str] = None
    summary: Optional[str] = None
    messages: List[Dict[str, Any]] = Field(default_factory=list)
    createdAt: datetime
    updatedAt: datetime

class VapiService:
    """Service for managing Vapi AI phone calls and assistants"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('VAPI_API_KEY')
        if not self.api_key:
            raise VapiError("VAPI_API_KEY environment variable or api_key parameter is required")
        
        self.base_url = "https://api.vapi.ai"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # HTTP client for API requests
        self.client = httpx.AsyncClient(
            timeout=30.0,
            headers=self.headers
        )
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
    
    async def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make HTTP request to Vapi API"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        try:
            response = await self.client.request(method, url, **kwargs)
            response.raise_for_status()
            
            if response.status_code == 204:  # No content
                return {}
            
            return response.json()
            
        except httpx.HTTPStatusError as e:
            error_msg = f"Vapi API error {e.response.status_code}: {e.response.text}"
            logger.error(error_msg)
            raise VapiError(error_msg)
        except Exception as e:
            error_msg = f"Request failed: {str(e)}"
            logger.error(error_msg)
            raise VapiError(error_msg)
    
    # Phone Number Management
    async def list_phone_numbers(self) -> List[PhoneNumber]:
        """List all phone numbers"""
        data = await self._make_request("GET", "/phone-number")
        return [PhoneNumber(**item) for item in data]
    
    async def get_phone_number(self, phone_number_id: str) -> PhoneNumber:
        """Get specific phone number by ID"""
        data = await self._make_request("GET", f"/phone-number/{phone_number_id}")
        return PhoneNumber(**data)
    
    async def create_phone_number(self, 
                                 number: str,
                                 name: Optional[str] = None,
                                 assistant_id: Optional[str] = None) -> PhoneNumber:
        """Create a new phone number"""
        payload = {
            "number": number,
            "name": name,
            "assistantId": assistant_id
        }
        # Remove None values
        payload = {k: v for k, v in payload.items() if v is not None}
        
        data = await self._make_request("POST", "/phone-number", json=payload)
        return PhoneNumber(**data)
    
    async def update_phone_number(self, 
                                 phone_number_id: str,
                                 name: Optional[str] = None,
                                 assistant_id: Optional[str] = None) -> PhoneNumber:
        """Update phone number configuration"""
        payload = {}
        if name is not None:
            payload["name"] = name
        if assistant_id is not None:
            payload["assistantId"] = assistant_id
        
        data = await self._make_request("PATCH", f"/phone-number/{phone_number_id}", json=payload)
        return PhoneNumber(**data)
    
    async def delete_phone_number(self, phone_number_id: str) -> bool:
        """Delete a phone number"""
        await self._make_request("DELETE", f"/phone-number/{phone_number_id}")
        return True
    
    # Assistant Management
    async def list_assistants(self) -> List[Assistant]:
        """List all assistants"""
        data = await self._make_request("GET", "/assistant")
        return [Assistant(**item) for item in data]
    
    async def get_assistant(self, assistant_id: str) -> Assistant:
        """Get specific assistant by ID"""
        data = await self._make_request("GET", f"/assistant/{assistant_id}")
        return Assistant(**data)
    
    async def create_assistant(self,
                              name: str,
                              first_message: str,
                              system_prompt: str,
                              model: Dict[str, Any] = None,
                              voice: Dict[str, Any] = None,
                              **kwargs) -> Assistant:
        """Create a new AI assistant"""
        payload = {
            "name": name,
            "firstMessage": first_message,
            "systemPrompt": system_prompt,
            "model": model or {
                "provider": "openai",
                "model": "gpt-4",
                "temperature": 0.7,
                "maxTokens": 250
            },
            "voice": voice or {
                "provider": "elevenlabs",
                "voiceId": "21m00Tcm4TlvDq8ikWAM",
                "stability": 0.5,
                "similarityBoost": 0.75
            }
        }
        payload.update(kwargs)
        
        data = await self._make_request("POST", "/assistant", json=payload)
        return Assistant(**data)
    
    async def update_assistant(self, 
                              assistant_id: str,
                              **kwargs) -> Assistant:
        """Update assistant configuration"""
        data = await self._make_request("PATCH", f"/assistant/{assistant_id}", json=kwargs)
        return Assistant(**data)
    
    async def delete_assistant(self, assistant_id: str) -> bool:
        """Delete an assistant"""
        await self._make_request("DELETE", f"/assistant/{assistant_id}")
        return True
    
    # Call Management
    async def list_calls(self, 
                        assistant_id: Optional[str] = None,
                        phone_number_id: Optional[str] = None,
                        limit: int = 100) -> List[Call]:
        """List calls with optional filtering"""
        params = {"limit": limit}
        if assistant_id:
            params["assistantId"] = assistant_id
        if phone_number_id:
            params["phoneNumberId"] = phone_number_id
        
        data = await self._make_request("GET", "/call", params=params)
        return [Call(**item) for item in data]
    
    async def get_call(self, call_id: str) -> Call:
        """Get specific call by ID"""
        data = await self._make_request("GET", f"/call/{call_id}")
        return Call(**data)
    
    async def create_call(self,
                         phone_number_id: str,
                         customer_number: str,
                         assistant_id: Optional[str] = None,
                         **kwargs) -> Call:
        """Create an outbound call"""
        payload = {
            "phoneNumberId": phone_number_id,
            "customer": {
                "number": customer_number
            }
        }
        
        if assistant_id:
            payload["assistantId"] = assistant_id
        
        payload.update(kwargs)
        
        data = await self._make_request("POST", "/call", json=payload)
        return Call(**data)
    
    # Webhook handling for call events
    def verify_webhook_signature(self, payload: str, signature: str, secret: str) -> bool:
        """Verify webhook signature for security"""
        import hmac
        import hashlib
        
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(f"sha256={expected_signature}", signature)
    
    def parse_webhook_event(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Parse webhook event from Vapi"""
        event_type = payload.get("type")
        call_id = payload.get("call", {}).get("id")
        
        return {
            "event_type": event_type,
            "call_id": call_id,
            "call": payload.get("call"),
            "message": payload.get("message"),
            "timestamp": payload.get("timestamp", datetime.now(timezone.utc).isoformat())
        }

# Utility functions for phone number management
class PhoneNumberPool:
    """Helper class for managing phone number pools with rotation"""
    
    def __init__(self, vapi_service: VapiService, supabase_manager):
        self.vapi = vapi_service
        self.supabase = supabase_manager
    
    async def sync_vapi_numbers_to_db(self, organization_id: str) -> int:
        """Sync Vapi phone numbers to local database"""
        try:
            # Get phone numbers from Vapi
            vapi_numbers = await self.vapi.list_phone_numbers()
            synced_count = 0
            
            for vapi_number in vapi_numbers:
                # Check if number already exists in database
                existing = await self.supabase.execute_query(
                    """
                    SELECT id FROM phone_numbers 
                    WHERE vapi_phone_number_id = %s AND organization_id = %s
                    """,
                    (vapi_number.id, organization_id)
                )
                
                if not existing:
                    # Insert new phone number
                    await self.supabase.execute_query(
                        """
                        INSERT INTO phone_numbers (
                            organization_id, vapi_phone_number_id, phone_number,
                            caller_name, status, created_at, updated_at
                        ) VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                        """,
                        (
                            organization_id,
                            vapi_number.id,
                            vapi_number.number,
                            vapi_number.name or 'Vapi Number',
                            'active'
                        )
                    )
                    synced_count += 1
            
            logger.info(f"Synced {synced_count} new phone numbers from Vapi")
            return synced_count
            
        except Exception as e:
            logger.error(f"Failed to sync Vapi numbers: {str(e)}")
            raise
    
    async def get_next_available_number(self, organization_id: str, pool_id: str = None) -> Optional[Dict[str, Any]]:
        """Get next available phone number using database rotation logic"""
        try:
            # Use the PostgreSQL function we created in the migration
            result = await self.supabase.execute_query(
                "SELECT * FROM get_next_phone_number(%s, %s)",
                (organization_id, pool_id)
            )
            
            if result:
                return {
                    "phone_number_id": result[0]['phone_number_id'],
                    "phone_number": result[0]['phone_number'], 
                    "vapi_phone_number_id": result[0]['vapi_phone_number_id']
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get next phone number: {str(e)}")
            raise

# Factory function for creating VapiService instances
def create_vapi_service(api_key: str = None) -> VapiService:
    """Create a new VapiService instance"""
    return VapiService(api_key=api_key)

# Test connectivity function
async def test_vapi_connection(api_key: str = None) -> Dict[str, Any]:
    """Test connection to Vapi API"""
    try:
        async with create_vapi_service(api_key) as vapi:
            # Try to list phone numbers as a connectivity test
            numbers = await vapi.list_phone_numbers()
            assistants = await vapi.list_assistants()
            
            return {
                "success": True,
                "phone_numbers_count": len(numbers),
                "assistants_count": len(assistants),
                "message": "Successfully connected to Vapi API"
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to connect to Vapi API"
        }