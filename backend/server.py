from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import Response
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
import httpx
from datetime import datetime, timezone, timedelta
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Stripe
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ================= MODELS =================

class UserBase(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: Optional[str] = None  # clipper, agency, manager, client
    display_name: Optional[str] = None  # pseudo for clipper, agency name for agency
    created_at: datetime
    settings: Optional[Dict[str, Any]] = None

class RoleSelection(BaseModel):
    role: str
    display_name: str

class Campaign(BaseModel):
    campaign_id: str
    agency_id: str
    name: str
    image_url: Optional[str] = None
    rpm: float  # Revenue per 1000 views
    budget_total: Optional[float] = None
    budget_unlimited: bool = False
    budget_used: float = 0
    min_view_payout: int = 0
    max_view_payout: Optional[int] = None
    pay_for_post: bool = False
    platforms: List[str] = []  # tiktok, youtube, instagram
    strike_days: int = 3
    cadence: int = 1  # posts per day minimum
    application_form_enabled: bool = False
    application_questions: List[str] = []
    token_clipper: str
    token_manager: str
    token_client: str
    created_at: datetime
    status: str = "active"

class CampaignCreate(BaseModel):
    name: str
    image_url: Optional[str] = None
    rpm: float
    budget_total: Optional[float] = None
    budget_unlimited: bool = False
    min_view_payout: int = 0
    max_view_payout: Optional[int] = None
    pay_for_post: bool = False
    platforms: List[str] = []
    strike_days: int = 3
    cadence: int = 1
    application_form_enabled: bool = False
    application_questions: List[str] = []

class CampaignMember(BaseModel):
    member_id: str
    campaign_id: str
    user_id: str
    role: str  # clipper, manager, client
    status: str = "active"  # active, suspended, pending
    joined_at: datetime
    strikes: int = 0
    last_post_at: Optional[datetime] = None

class SocialAccount(BaseModel):
    account_id: str
    user_id: str
    platform: str  # tiktok, youtube, instagram
    username: str
    status: str = "pending"  # pending, verified, error
    created_at: datetime

class SocialAccountCreate(BaseModel):
    platform: str
    username: str

class CampaignSocialAccount(BaseModel):
    id: str
    campaign_id: str
    user_id: str
    account_id: str
    assigned_at: datetime

class Message(BaseModel):
    message_id: str
    campaign_id: str
    sender_id: str
    sender_name: str
    sender_role: str
    recipient_id: Optional[str] = None  # None = broadcast to campaign
    content: str
    message_type: str = "chat"  # chat, advice, access
    created_at: datetime

class MessageCreate(BaseModel):
    campaign_id: str
    recipient_id: Optional[str] = None
    content: str
    message_type: str = "chat"

class Announcement(BaseModel):
    announcement_id: str
    agency_id: str
    campaign_id: Optional[str] = None
    title: str
    content: str
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    created_at: datetime

class AnnouncementCreate(BaseModel):
    campaign_id: Optional[str] = None
    title: str
    content: str
    image_url: Optional[str] = None
    link_url: Optional[str] = None

class Advice(BaseModel):
    advice_id: str
    manager_id: str
    campaign_id: str
    recipient_ids: List[str]
    content: str
    created_at: datetime

class AdviceCreate(BaseModel):
    campaign_id: str
    recipient_ids: List[str]
    content: str

class Application(BaseModel):
    application_id: str
    campaign_id: str
    user_id: str
    answers: Dict[str, str]
    status: str = "pending"  # pending, accepted, rejected
    created_at: datetime

class ApplicationCreate(BaseModel):
    campaign_id: str
    answers: Dict[str, str]

# ================= WEBSOCKET MANAGER =================

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id] = [
                ws for ws in self.active_connections[user_id] if ws != websocket
            ]

    async def send_to_user(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_json(message)
                except:
                    pass

    async def broadcast_to_campaign(self, campaign_id: str, message: dict):
        members = await db.campaign_members.find(
            {"campaign_id": campaign_id, "status": "active"},
            {"_id": 0, "user_id": 1}
        ).to_list(1000)
        for member in members:
            await self.send_to_user(member["user_id"], message)

manager = ConnectionManager()

# ================= AUTH HELPERS =================

async def get_current_user(request: Request) -> dict:
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0}
    )
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# ================= AUTH ROUTES =================

