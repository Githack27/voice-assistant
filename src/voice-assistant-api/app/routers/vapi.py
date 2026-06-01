import datetime
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from sqlalchemy.orm import Session
import httpx

from app.database import get_db
from app import models, schemas
from app.config import settings
from app.routers.settings import DEFAULT_SETTINGS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/vapi", tags=["vapi"])

# Map UI model names to Vapi providers/models
MODEL_MAP = {
    "gemini-1.5-flash": {"provider": "google", "model": "gemini-1.5-flash"},
    "gemini-1.5-pro": {"provider": "google", "model": "gemini-1.5-pro"},
    "gpt-4o-voice": {"provider": "openai", "model": "gpt-4o"},
    "claude-haiku-4.5": {"provider": "anthropic", "model": "claude-3-5-haiku-20241022"}
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
    Helper to fetch the dynamic configuration and format it as a Vapi assistant payload.
    """
    # Fetch agent config setting
    config_setting = db.query(models.ReceptionistSetting).filter(models.ReceptionistSetting.key == "agent_config").first()
    agent_config = config_setting.value if config_setting else DEFAULT_SETTINGS["agent_config"]

    # Fetch FAQ rules setting
    faq_setting = db.query(models.ReceptionistSetting).filter(models.ReceptionistSetting.key == "faqs").first()
    faqs = faq_setting.value if faq_setting else DEFAULT_SETTINGS["faqs"]

    # Prepare system instructions
    system_prompt = agent_config.get("systemPrompt", "")
    
    if faqs:
        faq_text = "\n\nUse the following exact FAQ rules to answer questions if they are asked:\n"
        for faq in faqs:
            faq_text += f"Q: {faq.get('question')}\nA: {faq.get('answer')} (Match type: {faq.get('matchRule')})\n"
        system_prompt += faq_text

    # Resolve model parameters
    model_name = agent_config.get("model", "gemini-1.5-flash")
    model_resolved = MODEL_MAP.get(model_name, {"provider": "google", "model": "gemini-1.5-flash"})

    # Resolve voice settings
    voice_name = agent_config.get("voiceName", "en-US-Neural-F")
    voice_resolved = VOICE_MAP.get(voice_name, {"provider": "azure", "voiceId": "en-US-JennyNeural"})

    return {
        "firstMessage": "Hello! Thank you for calling. How can I help you today?",
        "model": {
            "provider": model_resolved["provider"],
            "model": model_resolved["model"],
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                }
            ]
        },
        "voice": voice_resolved
    }


@router.post("/webhook")
async def vapi_webhook(
    request: Request,
    x_vapi_secret: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    # Verify signature token if configured in settings and request header is present
    if settings.vapi_secret_token and settings.vapi_secret_token != "vapi_secret_token_placeholder":
        if x_vapi_secret != settings.vapi_secret_token:
            logger.warning("Unverified webhook access attempt blocked.")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Vapi secret token")

    payload = await request.json()
    message = payload.get("message", {})
    msg_type = message.get("type")

    # 1. Handle dynamic assistant requests
    if msg_type == "assistant-request":
        logger.info("Received assistant-request webhook event from Vapi.")
        try:
            assistant_payload = get_active_assistant_config(db)
            return {"assistant": assistant_payload}
        except Exception as e:
            logger.error(f"Error formulating dynamic assistant layout: {str(e)}")
            # Fall back to empty assistant to let Vapi use defaults
            return {"assistant": DEFAULT_SETTINGS["agent_config"]}

    # 2. Handle call summary / end reports
    elif msg_type == "end-of-call-report":
        logger.info("Received end-of-call-report webhook event from Vapi.")
        call_data = message.get("call", {})
        customer = call_data.get("customer", {})
        phone = customer.get("number", "Unknown Caller")
        
        # Check or create Client
        client = db.query(models.Client).filter(models.Client.phone_number == phone).first()
        if not client:
            client = models.Client(
                phone_number=phone,
                name=f"Caller ({phone[-4:]})",
                email=f"caller_{phone[-4:]}@example.com"
            )
            db.add(client)
            db.commit()
            db.refresh(client)

        # Parse call times
        started_at = datetime.datetime.now()
        ended_at = datetime.datetime.now()
        
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

        # Ingest call details
        duration = int(call_data.get("duration", 0))
        summary = message.get("summary", "Call completed.")
        recording_url = call_data.get("recordingUrl")
        
        transcript_str = message.get("transcript", "")
        call_status = "answered"
        # Intelligent status decision: does it need email/manual follow up?
        if any(keyword in transcript_str.lower() for keyword in ["postgres", "schedule", "pricing", "invoice", "double charge", "discount"]):
            call_status = "needs-reply"

        new_call = models.Call(
            client_id=client.id,
            start_time=started_at,
            end_time=ended_at,
            duration_seconds=duration,
            status=call_status,
            recording_url=recording_url,
            summary=summary
        )
        db.add(new_call)
        db.commit()
        db.refresh(new_call)

        # Ingest split dialogue transcript
        if transcript_str:
            for line in transcript_str.split("\n"):
                line = line.strip()
                if not line:
                    continue
                if ":" in line:
                    speaker, text = line.split(":", 1)
                    db_transcript = models.Transcript(
                        call_id=new_call.id,
                        speaker=speaker.strip(),
                        text=text.strip()
                    )
                    db.add(db_transcript)
            db.commit()

        return {"status": "success", "callId": str(new_call.id)}

    return {"status": "ignored"}


@router.post("/outbound")
async def trigger_outbound_call(phone: str, db: Session = Depends(get_db)):
    """
    Endpoint to trigger an outbound phone call utilizing Vapi REST APIs.
    """
    if not settings.vapi_api_key or settings.vapi_api_key == "vapi_api_key_placeholder":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="VAPI_API_KEY environment variable is not configured on the backend."
        )
    if not settings.vapi_phone_number_id or settings.vapi_phone_number_id == "vapi_phone_number_id_placeholder":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="VAPI_PHONE_NUMBER_ID is not configured. Outbound calls require a registered Vapi number."
        )

    # 1. Fetch active assistant payload dynamically
    assistant_payload = get_active_assistant_config(db)

    # 2. Formulate Vapi request
    vapi_payload = {
        "phoneNumberId": settings.vapi_phone_number_id,
        "assistant": assistant_payload,
        "customer": {
            "number": phone
        }
    }

    # 3. Request Vapi dispatch
    async with httpx.AsyncClient() as client:
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
            logger.error(f"Vapi API response error: {e.response.text}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Vapi outbound call failed: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Vapi outbound call communication exception: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Outbound communication error: {str(e)}"
            )
