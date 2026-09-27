from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import re
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from urllib.parse import urlparse

import jwt
import bcrypt
import requests
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, Header, Query
from fastapi.responses import Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

# ---------- DB ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ---------- App ----------
app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

JWT_ALGORITHM = "HS256"
RESERVED_USERNAMES = {"api", "login", "signup", "dashboard", "admin", "public", "assets", "static", "auth", "me", "files"}
MAX_LINKS = 20

# ---------- Object storage ----------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "sololink"
storage_key = None


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------- Auth helpers ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------- Serializers ----------
def public_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "email": user.get("email"),
        "username": user.get("username"),
        "display_name": user.get("display_name") or "",
        "bio": user.get("bio") or "",
        "avatar_path": user.get("avatar_path"),
    }


def serialize_link(link: dict) -> dict:
    return {
        "id": link["id"],
        "title": link["title"],
        "url": link["url"],
        "order": link["order"],
    }


# ---------- Validation ----------
USERNAME_RE = re.compile(r"^[a-z0-9_]{3,30}$")


def normalize_and_validate_url(raw: str) -> str:
    raw = (raw or "").strip()
    if not raw:
        raise HTTPException(status_code=400, detail="URL cannot be empty.")
    if not re.match(r"^https?://", raw, re.IGNORECASE):
        raw = "https://" + raw
    parsed = urlparse(raw)
    if parsed.scheme not in ("http", "https") or not parsed.netloc or "." not in parsed.netloc:
        raise HTTPException(status_code=400, detail="Please enter a valid URL (e.g. https://example.com).")
    return raw


# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    username: str
    display_name: Optional[str] = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdateIn(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    username: Optional[str] = None


class LinkIn(BaseModel):
    title: str
    url: str


class LinkUpdateIn(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None


class ReorderIn(BaseModel):
    ordered_ids: List[str]


# ---------- Auth routes ----------
@api_router.post("/auth/register")
async def register(body: RegisterIn):
    email = body.email.lower().strip()
    username = body.username.lower().strip()
    if not USERNAME_RE.match(username):
        raise HTTPException(status_code=400, detail="Username must be 3-30 chars, letters, numbers or underscores.")
    if username in RESERVED_USERNAMES:
        raise HTTPException(status_code=400, detail="That username is reserved. Please choose another.")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    if await db.users.find_one({"username": username}):
        raise HTTPException(status_code=400, detail="That username is already taken.")
    doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "username": username,
        "display_name": (body.display_name or username).strip(),
        "bio": "",
        "avatar_path": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    token = create_access_token(str(result.inserted_id), email)
    return {"token": token, "user": public_user(doc)}


@api_router.post("/auth/login")
async def login(body: LoginIn):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_access_token(str(user["_id"]), email)
    return {"token": token, "user": public_user(user)}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": public_user(user)}


@api_router.get("/auth/check-username")
async def check_username(username: str = Query(...)):
    username = username.lower().strip()
    if not USERNAME_RE.match(username) or username in RESERVED_USERNAMES:
        return {"available": False, "valid": False}
    exists = await db.users.find_one({"username": username})
    return {"available": exists is None, "valid": True}


# ---------- Profile routes ----------
@api_router.put("/profile")
async def update_profile(body: ProfileUpdateIn, user: dict = Depends(get_current_user)):
    updates = {}
    if body.display_name is not None:
        updates["display_name"] = body.display_name.strip()
    if body.bio is not None:
        if len(body.bio) > 160:
            raise HTTPException(status_code=400, detail="Bio must be 160 characters or fewer.")
        updates["bio"] = body.bio.strip()
    if body.username is not None:
        new_username = body.username.lower().strip()
        if new_username != user["username"]:
            if not USERNAME_RE.match(new_username):
                raise HTTPException(status_code=400, detail="Username must be 3-30 chars, letters, numbers or underscores.")
            if new_username in RESERVED_USERNAMES:
                raise HTTPException(status_code=400, detail="That username is reserved.")
            if await db.users.find_one({"username": new_username}):
                raise HTTPException(status_code=400, detail="That username is already taken.")
            updates["username"] = new_username
    if updates:
        await db.users.update_one({"_id": user["_id"]}, {"$set": updates})
    fresh = await db.users.find_one({"_id": user["_id"]})
    return {"user": public_user(fresh)}


@api_router.post("/profile/avatar")
async def upload_avatar(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file.")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be smaller than 5MB.")
    ext = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else "png"
    path = f"{APP_NAME}/avatars/{str(user['_id'])}/{uuid.uuid4()}.{ext}"
    result = put_object(path, data, file.content_type or "image/png")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"avatar_path": result["path"]}})
    return {"avatar_path": result["path"]}