@api_router.post("/auth/session")
async def create_session(request: Request):
    """Exchange session_id for session_token"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        
        auth_data = response.json()
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    email = auth_data.get("email")
    name = auth_data.get("name")
    picture = auth_data.get("picture")
    session_token = auth_data.get("session_token")
    
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": None,
            "display_name": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "settings": {}
        })
    
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    response = Response(
        content=json.dumps({"user": user, "session_token": session_token}),
        media_type="application/json"
    )
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    return response

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/auth/select-role")
async def select_role(role_data: RoleSelection, user: dict = Depends(get_current_user)):
    if role_data.role not in ["clipper", "agency", "manager", "client"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    if user.get("role"):
        raise HTTPException(status_code=400, detail="Role already selected")
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"role": role_data.role, "display_name": role_data.display_name}}
    )
    
    updated_user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return updated_user

@api_router.post("/auth/logout")
async def logout(request: Request, user: dict = Depends(get_current_user)):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response = Response(content=json.dumps({"message": "Logged out"}), media_type="application/json")
    response.delete_cookie(key="session_token", path="/")
    return response

# ================= CAMPAIGN ROUTES =================

@api_router.post("/campaigns", response_model=dict)
async def create_campaign(campaign_data: CampaignCreate, user: dict = Depends(get_current_user)):
    if user.get("role") != "agency":
        raise HTTPException(status_code=403, detail="Only agencies can create campaigns")
    
    campaign_id = f"camp_{uuid.uuid4().hex[:12]}"
    
    campaign = {
        "campaign_id": campaign_id,
        "agency_id": user["user_id"],
        "name": campaign_data.name,
        "image_url": campaign_data.image_url,
        "rpm": campaign_data.rpm,
        "budget_total": campaign_data.budget_total,
        "budget_unlimited": campaign_data.budget_unlimited,
        "budget_used": 0,
        "min_view_payout": campaign_data.min_view_payout,
        "max_view_payout": campaign_data.max_view_payout,
        "pay_for_post": campaign_data.pay_for_post,
        "platforms": campaign_data.platforms,
        "strike_days": campaign_data.strike_days,
        "cadence": campaign_data.cadence,
        "application_form_enabled": campaign_data.application_form_enabled,
        "application_questions": campaign_data.application_questions,
        "token_clipper": uuid.uuid4().hex,
        "token_manager": uuid.uuid4().hex,
        "token_client": uuid.uuid4().hex,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "active"
    }
    
    await db.campaigns.insert_one(campaign)
    campaign.pop("_id", None)
    
    await manager.send_to_user(user["user_id"], {
        "type": "campaign_created",
        "campaign": campaign
    })
    
    return campaign

@api_router.get("/campaigns")
async def get_campaigns(user: dict = Depends(get_current_user)):
    """Get campaigns based on user role"""
    role = user.get("role")
    
    if role == "agency":
        campaigns = await db.campaigns.find(
            {"agency_id": user["user_id"]},
            {"_id": 0}
        ).to_list(100)
    else:
        memberships = await db.campaign_members.find(
            {"user_id": user["user_id"], "status": {"$ne": "suspended"}},
            {"_id": 0}
        ).to_list(100)
        campaign_ids = [m["campaign_id"] for m in memberships]
        campaigns = await db.campaigns.find(
            {"campaign_id": {"$in": campaign_ids}},
            {"_id": 0}
        ).to_list(100)
    
    return {"campaigns": campaigns}

@api_router.get("/campaigns/discover")
async def discover_campaigns(user: dict = Depends(get_current_user)):
    """Get all active campaigns for discovery"""
    campaigns = await db.campaigns.find(
        {"status": "active"},
        {"_id": 0, "token_clipper": 0, "token_manager": 0, "token_client": 0}
    ).to_list(100)
    
    for campaign in campaigns:
        agency = await db.users.find_one(
            {"user_id": campaign["agency_id"]},
            {"_id": 0, "display_name": 1, "picture": 1}
        )
        campaign["agency_name"] = agency.get("display_name") if agency else "Unknown"
    
    return {"campaigns": campaigns}

@api_router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str, user: dict = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if user.get("role") == "agency" and campaign["agency_id"] == user["user_id"]:
        members = await db.campaign_members.find(
            {"campaign_id": campaign_id},
            {"_id": 0}
        ).to_list(100)
        
        for member in members:
            member_user = await db.users.find_one(
                {"user_id": member["user_id"]},
                {"_id": 0, "name": 1, "email": 1, "display_name": 1, "picture": 1}
            )
            member["user_info"] = member_user
            
            accounts = await db.campaign_social_accounts.find(
                {"campaign_id": campaign_id, "user_id": member["user_id"]},
                {"_id": 0}
            ).to_list(50)
            account_ids = [a["account_id"] for a in accounts]
            social_accounts = await db.social_accounts.find(
                {"account_id": {"$in": account_ids}},
                {"_id": 0}
            ).to_list(50)
            member["social_accounts"] = social_accounts
        
        campaign["members"] = members
        return campaign
    
    is_member = await db.campaign_members.find_one({
        "campaign_id": campaign_id,
        "user_id": user["user_id"]
    })
    
    if not is_member and user.get("role") != "agency":
        campaign.pop("token_clipper", None)
        campaign.pop("token_manager", None)
        campaign.pop("token_client", None)
    
    return campaign

@api_router.get("/campaigns/{campaign_id}/links")
async def get_campaign_links(campaign_id: str, user: dict = Depends(get_current_user)):
    """Get invitation links for a campaign (agency only)"""
    campaign = await db.campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign["agency_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return {
        "campaign_id": campaign_id,
        "name": campaign["name"],
        "token_clipper": campaign["token_clipper"],
        "token_manager": campaign["token_manager"],
        "token_client": campaign["token_client"]
    }

@api_router.get("/campaigns/all-links/agency")
async def get_all_campaign_links(user: dict = Depends(get_current_user)):
    """Get all invitation links for agency's campaigns"""
    if user.get("role") != "agency":
        raise HTTPException(status_code=403, detail="Only agencies can access this")
    
    campaigns = await db.campaigns.find(
        {"agency_id": user["user_id"]},
        {"_id": 0, "campaign_id": 1, "name": 1, "token_clipper": 1, "token_manager": 1, "token_client": 1}
    ).to_list(100)
    
    return {"campaigns": campaigns}

