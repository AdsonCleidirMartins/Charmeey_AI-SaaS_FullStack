from fastapi import FastAPI, HTTPException, Header, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
import io
import base64
import secrets
import hashlib
import hmac
import tempfile
import asyncio
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import create_engine, Column, String, Integer, Boolean, DateTime, ForeignKey, Text, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session as SASession
from sqlalchemy.sql import func

import google.generativeai as genai

# ---------------------------------------------------------------------------
# Application setup
# ---------------------------------------------------------------------------
app = FastAPI(title="AI-Powered SaaS Python Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Database (PostgreSQL)
# ---------------------------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:123qweASD%21%40%23@localhost:5432/perfect_ai_saas")

engine = create_engine(DATABASE_URL, echo=False)
Base = declarative_base()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    token = Column(String(64), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=False)


class RoomMessage(Base):
    __tablename__ = "room_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    name = Column(String(120), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DirectMessage(Base):
    __tablename__ = "direct_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sender_id = Column(Integer, nullable=False, index=True)
    recipient_id = Column(Integer, nullable=False, index=True)
    sender_name = Column(String(120), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    kind = Column(String(40), nullable=False, default="dm")
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=True)
    sender_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


Base.metadata.create_all(bind=engine)


def get_db() -> SASession:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Password hashing + session helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, digest = stored.split("$", 1)
    except ValueError:
        return False
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000).hex()
    return hmac.compare_digest(candidate, digest)


def create_session(db: SASession, user_id: int, days: int = 30) -> str:
    token = secrets.token_hex(32)
    db.add(AuthSession(token=token, user_id=user_id, expires_at=datetime.utcnow() + timedelta(days=days)))
    db.commit()
    return token


def resolve_user(db: SASession, authorization: Optional[str]) -> Optional[dict]:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    session = db.query(AuthSession).filter(AuthSession.token == token.strip()).first()
    if not session or session.expires_at < datetime.utcnow():
        return None
    user = db.query(User).filter(User.id == session.user_id).first()
    if not user:
        return None
    return {
        "id": user.id,
        "name": user.name or "Guest",
        "email": user.email,
        "is_demo": user.is_demo,
    }


def public_user(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name or "",
        "email": user.email,
        "is_demo": user.is_demo,
    }


# ---------------------------------------------------------------------------
# Pydantic request/response models
# ---------------------------------------------------------------------------
class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class SigninRequest(BaseModel):
    email: str
    password: str


class SignoutRequest(BaseModel):
    token: str


class AuthResponse(BaseModel):
    token: str
    user: dict


class MeResponse(BaseModel):
    authenticated: bool
    user: Optional[dict] = None


class GenerateRequest(BaseModel):
    prompt: str
    system: Optional[str] = None
    image_data: Optional[str] = None
    image_mime: Optional[str] = None
    file_data: Optional[str] = None
    file_name: Optional[str] = None


class GenerateResponse(BaseModel):
    response: str
    model: str


class DocumentChunkRequest(BaseModel):
    text: str
    chunk_size: Optional[int] = 500
    overlap: Optional[int] = 50


class ChunkResponse(BaseModel):
    chunks: List[str]


class RoomPostRequest(BaseModel):
    content: str


class RoomDeleteRequest(BaseModel):
    ids: List[int]


class DmDeleteRequest(BaseModel):
    ids: List[int]


class DirectMessagePostRequest(BaseModel):
    content: str
    recipient_id: int


class EmbeddingRequest(BaseModel):
    texts: List[str]


