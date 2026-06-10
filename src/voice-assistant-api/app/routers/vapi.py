import asyncio
import datetime
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from sqlalchemy.orm import Session
import httpx

from app.database import get_db
from app import models, schemas
from app.config import settings
from app.routers.settings import DEFAULT_SETTINGS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/vapi", tags=["vapi"])

# ─── FIXED: Claude Haiku 4.5 is ALWAYS used — no other model allowed ───────────
CLAUDE_HAIKU_45 = {
    "provider": "anthropic",
    "model": "claude-haiku-4-5-20251001"   # Confirmed exact VAPI model identifier
}

# Map UI voice names to Vapi Azure voices
VOICE_MAP = {
    "en-US-Neural-F": {"provider": "azure", "voiceId": "en-US-JennyNeural"},
    "en-US-Neural-M": {"provider": "azure", "voiceId": "en-US-GuyNeural"},
    "en-GB-Neural-Br": {"provider": "azure", "voiceId": "en-GB-SoniaNeural"},
    "es-ES-Neural-S": {"provider": "azure", "voiceId": "es-ES-ElviraNeural"}
}


def get_active_assistant_config(db: Session):
    """
    Build assistant config for Vapi webhook responses.
    Model is ALWAYS Claude Haiku 4.5 regardless of any saved settings.
    """
    # Fetch agent config for prompts/voice only
    config_setting = db.query(models.ReceptionistSetting).filter(models.ReceptionistSetting.key == "agent_config").first()
    agent_config = config_setting.value if config_setting else DEFAULT_SETTINGS["agent_config"]

    # Fetch FAQ rules
    faq_setting = db.query(models.ReceptionistSetting).filter(models.ReceptionistSetting.key == "faqs").first()
    faqs = faq_setting.value if faq_setting else DEFAULT_SETTINGS["faqs"]

    # Build system prompt
    system_prompt = agent_config.get("systemPrompt", "")

    if faqs:
        faq_text = "\n\nUse the following exact FAQ rules to answer questions if they are asked:\n"
        for faq in faqs:
            faq_text += f"Q: {faq.get('question')}\nA: {faq.get('answer')} (Match type: {faq.get('matchRule')})\n"
        system_prompt += faq_text

    # Resolve voice settings
    voice_name = agent_config.get("voiceName", "en-US-Neural-F")
    voice_resolved = VOICE_MAP.get(voice_name, {"provider": "azure", "voiceId": "en-US-JennyNeural"})

    return {
        "firstMessage": "Hello! Thank you for calling. How can I help you today?",
        "model": {
            "provider": CLAUDE_HAIKU_45["provider"],
            "model": CLAUDE_HAIKU_45["model"],
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                }
            ]
        },
        "voice": voice_resolved
    }


# ─── WEBHOOK ─────────────────────────────────────────────────────────────────