@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    try:
        data, content_type = get_object(path)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    return Response(content=data, media_type=content_type, headers={"Cache-Control": "public, max-age=86400"})


# ---------- Link routes ----------
@api_router.get("/links")
async def get_links(user: dict = Depends(get_current_user)):
    links = await db.links.find({"user_id": str(user["_id"])}).sort("order", 1).to_list(100)
    return {"links": [serialize_link(l) for l in links]}


@api_router.post("/links")
async def add_link(body: LinkIn, user: dict = Depends(get_current_user)):
    title = (body.title or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Link title cannot be empty.")
    if len(title) > 80:
        raise HTTPException(status_code=400, detail="Title must be 80 characters or fewer.")
    url = normalize_and_validate_url(body.url)
    count = await db.links.count_documents({"user_id": str(user["_id"])})
    if count >= MAX_LINKS:
        raise HTTPException(status_code=400, detail=f"You can add up to {MAX_LINKS} links only.")
    link = {
        "id": str(uuid.uuid4()),
        "user_id": str(user["_id"]),
        "title": title,
        "url": url,
        "order": count,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.links.insert_one(link)
    return {"link": serialize_link(link)}


@api_router.put("/links/{link_id}")
async def update_link(link_id: str, body: LinkUpdateIn, user: dict = Depends(get_current_user)):
    link = await db.links.find_one({"id": link_id})
    if not link:
        raise HTTPException(status_code=404, detail="Link not found.")
    if link["user_id"] != str(user["_id"]):
        raise HTTPException(status_code=403, detail="You can only edit your own links.")
    updates = {}
    if body.title is not None:
        title = body.title.strip()
        if not title:
            raise HTTPException(status_code=400, detail="Link title cannot be empty.")
        updates["title"] = title
    if body.url is not None:
        updates["url"] = normalize_and_validate_url(body.url)
    if updates:
        await db.links.update_one({"id": link_id}, {"$set": updates})
    fresh = await db.links.find_one({"id": link_id})
    return {"link": serialize_link(fresh)}


@api_router.delete("/links/{link_id}")
async def delete_link(link_id: str, user: dict = Depends(get_current_user)):
    link = await db.links.find_one({"id": link_id})
    if not link:
        raise HTTPException(status_code=404, detail="Link not found.")
    if link["user_id"] != str(user["_id"]):
        raise HTTPException(status_code=403, detail="You can only delete your own links.")
    await db.links.delete_one({"id": link_id})
    # renumber remaining links
    remaining = await db.links.find({"user_id": str(user["_id"])}).sort("order", 1).to_list(100)
    for idx, l in enumerate(remaining):
        if l["order"] != idx:
            await db.links.update_one({"id": l["id"]}, {"$set": {"order": idx}})
    return {"ok": True}


@api_router.put("/links/reorder/all")
async def reorder_links(body: ReorderIn, user: dict = Depends(get_current_user)):
    owned = await db.links.find({"user_id": str(user["_id"])}).to_list(100)
    owned_ids = {l["id"] for l in owned}
    if set(body.ordered_ids) != owned_ids:
        raise HTTPException(status_code=400, detail="Invalid reorder request.")
    for idx, lid in enumerate(body.ordered_ids):
        await db.links.update_one({"id": lid, "user_id": str(user["_id"])}, {"$set": {"order": idx}})
    links = await db.links.find({"user_id": str(user["_id"])}).sort("order", 1).to_list(100)
    return {"links": [serialize_link(l) for l in links]}


# ---------- Public route ----------
@api_router.get("/public/{username}")
async def public_profile(username: str):
    username = username.lower().strip()
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="Username not found.")
    links = await db.links.find({"user_id": str(user["_id"])}).sort("order", 1).to_list(100)
    return {
        "profile": {
            "username": user["username"],
            "display_name": user.get("display_name") or user["username"],
            "bio": user.get("bio") or "",
            "avatar_path": user.get("avatar_path"),
        },
        "links": [serialize_link(l) for l in links],
    }


@api_router.get("/")
async def root():
    return {"message": "SoloLink API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)
    await db.links.create_index("user_id")
    await db.links.create_index("id", unique=True)
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