@api_router.post("/campaigns/join/{token}")
async def join_campaign(token: str, user: dict = Depends(get_current_user)):
    """Join a campaign using invitation token"""
    campaign = await db.campaigns.find_one({
        "$or": [
            {"token_clipper": token},
            {"token_manager": token},
            {"token_client": token}
        ]
    }, {"_id": 0})
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Invalid invitation link")
    
    if campaign["token_clipper"] == token:
        expected_role = "clipper"
    elif campaign["token_manager"] == token:
        expected_role = "manager"
    else:
        expected_role = "client"
    
    if user.get("role") and user["role"] != expected_role:
        raise HTTPException(status_code=400, detail=f"This link is for {expected_role}s only")
    
    if not user.get("role"):
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"role": expected_role}}
        )
    
    existing = await db.campaign_members.find_one({
        "campaign_id": campaign["campaign_id"],
        "user_id": user["user_id"]
    })
    
    if existing:
        return {"message": "Already a member", "campaign": campaign}
    
    member = {
        "member_id": f"mem_{uuid.uuid4().hex[:12]}",
        "campaign_id": campaign["campaign_id"],
        "user_id": user["user_id"],
        "role": expected_role,
        "status": "active",
        "joined_at": datetime.now(timezone.utc).isoformat(),
        "strikes": 0,
        "last_post_at": None
    }
    
    await db.campaign_members.insert_one(member)
    
    await manager.send_to_user(user["user_id"], {
        "type": "campaign_joined",
        "campaign": campaign
    })
    
    await manager.send_to_user(campaign["agency_id"], {
        "type": "member_joined",
        "campaign_id": campaign["campaign_id"],
        "user_id": user["user_id"],
        "role": expected_role
    })
    
    return {"message": "Joined successfully", "campaign": campaign}