@router.post("/webhook")
async def vapi_webhook(
    request: Request,
    x_vapi_secret: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Central VAPI server URL webhook. Handles:
    - assistant-request: returns Claude Haiku 4.5 dynamic config
    - call-started: records call start, broadcasts SSE event
    - end-of-call-report: saves completed call to database
    """
    # Verify secret token if configured
    if settings.vapi_secret_token and settings.vapi_secret_token != "vapi_secret_token_placeholder":
        if x_vapi_secret != settings.vapi_secret_token:
            logger.warning("Unverified webhook access attempt blocked.")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Vapi secret token")

    payload = await request.json()
    message = payload.get("message", {})
    msg_type = message.get("type")

    logger.info(f"Received VAPI webhook event: {msg_type}")

    # ── 1. Dynamic assistant-request ──────────────────────────────────────────
    if msg_type == "assistant-request":
        logger.info("Responding to assistant-request with Claude Haiku 4.5 config")
        try:
            assistant_payload = get_active_assistant_config(db)
            return {"assistant": assistant_payload}
        except Exception as e:
            logger.error(f"Error building assistant config: {e}")
            return {"assistant": {
                "model": {
                    "provider": "anthropic",
                    "model": "claude-haiku-20240307",
                    "messages": [{"role": "system", "content": "You are a professional receptionist."}]
                }
            }}

    # ── 2. Call started — record in DB and broadcast SSE ──────────────────────
    elif msg_type == "call-started":
        call_data = message.get("call", {})
        vapi_call_id = call_data.get("id")
        customer = call_data.get("customer") or {}
        phone = "Unknown Caller"
        if isinstance(customer, str):
            phone = customer
        elif isinstance(customer, dict):
            phone = customer.get("number", "Unknown Caller")
        monitor = call_data.get("monitor", {})
        listen_url = monitor.get("listenUrl")
        control_url = monitor.get("controlUrl")

        logger.info(f"Call started: {vapi_call_id} from {phone}")

        # Ensure client record exists
        client = db.query(models.Client).filter(models.Client.phone_number == phone).first()
        if not client:
            client = models.Client(
                phone_number=phone,
                name=f"Caller ({phone[-4:] if len(phone) >= 4 else phone})",
                email=f"caller_{phone[-4:] if len(phone) >= 4 else 'unknown'}@example.com"
            )
            db.add(client)
            db.commit()
            db.refresh(client)

        # Create ongoing call record
        # Skip if already exists (idempotency)
        existing = None
        if vapi_call_id:
            existing = db.query(models.Call).filter(models.Call.vapi_call_id == vapi_call_id).first()

        if not existing:
            new_call = models.Call(
                vapi_call_id=vapi_call_id,
                client_id=client.id,
                status="ongoing",
                listen_url=listen_url,
                control_url=control_url,
                start_time=datetime.datetime.now(datetime.timezone.utc)
            )
            db.add(new_call)
            db.commit()
            db.refresh(new_call)
            logger.info(f"Created ongoing call record: {new_call.id}")

        # Broadcast to SSE listeners
        from app.routers.live import broadcast_incoming_call
        await broadcast_incoming_call({
            "type": "call-started",
            "vapiCallId": vapi_call_id,
            "callerPhone": phone,
            "listenUrl": listen_url,
            "controlUrl": control_url,
            "startedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
        })

        return {"status": "recorded"}

    # ── 3. Call ended ─────────────────────────────────────────────────────────
    elif msg_type == "call-ended":
        call_data = message.get("call", {})
        vapi_call_id = call_data.get("id")

        if vapi_call_id:
            call = db.query(models.Call).filter(models.Call.vapi_call_id == vapi_call_id).first()
            if call:
                call.status = "answered"
                call.end_time = datetime.datetime.now(datetime.timezone.utc)
                db.commit()

        # Broadcast call-ended SSE
        from app.routers.live import broadcast_incoming_call
        await broadcast_incoming_call({
            "type": "call-ended",
            "vapiCallId": vapi_call_id,
        })

        return {"status": "updated"}

    # ── 4. End-of-call report — full call data with transcript ────────────────
    elif msg_type == "end-of-call-report":
        call_data = message.get("call", {})
        vapi_call_id = call_data.get("id")
        customer = call_data.get("customer") or {}
        phone = "Unknown Caller"
        if isinstance(customer, str):
            phone = customer
        elif isinstance(customer, dict):
            phone = customer.get("number", "Unknown Caller")

        # Ensure client record
        client = db.query(models.Client).filter(models.Client.phone_number == phone).first()
        if not client:
            client = models.Client(
                phone_number=phone,
                name=f"Caller ({phone[-4:] if len(phone) >= 4 else phone})",
                email=f"caller_{phone[-4:] if len(phone) >= 4 else 'unknown'}@example.com"
            )
            db.add(client)
            db.commit()
            db.refresh(client)

        # Parse timestamps
        started_at = datetime.datetime.now(datetime.timezone.utc)
        ended_at = datetime.datetime.now(datetime.timezone.utc)

        started_at_str = call_data.get("startedAt")
        ended_at_str = call_data.get("endedAt")

        if started_at_str:
            try:
                started_at = datetime.datetime.fromisoformat(started_at_str.replace("Z", "+00:00"))
            except Exception:
                pass
        if ended_at_str:
            try:
                ended_at = datetime.datetime.fromisoformat(ended_at_str.replace("Z", "+00:00"))
            except Exception:
                pass

        duration = int(call_data.get("duration", 0))
        summary = message.get("summary", "Call completed.")
        recording_url = call_data.get("recordingUrl")
        transcript_str = message.get("transcript", "")
        ended_reason = call_data.get("endedReason")

        call_status = "answered"
        if any(k in transcript_str.lower() for k in ["schedule", "pricing", "invoice", "double charge", "discount", "callback"]):
            call_status = "needs-reply"

        # Upsert: update existing ongoing call or create new
        call = None
        if vapi_call_id:
            call = db.query(models.Call).filter(models.Call.vapi_call_id == vapi_call_id).first()

        if call:
            call.end_time = ended_at
            call.duration_seconds = duration
            call.status = call_status
            call.ended_reason = ended_reason
            call.recording_url = recording_url
            call.summary = summary
            call.listen_url = None  # Clear live listen URL once call ends
            call.control_url = None
        else:
            call = models.Call(
                vapi_call_id=vapi_call_id,
                client_id=client.id,
                start_time=started_at,
                end_time=ended_at,
                duration_seconds=duration,
                status=call_status,
                ended_reason=ended_reason,
                recording_url=recording_url,
                summary=summary
            )
            db.add(call)

        db.commit()
        db.refresh(call)

        # Save transcript lines
        if transcript_str:
            # Remove existing transcripts for this call (for upsert)
            db.query(models.Transcript).filter(models.Transcript.call_id == call.id).delete()
            for line in transcript_str.split("\n"):
                line = line.strip()
                if not line:
                    continue
                if ":" in line:
                    speaker, text = line.split(":", 1)
                    db.add(models.Transcript(
                        call_id=call.id,
                        speaker=speaker.strip(),
                        text=text.strip()
                    ))
            db.commit()

        return {"status": "success", "callId": str(call.id)}

    return {"status": "ignored"}


# ─── VAPI API SYNC ENDPOINTS ──────────────────────────────────────────────────

@router.get("/calls")
async def sync_calls_from_vapi(limit: int = 50, db: Session = Depends(get_db)):
    """
    Fetch call history directly from VAPI API and sync to local DB.
    Returns merged data from VAPI + local DB records.
    This is called by the frontend every 20 seconds.
    """
    if not settings.vapi_api_key:
        raise HTTPException(status_code=400, detail="VAPI_API_KEY not configured")

    headers = {"Authorization": f"Bearer {settings.vapi_api_key}"}
    vapi_calls = []

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(
                f"https://api.vapi.ai/call?limit={limit}",
                headers=headers
            )
            if resp.status_code == 200:
                vapi_calls = resp.json()
                if not isinstance(vapi_calls, list):
                    vapi_calls = vapi_calls.get("results", [])
            else:
                logger.error(f"VAPI calls API error: {resp.status_code} {resp.text}")
        except Exception as e:
            logger.error(f"Failed to fetch VAPI calls: {e}")

    # Sync VAPI calls to local DB and return enriched data
    results = []
    for vc in vapi_calls:
        vapi_call_id = vc.get("id")
        customer = vc.get("customer") or {}
        phone = "Unknown Caller"
        if isinstance(customer, str):
            phone = customer
        elif isinstance(customer, dict):
            phone = customer.get("number", "Unknown Caller")
        
        display_phone = phone
        if phone != "Unknown Caller" and len(phone) >= 10:
            display_phone = f"{phone[:-10]} ({phone[-10:-7]}) ***-{phone[-4:]}"
        call_status_vapi = vc.get("status", "")
        ended_reason = vc.get("endedReason", "")

        # Map VAPI status to our status
        if call_status_vapi == "in-progress":
            local_status = "ongoing"
        elif ended_reason in ["customer-ended-call", "assistant-ended-call", "assistant-said-end-call-phrase"]:
            local_status = "answered"
        elif ended_reason in ["customer-did-not-give-microphone-permission", "exceeded-max-duration", "no-answer"]:
            local_status = "missed"
        elif call_status_vapi == "ended":
            local_status = "answered"
        else:
            local_status = "answered"

        # Parse timestamps
        started_at = datetime.datetime.now(datetime.timezone.utc)
        ended_at = None
        started_at_str = vc.get("startedAt")
        ended_at_str = vc.get("endedAt")

        if started_at_str:
            try:
                started_at = datetime.datetime.fromisoformat(started_at_str.replace("Z", "+00:00"))
            except Exception:
                pass
        if ended_at_str:
            try:
                ended_at = datetime.datetime.fromisoformat(ended_at_str.replace("Z", "+00:00"))
            except Exception:
                pass

        duration = vc.get("duration", 0) or 0
        summary = vc.get("analysis", {}).get("summary", "") or vc.get("summary", "") or "Call completed."
        recording_url = vc.get("recordingUrl")
        transcript_str = vc.get("transcript", "")

        # Determine needs-reply
        if any(k in transcript_str.lower() for k in ["schedule", "pricing", "invoice", "discount", "callback"]):
            local_status = "needs-reply"

        monitor = vc.get("monitor", {})
        listen_url = monitor.get("listenUrl") if call_status_vapi == "in-progress" else None
        control_url = monitor.get("controlUrl") if call_status_vapi == "in-progress" else None

        # Ensure client
        client_obj = db.query(models.Client).filter(models.Client.phone_number == phone).first()
        if not client_obj:
            client_obj = models.Client(
                phone_number=phone,
                name=f"Caller ({phone[-4:] if len(phone) >= 4 else phone})",
                email=f"caller_{phone[-4:] if len(phone) >= 4 else 'unknown'}@example.com"
            )
            db.add(client_obj)
            db.commit()
            db.refresh(client_obj)

        # Upsert call
        call = db.query(models.Call).filter(models.Call.vapi_call_id == vapi_call_id).first()
        if not call:
            call = models.Call(
                vapi_call_id=vapi_call_id,
                client_id=client_obj.id,
                start_time=started_at,
                end_time=ended_at,
                duration_seconds=int(duration),
                status=local_status,
                ended_reason=ended_reason,
                recording_url=recording_url,
                summary=summary,
                listen_url=listen_url,
                control_url=control_url
            )
            db.add(call)
            db.commit()
            db.refresh(call)

            # Save transcripts
            if transcript_str:
                for line in transcript_str.split("\n"):
                    line = line.strip()
                    if not line or ":" not in line:
                        continue
                    speaker, text = line.split(":", 1)
                    db.add(models.Transcript(
                        call_id=call.id,
                        speaker=speaker.strip(),
                        text=text.strip()
                    ))
                db.commit()
        else:
            # Update active status fields
            call.status = local_status
            call.listen_url = listen_url
            call.control_url = control_url
            if ended_reason:
                call.ended_reason = ended_reason
            if ended_at:
                call.end_time = ended_at
            if duration:
                call.duration_seconds = int(duration)
            if summary and summary != "Call completed.":
                call.summary = summary
            if recording_url:
                call.recording_url = recording_url
            db.commit()

        # Build response record
        results.append({
            "id": str(call.id),
            "vapiCallId": vapi_call_id,
            "phone": phone,
            "displayPhone": display_phone,
            "email": client_obj.email,
            "status": local_status,
            "endedReason": ended_reason,
            "startTime": started_at.isoformat() if started_at else None,
            "endTime": ended_at.isoformat() if ended_at else None,
            "duration": int(duration),
            "summary": summary,
            "recordingUrl": recording_url,
            "listenUrl": listen_url,
            "controlUrl": control_url,
            "transcript": transcript_str,
            "type": vc.get("type", "inboundPhoneCall"),
        })

    return results


@router.get("/active-calls")
async def get_active_calls():
    """
    Returns calls that are currently in-progress from VAPI API.
    Includes listenUrl for live audio monitoring.
    """
    if not settings.vapi_api_key:
        raise HTTPException(status_code=400, detail="VAPI_API_KEY not configured")

    headers = {"Authorization": f"Bearer {settings.vapi_api_key}"}

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(
                "https://api.vapi.ai/call?status=in-progress&limit=10",
                headers=headers
            )
            if resp.status_code == 200:
                data = resp.json()
                calls = data if isinstance(data, list) else data.get("results", [])
                result = []
                for c in calls:
                    monitor = c.get("monitor", {})
                    customer = c.get("customer", {})
                    result.append({
                        "vapiCallId": c.get("id"),
                        "callerPhone": customer.get("number", "Unknown"),
                        "startedAt": c.get("startedAt"),
                        "status": c.get("status"),
                        "listenUrl": monitor.get("listenUrl"),
                        "controlUrl": monitor.get("controlUrl"),
                    })
                return result
            else:
                logger.error(f"VAPI active calls error: {resp.status_code}")
                return []
        except Exception as e:
            logger.error(f"Failed to fetch active VAPI calls: {e}")
            return []


@router.get("/phone-numbers")
async def get_vapi_phone_numbers():
    """
    Fetches all registered phone numbers from VAPI account.
    Returns number, provider, server URL, and assistant assignment details.
    """
    if not settings.vapi_api_key:
        raise HTTPException(status_code=400, detail="VAPI_API_KEY not configured")

    headers = {"Authorization": f"Bearer {settings.vapi_api_key}"}

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get("https://api.vapi.ai/phone-number", headers=headers)
            if resp.status_code == 200:
                numbers = resp.json()
                return [
                    {
                        "id": n.get("id"),
                        "number": n.get("number"),
                        "provider": n.get("provider"),
                        "name": n.get("name"),
                        "serverUrl": n.get("serverUrl"),
                        "fallbackServerUrl": n.get("fallbackServerUrl"),
                        "assistantId": n.get("assistantId"),
                    }
                    for n in (numbers if isinstance(numbers, list) else [])
                ]
            else:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.post("/patch-assistant")
async def patch_vapi_assistant(db: Session = Depends(get_db)):
    """
    Patches the VAPI assistant to always use Claude Haiku 4.5.
    Also syncs the current system prompt and FAQ rules to the live assistant.
    """
    if not settings.vapi_api_key:
        raise HTTPException(status_code=400, detail="VAPI_API_KEY not configured")
    if not settings.vapi_assistant_id:
        raise HTTPException(status_code=400, detail="VAPI_ASSISTANT_ID not configured")

    headers = {
        "Authorization": f"Bearer {settings.vapi_api_key}",
        "Content-Type": "application/json"
    }

    # Build assistant payload from current config
    assistant_config = get_active_assistant_config(db)

    patch_payload = {
        "model": assistant_config["model"],
        "voice": assistant_config["voice"],
        "firstMessage": assistant_config["firstMessage"],
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.patch(
                f"https://api.vapi.ai/assistant/{settings.vapi_assistant_id}",
                json=patch_payload,
                headers=headers
            )
            if resp.status_code in (200, 201):
                return {
                    "status": "success",
                    "message": "Assistant updated to Claude Haiku 4.5",
                    "assistantId": settings.vapi_assistant_id,
                    "model": "claude-haiku-20240307"
                }
            else:
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"VAPI API error: {resp.text}"
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.post("/outbound")
async def trigger_outbound_call(phone: str, db: Session = Depends(get_db)):
    """
    Triggers an outbound phone call via VAPI with Claude Haiku 4.5.
    """
    if not settings.vapi_api_key:
        raise HTTPException(status_code=400, detail="VAPI_API_KEY not configured")
    if not settings.vapi_phone_number_id:
        raise HTTPException(status_code=400, detail="VAPI_PHONE_NUMBER_ID not configured")

    assistant_payload = get_active_assistant_config(db)

    vapi_payload = {
        "phoneNumberId": settings.vapi_phone_number_id,
        "assistant": assistant_payload,
        "customer": {
            "number": phone
        }
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.post(
                "https://api.vapi.ai/call",
                json=vapi_payload,
                headers={"Authorization": f"Bearer {settings.vapi_api_key}"},
                timeout=10.0
            )
            response.raise_for_status()
            call_resp = response.json()
            return {"status": "success", "vapiCallId": call_resp.get("id")}
        except httpx.HTTPStatusError as e:
            logger.error(f"VAPI API response error: {e.response.text}")
            raise HTTPException(status_code=502, detail=f"VAPI outbound call failed: {e.response.text}")
        except Exception as e:
            logger.error(f"VAPI outbound call error: {e}")
            raise HTTPException(status_code=500, detail=f"Outbound communication error: {str(e)}")