class EmbeddingResponse(BaseModel):
    embeddings: List[List[float]]


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.get("/health")
def health_check(db: SASession = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception:
        db_status = "unavailable"
    return {"status": "healthy", "database": db_status}


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
def normalize_email(email: str) -> str:
    return email.strip().lower()


@app.post("/api/v1/auth/signup", response_model=AuthResponse)
def signup(req: SignupRequest, db: SASession = Depends(get_db)):
    email = normalize_email(req.email)
    if not req.name.strip() or not email or not req.password:
        raise HTTPException(status_code=400, detail="Name, email, and password are required.")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = User(name=req.name.strip(), email=email, password_hash=hash_password(req.password), is_demo=False)
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_session(db, user.id)
    return {"token": token, "user": public_user(user)}


@app.post("/api/v1/auth/signin", response_model=AuthResponse)
def signin(req: SigninRequest, db: SASession = Depends(get_db)):
    email = normalize_email(req.email)
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.password_hash or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_session(db, user.id)
    return {"token": token, "user": public_user(user)}


@app.post("/api/v1/auth/signout")
def signout(req: SignoutRequest, db: SASession = Depends(get_db)):
    db.query(AuthSession).filter(AuthSession.token == req.token.strip()).delete()
    db.commit()
    return {"ok": True}


@app.post("/api/v1/auth/demo", response_model=AuthResponse)
def demo_access(db: SASession = Depends(get_db)):
    demo_email = "demo@charmeeyai.app"
    demo = db.query(User).filter(User.email == demo_email).first()
    if not demo:
        demo = User(name="Demo User", email=demo_email, password_hash=None, is_demo=True)
        db.add(demo)
        db.commit()
        db.refresh(demo)
    token = create_session(db, demo.id, days=1)
    return {"token": token, "user": public_user(demo)}


@app.get("/api/v1/auth/me", response_model=MeResponse)
def me(authorization: Optional[str] = Header(None), db: SASession = Depends(get_db)):
    user = resolve_user(db, authorization)
    if not user:
        return {"authenticated": False, "user": None}
    return {"authenticated": True, "user": user}


# ---------------------------------------------------------------------------
# Gemini AI chat (accessible to demo + signed-in users)
# ---------------------------------------------------------------------------
# AI provider config
# ---------------------------------------------------------------------------
ALLOWED_MODELS = ["gemini-3.5-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"]
DEFAULT_MODEL = "gemini-3.5-flash"

# OpenAI-compatible providers. Order = fallback priority.
# Each entry: (key env var, base url env var, model env var, label)
OPENAI_PROVIDERS = [
    ("OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_MODEL", "gpt-4o-mini"),
    ("GROQ_API_KEY", "GROQ_BASE_URL", "GROQ_MODEL", "openai/gpt-oss-20b"),
    ("OPENROUTER_API_KEY", "OPENROUTER_BASE_URL", "OPENROUTER_MODEL", "openai/gpt-4o-mini"),
]
OPENAI_DEFAULT_BASE_URLS = {
    "OPENAI_.*": "https://api.openai.com/v1",
    "GROQ_.*": "https://api.groq.com/openai/v1",
    "OPENROUTER_.*": "https://openrouter.ai/api/v1",
}


def _is_blocked(e: Exception) -> bool:
    text = str(e).lower()
    return (
        "403" in text
        or "401" in text
        or "429" in text
        or "ratelimit" in text
        or "quota" in text
        or "credit" in text
        or "permission" in text
        or "access denied" in text
        or "denied access" in text
        or "not found" in text
    )


def _openai_base_url(key_env: str) -> Optional[str]:
    explicit = os.getenv(
        {
            "OPENAI_API_KEY": "OPENAI_BASE_URL",
            "GROQ_API_KEY": "GROQ_BASE_URL",
            "OPENROUTER_API_KEY": "OPENROUTER_BASE_URL",
        }.get(key_env, "")
    )
    if explicit:
        return explicit
    if key_env == "OPENAI_API_KEY":
        return "https://api.openai.com/v1"
    if key_env == "GROQ_API_KEY":
        return "https://api.groq.com/openai/v1"
    if key_env == "OPENROUTER_API_KEY":
        return "https://openrouter.ai/api/v1"
    return None


def _call_openai(api_key: str, model: str, system: str, parts: List[object], base_url: Optional[str] = None) -> str:
    try:
        from openai import OpenAI
    except ImportError:
        raise RuntimeError("openai package not installed.")
    client_kwargs: Dict[str, object] = {"api_key": api_key}
    if base_url:
        client_kwargs["base_url"] = base_url
    client = OpenAI(**client_kwargs)
    content: List[object] = []
    prompt = ""
    image = None
    for part in parts:
        if isinstance(part, str):
            prompt = part
        elif isinstance(part, dict) and part.get("kind") == "image":
            image = part
        else:
            pass  # generic file uploads: OpenAI chat cannot ingest; handled elsewhere
    text_block: Dict[str, object] = {"type": "text", "text": prompt or "Describe this file."}
    if image:
        mime = image.get("mime") or "image/png"
        content = [
            text_block,
            {
                "type": "image_url",
                "image_url": {"url": f"data:{mime};base64,{image['data']}"},
            },
        ]
    else:
        content = [text_block]
    messages: List[Dict[str, object]] = []
    if system and system.strip():
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": content})
    resp = client.chat.completions.create(model=model, messages=messages)
    return resp.choices[0].message.content or ""


@app.post("/api/v1/generate", response_model=GenerateResponse)
def generate_ai_response(req: GenerateRequest, authorization: Optional[str] = Header(None), db: SASession = Depends(get_db)):
    user = resolve_user(db, authorization)  # validates session; demo token also resolves
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is required.")

    try:
        gemini_key = os.getenv("GEMINI_API_KEY")

        # Build provider-neutral parts for image/file uploads
        image_part = None
        file_part = None
        if req.image_data:
            image_part = {"kind": "image", "data": req.image_data, "mime": req.image_mime or "image/png"}
        elif req.file_data:
            file_part = {
                "kind": "file",
                "data": req.file_data,
                "name": req.file_name or "upload.bin",
            }

        last_error: Optional[Exception] = None
        used_model = "unknown"

        # 1) OpenAI-compatible providers: text + images. Raw files need Gemini.
        if not file_part:
            for key_env, base_env, model_env, default_model in OPENAI_PROVIDERS:
                api_key = os.getenv(key_env)
                if not api_key:
                    continue
                model = os.getenv(model_env, default_model)
                try:
                    text = _call_openai(
                        api_key,
                        model,
                        req.system or "",
                        [req.prompt] + ([image_part] if image_part else []),
                        base_url=_openai_base_url(key_env),
                    )
                    return {"response": text, "model": model}
                except Exception as e:
                    last_error = e
                    used_model = model

        # 2) Gemini fallback (required for raw files; also used when no provider worked).
        if gemini_key:
            try:
                genai.configure(api_key=gemini_key)
            except Exception:
                pass
            kwargs = {}
            if req.system and req.system.strip():
                kwargs["system_instruction"] = req.system.strip()

            parts: List[object] = [req.prompt]
            if image_part:
                image_bytes = base64.b64decode(image_part["data"])
                from PIL import Image

                parts.append(Image.open(io.BytesIO(image_bytes)))
            elif file_part:
                file_bytes = base64.b64decode(file_part["data"])
                name = file_part["name"]
                with tempfile.NamedTemporaryFile(suffix="_" + os.path.basename(name), delete=False) as tmp:
                    tmp.write(file_bytes)
                    tmp_path = tmp.name
                try:
                    uploaded = genai.upload_file(tmp_path, display_name=name)
                    parts = [uploaded, req.prompt]
                finally:
                    os.unlink(tmp_path)

            # Try the default model first, then fall back down the allowed list
            # when a model is blocked (403 / denied access / not found).
            for candidate in [DEFAULT_MODEL] + [m for m in ALLOWED_MODELS if m != DEFAULT_MODEL]:
                try:
                    genai.configure(api_key=gemini_key)
                    model = genai.GenerativeModel(candidate, **kwargs)
                    result = model.generate_content(parts)
                    return {"response": result.text, "model": candidate}
                except Exception as e:
                    last_error = e
                    used_model = candidate
                    if _is_blocked(e):
                        continue
                    raise

        if last_error:
            raise last_error
        raise HTTPException(status_code=500, detail="No AI provider is configured. Add OPENAI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, or GEMINI_API_KEY.")
    except Exception as e:
        detail = str(e).splitlines()[0][:200] if str(e) else "Unknown error"
        fallback_text = (
            f"I hit a temporary snag while processing that request ({used_model}). "
            f"Please try again in a moment. "
            f"[{detail}]"
        )
        return {"response": fallback_text, "model": used_model}


# ---------------------------------------------------------------------------
# Demo / authenticated user data stubs
# ---------------------------------------------------------------------------
@app.get("/api/v1/me/history")
def get_history(authorization: Optional[str] = Header(None), db: SASession = Depends(get_db)):
    user = resolve_user(db, authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Sign in required.")
    return {"items": [], "is_demo": user["is_demo"]}


# ---------------------------------------------------------------------------
# Community chat room (real-time via WebSocket, REST fallback)
# ---------------------------------------------------------------------------
def room_display_name(user: dict) -> str:
    if user["is_demo"]:
        return f"Demo User {user['id']}"
    return user["name"] or "User"


def serialize_message(row: RoomMessage) -> dict:
    return {
        "id": row.id,
        "user_id": row.user_id,
        "name": row.name,
        "content": row.message,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


class RoomManager:
    def __init__(self) -> None:
        self.active: Dict[WebSocket, dict] = {}

    def presence_payload(self) -> dict:
        users = [{"id": m["id"], "name": m["name"]} for m in self.active.values()]
        return {"type": "presence", "online": len(self.active), "users": users}

    async def broadcast(self, payload: dict) -> None:
        peers = list(self.active)
        dead: List[WebSocket] = []

        async def send_one(ws: WebSocket) -> None:
            try:
                await asyncio.wait_for(ws.send_json(payload), timeout=3)
            except Exception:
                dead.append(ws)

        await asyncio.gather(*(send_one(ws) for ws in peers))
        for ws in dead:
            self.active.pop(ws, None)
        if dead and self.active:
            await self.broadcast({"type": "presence", "online": len(self.active)})

    async def connect(self, ws: WebSocket, meta: dict) -> None:
        self.active[ws] = meta
        await self.broadcast(self.presence_payload())

    def disconnect(self, ws: WebSocket) -> None:
        self.active.pop(ws, None)

    async def send_to_user(self, user_id: int, payload: dict) -> None:
        targets = [ws for ws, m in self.active.items() if m.get("id") == user_id]
        dead: List[WebSocket] = []

        async def send_one(ws: WebSocket) -> None:
            try:
                await asyncio.wait_for(ws.send_json(payload), timeout=3)
            except Exception:
                dead.append(ws)

        await asyncio.gather(*(send_one(ws) for ws in targets))
        for ws in dead:
            self.active.pop(ws, None)


room_manager = RoomManager()


@app.get("/api/v1/room/messages")
def room_history(limit: int = 50, db: SASession = Depends(get_db)):
    rows = db.query(RoomMessage).order_by(RoomMessage.id.desc()).limit(max(1, min(limit, 200))).all()
    rows.reverse()
    users = [{"id": m["id"], "name": m["name"]} for m in room_manager.active.values()]
    return {"messages": [serialize_message(r) for r in rows], "online": len(room_manager.active), "users": users}


@app.post("/api/v1/room/messages")
async def room_post(req: RoomPostRequest, authorization: Optional[str] = Header(None), db: SASession = Depends(get_db)):
    user = resolve_user(db, authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Sign in required.")
    content = req.content.strip()
    if not content or len(content) > 14_000_000:
        raise HTTPException(status_code=400, detail="Message must be between 1 and 14,000,000 characters.")

    message = RoomMessage(user_id=user["id"], name=room_display_name(user), message=content)
    db.add(message)
    db.commit()
    db.refresh(message)

    await room_manager.broadcast({"type": "message", **serialize_message(message)})
    return serialize_message(message)


@app.delete("/api/v1/room/messages")
async def room_delete(req: RoomDeleteRequest, authorization: Optional[str] = Header(None), db: SASession = Depends(get_db)):
    user = resolve_user(db, authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Sign in required.")
    ids = list(dict.fromkeys(req.ids))
    if not ids:
        return {"ok": True, "deleted": []}
    rows = (
        db.query(RoomMessage)
        .filter(RoomMessage.id.in_(ids), RoomMessage.user_id == user["id"])
        .all()
    )
    deleted_ids = [r.id for r in rows]
    if not deleted_ids:
        return {"ok": True, "deleted": []}
    db.query(RoomMessage).filter(RoomMessage.id.in_(deleted_ids)).delete(synchronize_session=False)
    db.commit()
    await room_manager.broadcast({"type": "deleted", "ids": deleted_ids})
    return {"ok": True, "deleted": deleted_ids}


@app.delete("/api/v1/room/messages/all")
async def room_delete_all(authorization: Optional[str] = Header(None), db: SASession = Depends(get_db)):
    user = resolve_user(db, authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Sign in required.")
    rows = db.query(RoomMessage).filter(RoomMessage.user_id == user["id"]).all()
    deleted_ids = [r.id for r in rows]
    if not deleted_ids:
        return {"ok": True, "deleted": []}
    db.query(RoomMessage).filter(RoomMessage.user_id == user["id"]).delete(synchronize_session=False)
    db.commit()
    await room_manager.broadcast({"type": "deleted", "ids": deleted_ids})
    return {"ok": True, "deleted": deleted_ids}


@app.websocket("/ws/room")
async def room_ws(ws: WebSocket, token: Optional[str] = None):
    db = SessionLocal()
    try:
        user = resolve_user(db, f"Bearer {token}" if token else None)
        if not user:
            await ws.close(code=1008)
            return

        name = room_display_name(user)
        await ws.accept()
        await room_manager.connect(ws, {"id": user["id"], "name": name})

        while True:
            data = await ws.receive_json()
            kind = data.get("type", "message")

            if kind == "dm":
                recipient_id = int(data.get("to", 0) or 0)
                content = str(data.get("content", "")).strip()
                if not recipient_id or not content or len(content) > 4000:
                    continue
                target = db.query(User).filter(User.id == recipient_id).first()
                if not target:
                    continue
                dm = DirectMessage(
                    sender_id=user["id"],
                    recipient_id=recipient_id,
                    sender_name=name,
                    content=content,
                )
                db.add(dm)
                db.commit()
                db.refresh(dm)
                notification = Notification(
                    user_id=recipient_id,
                    kind="dm",
                    title=f"New direct message from {name}",
                    body=content[:200],
                    sender_id=user["id"],
                )
                db.add(notification)
                db.commit()
                await notification_manager.send_to_user(
                    recipient_id,
                    {"type": "notification", "notification": serialize_notification(notification)},
                )
                await room_manager.send_to_user(recipient_id, {"type": "dm", "message": serialize_dm(dm)})
                await ws.send_json({"type": "dm_ack", **serialize_dm(dm)})
                continue

            content = str(data.get("content", "")).strip()
            if not content or len(content) > 14_000_000:
                continue

            message = RoomMessage(user_id=user["id"], name=name, message=content)
            db.add(message)
            db.commit()
            db.refresh(message)

            await room_manager.broadcast({"type": "message", **serialize_message(message)})
    except WebSocketDisconnect:
        room_manager.disconnect(ws)
    except Exception:
        room_manager.disconnect(ws)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Direct messages (1:1) + Notifications
# ---------------------------------------------------------------------------
class NotificationManager:
    def __init__(self) -> None:
        self.peers: Dict[WebSocket, int] = {}

    async def send_to_user(self, user_id: int, payload: dict) -> None:
        for ws, uid in list(self.peers.items()):
            if uid == user_id:
                try:
                    await asyncio.wait_for(ws.send_json(payload), timeout=3)
                except Exception:
                    self.peers.pop(ws, None)


notification_manager = NotificationManager()


def serialize_dm(row: DirectMessage) -> dict:
    return {
        "id": row.id,
        "sender_id": row.sender_id,
        "recipient_id": row.recipient_id,
        "name": row.sender_name,
        "content": row.content,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def serialize_notification(row: Notification) -> dict:
    return {
        "id": row.id,
        "kind": row.kind,
        "title": row.title,
        "body": row.body,
        "sender_id": row.sender_id,
        "is_read": row.is_read,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@app.get("/api/v1/users")
def list_users(q: Optional[str] = None, authorization: Optional[str] = Header(None), db: SASession = Depends(get_db)):
    me = resolve_user(db, authorization)
    if not me:
        raise HTTPException(status_code=401, detail="Sign in required.")
    query = db.query(User).filter(User.is_demo.is_(False)).order_by(User.name.asc())
    if q and q.strip():
        pat = f"%{q.strip()}%"
        query = query.filter(User.name.ilike(pat) | User.email.ilike(pat))
    users = query.limit(100).all()
    return {"users": [public_user(u) for u in users if u.id != me["id"]]}


@app.get("/api/v1/dm/conversations")
def dm_conversations(authorization: Optional[str] = Header(None), db: SASession = Depends(get_db)):
    me = resolve_user(db, authorization)
    if not me:
        raise HTTPException(status_code=401, detail="Sign in required.")
    rows = (
        db.query(DirectMessage)
        .filter((DirectMessage.sender_id == me["id"]) | (DirectMessage.recipient_id == me["id"]))
        .order_by(DirectMessage.id.desc())
        .limit(200)
        .all()
    )
    convos: Dict[int, dict] = {}
    for row in reversed(rows):
        peer_id = row.sender_id if row.sender_id != me["id"] else row.recipient_id
        if peer_id in convos:
            continue
        peer = db.query(User).filter(User.id == peer_id).first()
        convos[peer_id] = {
            "peer_id": peer_id,
            "peer_name": (peer.name if peer else "User") or "User",
            "last_message": row.content,
            "last_at": row.created_at.isoformat() if row.created_at else None,
        }
    return {"conversations": list(convos.values())}


@app.get("/api/v1/dm/{peer_id}/messages")
def dm_messages(peer_id: int, authorization: Optional[str] = Header(None), db: SASession = Depends(get_db)):
    me = resolve_user(db, authorization)
    if not me:
        raise HTTPException(status_code=401, detail="Sign in required.")
    rows = (
        db.query(DirectMessage)
        .filter(
            ((DirectMessage.sender_id == me["id"]) & (DirectMessage.recipient_id == peer_id))
            | ((DirectMessage.sender_id == peer_id) & (DirectMessage.recipient_id == me["id"]))
        )
        .order_by(DirectMessage.id.asc())
        .limit(200)
        .all()
    )
    unseen = (
        db.query(Notification)
        .filter(
            Notification.user_id == me["id"],
            Notification.sender_id == peer_id,
            Notification.is_read.is_(False),
        )
        .update({Notification.is_read: True})
    )
    if unseen:
        db.commit()
    return {"messages": [serialize_dm(r) for r in rows]}


@app.post("/api/v1/dm/send")
async def dm_send(req: DirectMessagePostRequest, authorization: Optional[str] = Header(None), db: SASession = Depends(get_db)):
    me = resolve_user(db, authorization)
    if not me:
        raise HTTPException(status_code=401, detail="Sign in required.")
    content = req.content.strip()
    if not content or len(content) > 4000:
        raise HTTPException(status_code=400, detail="Message must be between 1 and 4000 characters.")
    target = db.query(User).filter(User.id == req.recipient_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    dm = DirectMessage(
        sender_id=me["id"],
        recipient_id=req.recipient_id,
        sender_name=me["name"] or "User",
        content=content,
    )
    db.add(dm)
    db.commit()
    db.refresh(dm)

    notification = Notification(
        user_id=req.recipient_id,
        kind="dm",
        title=f"New direct message from {me['name'] or 'User'}",
        body=content[:200],
        sender_id=me["id"],
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    await notification_manager.send_to_user(
        req.recipient_id,
        {"type": "notification", "notification": serialize_notification(notification)},
    )
    await room_manager.send_to_user(req.recipient_id, {"type": "dm", "message": serialize_dm(dm)})
    return serialize_dm(dm)


@app.delete("/api/v1/dm/messages")
async def dm_delete(req: DmDeleteRequest, authorization: Optional[str] = Header(None), db: SASession = Depends(get_db)):
    me = resolve_user(db, authorization)
    if not me:
        raise HTTPException(status_code=401, detail="Sign in required.")
    ids = list(dict.fromkeys(req.ids))
    if not ids:
        return {"ok": True, "deleted": []}
    rows = db.query(DirectMessage).filter(DirectMessage.id.in_(ids), DirectMessage.sender_id == me["id"]).all()
    deleted_ids = [r.id for r in rows]
    peer_ids = set({r.recipient_id for r in rows})
    if not deleted_ids:
        return {"ok": True, "deleted": []}
    db.query(DirectMessage).filter(DirectMessage.id.in_(deleted_ids)).delete(synchronize_session=False)
    db.commit()
    for peer_id in peer_ids:
        await room_manager.send_to_user(peer_id, {"type": "dm_deleted", "ids": deleted_ids, "peer_id": me["id"]})
    return {"ok": True, "deleted": deleted_ids}


@app.delete("/api/v1/dm/messages/all")
async def dm_delete_all(peer_id: int, authorization: Optional[str] = Header(None), db: SASession = Depends(get_db)):
    me = resolve_user(db, authorization)
    if not me:
        raise HTTPException(status_code=401, detail="Sign in required.")
    rows = (
        db.query(DirectMessage)
        .filter(DirectMessage.sender_id == me["id"], DirectMessage.recipient_id == peer_id)
        .all()
    )
    deleted_ids = [r.id for r in rows]
    if not deleted_ids:
        return {"ok": True, "deleted": []}
    db.query(DirectMessage).filter(DirectMessage.id.in_(deleted_ids)).delete(synchronize_session=False)
    db.commit()
    await room_manager.send_to_user(peer_id, {"type": "dm_deleted", "ids": deleted_ids, "peer_id": me["id"]})
    return {"ok": True, "deleted": deleted_ids}


@app.get("/api/v1/notifications")
def notifications(authorization: Optional[str] = Header(None), db: SASession = Depends(get_db)):
    me = resolve_user(db, authorization)
    if not me:
        raise HTTPException(status_code=401, detail="Sign in required.")
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == me["id"])
        .order_by(Notification.id.desc())
        .limit(100)
        .all()
    )
    return {"notifications": [serialize_notification(r) for r in rows]}


@app.delete("/api/v1/notifications/{notification_id}")
def delete_notification(notification_id: int, authorization: Optional[str] = Header(None), db: SASession = Depends(get_db)):
    me = resolve_user(db, authorization)
    if not me:
        raise HTTPException(status_code=401, detail="Sign in required.")
    row = db.query(Notification).filter(Notification.id == notification_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Notification not found.")
    if row.user_id != me["id"]:
        raise HTTPException(status_code=403, detail="Not your notification.")
    db.delete(row)
    db.commit()
    return {"ok": True}


@app.websocket("/ws/notifications")
async def notifications_ws(ws: WebSocket, token: Optional[str] = None):
    db = SessionLocal()
    try:
        user = resolve_user(db, f"Bearer {token}" if token else None)
        if not user:
            await ws.close(code=1008)
            return
        await ws.accept()
        notification_manager.peers[ws] = user["id"]
        try:
            while True:
                await ws.receive_text()
        except WebSocketDisconnect:
            pass
        finally:
            notification_manager.peers.pop(ws, None)
    except Exception:
        notification_manager.peers.pop(ws, None)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Existing utility endpoints
# ---------------------------------------------------------------------------
@app.post("/api/v1/chunk", response_model=ChunkResponse)
def chunk_document(req: DocumentChunkRequest):
    text = req.text
    chunk_size = req.chunk_size
    overlap = req.overlap

    if not text:
        return {"chunks": []}

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap

    return {"chunks": chunks}


@app.post("/api/v1/embeddings", response_model=EmbeddingResponse)
def generate_embeddings(req: EmbeddingRequest):
    dim = 1536
    mock_embeddings = [[float(i % 10) / 10.0 for i in range(dim)] for _ in req.texts]
    return {"embeddings": mock_embeddings}