@api_router.post("/campaigns/{campaign_id}/apply")
async def apply_to_campaign(campaign_id: str, application: ApplicationCreate, user: dict = Depends(get_current_user)):
    """Apply to a campaign with application form"""
    campaign = await db.campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if not campaign.get("application_form_enabled"):
        raise HTTPException(status_code=400, detail="Campaign does not accept applications")
    
    existing = await db.applications.find_one({
        "campaign_id": campaign_id,
        "user_id": user["user_id"]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already applied")
    
    app_doc = {
        "application_id": f"app_{uuid.uuid4().hex[:12]}",
        "campaign_id": campaign_id,
        "user_id": user["user_id"],
        "answers": application.answers,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.applications.insert_one(app_doc)
    return {"message": "Application submitted"}

@api_router.get("/campaigns/{campaign_id}/applications")
async def get_applications(campaign_id: str, user: dict = Depends(get_current_user)):
    """Get applications for a campaign (agency only)"""
    campaign = await db.campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign or campaign["agency_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    applications = await db.applications.find(
        {"campaign_id": campaign_id},
        {"_id": 0}
    ).to_list(100)
    
    for app in applications:
        applicant = await db.users.find_one(
            {"user_id": app["user_id"]},
            {"_id": 0, "name": 1, "email": 1, "picture": 1, "display_name": 1}
        )
        app["applicant"] = applicant
    
    return {"applications": applications}

@api_router.post("/campaigns/{campaign_id}/applications/{application_id}/accept")
async def accept_application(campaign_id: str, application_id: str, user: dict = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign or campaign["agency_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    application = await db.applications.find_one({"application_id": application_id}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    await db.applications.update_one(
        {"application_id": application_id},
        {"$set": {"status": "accepted"}}
    )
    
    member = {
        "member_id": f"mem_{uuid.uuid4().hex[:12]}",
        "campaign_id": campaign_id,
        "user_id": application["user_id"],
        "role": "clipper",
        "status": "active",
        "joined_at": datetime.now(timezone.utc).isoformat(),
        "strikes": 0,
        "last_post_at": None
    }
    
    await db.campaign_members.insert_one(member)
    
    await manager.send_to_user(application["user_id"], {
        "type": "application_accepted",
        "campaign": campaign
    })
    
    return {"message": "Application accepted"}

# ================= SOCIAL ACCOUNTS =================

@api_router.get("/social-accounts")
async def get_social_accounts(user: dict = Depends(get_current_user)):
    accounts = await db.social_accounts.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).to_list(50)
    return {"accounts": accounts}

@api_router.post("/social-accounts")
async def add_social_account(account_data: SocialAccountCreate, user: dict = Depends(get_current_user)):
    if user.get("role") != "clipper":
        raise HTTPException(status_code=403, detail="Only clippers can add social accounts")
    
    existing = await db.social_accounts.find_one({
        "user_id": user["user_id"],
        "platform": account_data.platform,
        "username": account_data.username
    })
    if existing:
        raise HTTPException(status_code=400, detail="Account already exists")
    
    account = {
        "account_id": f"acc_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "platform": account_data.platform,
        "username": account_data.username,
        "status": "verified",  # Auto-verify for MVP
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.social_accounts.insert_one(account)
    account.pop("_id", None)
    return account

@api_router.delete("/social-accounts/{account_id}")
async def delete_social_account(account_id: str, user: dict = Depends(get_current_user)):
    account = await db.social_accounts.find_one({
        "account_id": account_id,
        "user_id": user["user_id"]
    })
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    await db.social_accounts.delete_one({"account_id": account_id})
    await db.campaign_social_accounts.delete_many({"account_id": account_id})
    
    return {"message": "Account deleted"}

@api_router.get("/campaigns/{campaign_id}/social-accounts")
async def get_campaign_social_accounts(campaign_id: str, user: dict = Depends(get_current_user)):
    """Get social accounts assigned to a campaign for current user"""
    assignments = await db.campaign_social_accounts.find(
        {"campaign_id": campaign_id, "user_id": user["user_id"]},
        {"_id": 0}
    ).to_list(50)
    
    account_ids = [a["account_id"] for a in assignments]
    accounts = await db.social_accounts.find(
        {"account_id": {"$in": account_ids}},
        {"_id": 0}
    ).to_list(50)
    
    return {"accounts": accounts}

@api_router.post("/campaigns/{campaign_id}/social-accounts/{account_id}")
async def assign_account_to_campaign(campaign_id: str, account_id: str, user: dict = Depends(get_current_user)):
    account = await db.social_accounts.find_one({
        "account_id": account_id,
        "user_id": user["user_id"]
    })
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    existing = await db.campaign_social_accounts.find_one({
        "campaign_id": campaign_id,
        "account_id": account_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already assigned")
    
    assignment = {
        "id": f"csa_{uuid.uuid4().hex[:12]}",
        "campaign_id": campaign_id,
        "user_id": user["user_id"],
        "account_id": account_id,
        "assigned_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.campaign_social_accounts.insert_one(assignment)
    return {"message": "Account assigned"}

@api_router.delete("/campaigns/{campaign_id}/social-accounts/{account_id}")
async def remove_account_from_campaign(campaign_id: str, account_id: str, user: dict = Depends(get_current_user)):
    result = await db.campaign_social_accounts.delete_one({
        "campaign_id": campaign_id,
        "account_id": account_id,
        "user_id": user["user_id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {"message": "Account removed from campaign"}

# ================= MESSAGES & CHAT =================

@api_router.get("/campaigns/{campaign_id}/messages")
async def get_messages(campaign_id: str, user: dict = Depends(get_current_user)):
    messages = await db.messages.find(
        {"campaign_id": campaign_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return {"messages": list(reversed(messages))}

@api_router.post("/messages")
async def send_message(message_data: MessageCreate, user: dict = Depends(get_current_user)):
    message = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "campaign_id": message_data.campaign_id,
        "sender_id": user["user_id"],
        "sender_name": user.get("display_name") or user.get("name"),
        "sender_role": user.get("role"),
        "recipient_id": message_data.recipient_id,
        "content": message_data.content,
        "message_type": message_data.message_type,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.messages.insert_one(message)
    message.pop("_id", None)
    
    await manager.broadcast_to_campaign(message_data.campaign_id, {
        "type": "new_message",
        "message": message
    })
    
    return message

# ================= ANNOUNCEMENTS =================

@api_router.get("/announcements")
async def get_announcements(user: dict = Depends(get_current_user)):
    """Get announcements for feed"""
    if user.get("role") == "agency":
        announcements = await db.announcements.find(
            {"agency_id": user["user_id"]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(50)
    else:
        memberships = await db.campaign_members.find(
            {"user_id": user["user_id"]},
            {"_id": 0, "campaign_id": 1}
        ).to_list(100)
        campaign_ids = [m["campaign_id"] for m in memberships]
        
        campaigns = await db.campaigns.find(
            {"campaign_id": {"$in": campaign_ids}},
            {"_id": 0, "agency_id": 1}
        ).to_list(100)
        agency_ids = list(set([c["agency_id"] for c in campaigns]))
        
        announcements = await db.announcements.find(
            {"agency_id": {"$in": agency_ids}},
            {"_id": 0}
        ).sort("created_at", -1).to_list(50)
    
    for ann in announcements:
        agency = await db.users.find_one(
            {"user_id": ann["agency_id"]},
            {"_id": 0, "display_name": 1, "picture": 1}
        )
        ann["agency"] = agency
    
    return {"announcements": announcements}

@api_router.post("/announcements")
async def create_announcement(ann_data: AnnouncementCreate, user: dict = Depends(get_current_user)):
    if user.get("role") != "agency":
        raise HTTPException(status_code=403, detail="Only agencies can create announcements")
    
    announcement = {
        "announcement_id": f"ann_{uuid.uuid4().hex[:12]}",
        "agency_id": user["user_id"],
        "campaign_id": ann_data.campaign_id,
        "title": ann_data.title,
        "content": ann_data.content,
        "image_url": ann_data.image_url,
        "link_url": ann_data.link_url,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.announcements.insert_one(announcement)
    announcement.pop("_id", None)
    return announcement

# ================= ADVICE (MANAGER) =================

@api_router.get("/advices")
async def get_advices(user: dict = Depends(get_current_user)):
    if user.get("role") == "manager":
        advices = await db.advices.find(
            {"manager_id": user["user_id"]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(50)
    else:
        advices = await db.advices.find(
            {"recipient_ids": user["user_id"]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(50)
    
    return {"advices": advices}

@api_router.post("/advices")
async def create_advice(advice_data: AdviceCreate, user: dict = Depends(get_current_user)):
    if user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Only managers can send advice")
    
    advice = {
        "advice_id": f"adv_{uuid.uuid4().hex[:12]}",
        "manager_id": user["user_id"],
        "campaign_id": advice_data.campaign_id,
        "recipient_ids": advice_data.recipient_ids,
        "content": advice_data.content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.advices.insert_one(advice)
    advice.pop("_id", None)
    
    for recipient_id in advice_data.recipient_ids:
        await manager.send_to_user(recipient_id, {
            "type": "new_advice",
            "advice": advice
        })
    
    return advice

# ================= MANAGER REMINDER =================

@api_router.get("/campaigns/{campaign_id}/clippers-advice-status")
async def get_clippers_advice_status(campaign_id: str, user: dict = Depends(get_current_user)):
    """Get clippers in a campaign with their advice status (for agency/manager)"""
    if user.get("role") not in ["agency", "manager"]:
        raise HTTPException(status_code=403, detail="Agency or Manager only")
    
    # Get clipper members
    members = await db.campaign_members.find(
        {"campaign_id": campaign_id, "role": "clipper", "status": "active"},
        {"_id": 0}
    ).to_list(100)
    
    clippers = []
    for member in members:
        clipper_user = await db.users.find_one(
            {"user_id": member["user_id"]},
            {"_id": 0, "user_id": 1, "name": 1, "email": 1, "display_name": 1, "picture": 1}
        )
        
        if clipper_user:
            # Get last advice for this clipper in this campaign
            last_advice = await db.advices.find_one(
                {
                    "campaign_id": campaign_id,
                    "recipient_ids": member["user_id"]
                },
                {"_id": 0},
                sort=[("created_at", -1)]
            )
            
            hours_since_advice = None
            needs_advice = True
            
            if last_advice:
                last_time = datetime.fromisoformat(last_advice["created_at"])
                if last_time.tzinfo is None:
                    last_time = last_time.replace(tzinfo=timezone.utc)
                hours_since_advice = (datetime.now(timezone.utc) - last_time).total_seconds() / 3600
                needs_advice = hours_since_advice >= 72
            
            clippers.append({
                **clipper_user,
                "hours_since_advice": round(hours_since_advice, 1) if hours_since_advice else None,
                "needs_advice": needs_advice,
                "last_advice_at": last_advice["created_at"] if last_advice else None
            })
    
    # Sort: those needing advice first, then by hours since last advice (descending)
    clippers.sort(key=lambda x: (not x["needs_advice"], -(x["hours_since_advice"] or 9999)))
    
    return {"clippers": clippers}

@api_router.get("/manager/reminder-status")
async def get_reminder_status(user: dict = Depends(get_current_user)):
    if user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Managers only")
    
    last_advice = await db.advices.find_one(
        {"manager_id": user["user_id"]},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    if not last_advice:
        return {"show_reminder": True, "hours_since_last": None}
    
    last_time = datetime.fromisoformat(last_advice["created_at"])
    if last_time.tzinfo is None:
        last_time = last_time.replace(tzinfo=timezone.utc)
    
    hours_diff = (datetime.now(timezone.utc) - last_time).total_seconds() / 3600
    
    return {
        "show_reminder": hours_diff >= 72,
        "hours_since_last": round(hours_diff, 1)
    }

# ================= STATS & DASHBOARD =================

@api_router.get("/campaigns/{campaign_id}/stats")
async def get_campaign_stats(campaign_id: str, user: dict = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    members = await db.campaign_members.find(
        {"campaign_id": campaign_id, "role": "clipper"},
        {"_id": 0}
    ).to_list(100)
    
    # Mock stats for MVP
    total_views = 0
    clipper_stats = []
    
    for i, member in enumerate(members):
        views = (i + 1) * 15000  # Mock views
        earnings = (views / 1000) * campaign["rpm"]
        clipper_stats.append({
            "user_id": member["user_id"],
            "views": views,
            "earnings": round(earnings, 2),
            "strikes": member.get("strikes", 0),
            "rank": i + 1
        })
        total_views += views
    
    return {
        "campaign_id": campaign_id,
        "total_views": total_views,
        "budget_used": campaign.get("budget_used", 0),
        "budget_total": campaign.get("budget_total"),
        "clipper_count": len(members),
        "clipper_stats": sorted(clipper_stats, key=lambda x: x["views"], reverse=True)
    }

@api_router.get("/clipper/stats")
async def get_clipper_stats(user: dict = Depends(get_current_user)):
    if user.get("role") != "clipper":
        raise HTTPException(status_code=403, detail="Clippers only")
    
    memberships = await db.campaign_members.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    
    total_earnings = 0
    campaign_stats = []
    
    for membership in memberships:
        campaign = await db.campaigns.find_one(
            {"campaign_id": membership["campaign_id"]},
            {"_id": 0}
        )
        if campaign:
            views = 25000  # Mock
            earnings = (views / 1000) * campaign["rpm"]
            total_earnings += earnings
            campaign_stats.append({
                "campaign_id": campaign["campaign_id"],
                "campaign_name": campaign["name"],
                "views": views,
                "earnings": round(earnings, 2),
                "strikes": membership.get("strikes", 0)
            })
    
    return {
        "total_earnings": round(total_earnings, 2),
        "campaign_stats": campaign_stats
    }

# ================= SETTINGS =================

@api_router.put("/settings")
async def update_settings(settings: dict, user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"settings": settings}}
    )
    return {"message": "Settings updated"}

@api_router.put("/profile")
async def update_profile(profile_data: dict, user: dict = Depends(get_current_user)):
    update_fields = {}
    if "display_name" in profile_data:
        update_fields["display_name"] = profile_data["display_name"]
    
    if update_fields:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": update_fields}
        )
    
    updated_user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return updated_user

# ================= WEBSOCKET =================

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)

# ================= HEALTH & ROOT =================

@api_router.get("/")
async def root():
    return {"message": "The Clip Deal Track API"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
