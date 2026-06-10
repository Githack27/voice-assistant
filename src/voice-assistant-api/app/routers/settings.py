import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import httpx
from app.database import get_db
from app import models, schemas
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/settings", tags=["settings"])

# Claude Haiku 4.5 is the forced/locked model for VAPI
DEFAULT_SETTINGS = {
    "agent_config": {
        "model": "claude-haiku-4.5",
        "voiceName": "en-US-Neural-F",
        "speechRate": 1.0,
        "speechPitch": 1.0,
        "systemPrompt": (
            "You are a helpful, professional receptionist for VoiceAI Hub. Your job is to answer customer "
            "questions about pricing, features, and schedules. If a customer wants a pricing details page "
            "or custom developer APIs, instruct them that it requires a Pro tier and note down their details. "
            "If they ask about database storage, confirm we support PostgreSQL connection overrides in the hub "
            "configuration. Always maintain a polite tone and keep responses concise."
        )
    },
    "faqs": [
        {
            "id": "faq-1",
            "category": "Hours",
            "question": "What are your business hours?",
            "answer": "Our standard office hours are Monday through Friday, 9:00 AM to 6:00 PM Pacific Standard Time.",
            "matchRule": "semantic",
        },
        {
            "id": "faq-2",
            "category": "Pricing",
            "question": "Do you offer a discount for annual billing?",
            "answer": "Yes, we offer a 20% discount on all plans if you choose to pay annually instead of monthly.",
            "matchRule": "semantic",
        },
        {
            "id": "faq-3",
            "category": "Integrations",
            "question": "Can I connect my PostgreSQL database?",
            "answer": "Yes, you can configure your own custom PostgreSQL database connection overrides directly in the Agent configuration page.",
            "matchRule": "exact",
        },
        {
            "id": "faq-4",
            "category": "Support",
            "question": "How can I escalate an urgent voice assistant failure?",
            "answer": "Please request to speak to an operator or email critical-support@voiceai.com for immediate engineering attention.",
            "matchRule": "fallback",
        }
    ]
}


@router.get("/public/config")
def get_public_config():
    """Returns VAPI connectivity status for the dashboard header."""
    return {
        "vapi_phone_number_id": settings.vapi_phone_number_id,
        "vapi_assistant_id": settings.vapi_assistant_id,
        "vapi_connected": bool(settings.vapi_api_key and settings.vapi_api_key != "vapi_api_key_placeholder"),
        "model": "claude-haiku-4.5"
    }


@router.get("/public/vapi-info")
async def get_vapi_phone_info():
    """
    Fetches actual phone number details from VAPI API.
    Returns the real phone number string, assistant info, and server URL config.
    """
    if not settings.vapi_api_key:
        raise HTTPException(status_code=400, detail="VAPI_API_KEY not configured")

    headers = {"Authorization": f"Bearer {settings.vapi_api_key}"}
    result = {}

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Fetch phone number details
        if settings.vapi_phone_number_id:
            try:
                phone_resp = await client.get(
                    f"https://api.vapi.ai/phone-number/{settings.vapi_phone_number_id}",
                    headers=headers
                )
                if phone_resp.status_code == 200:
                    phone_data = phone_resp.json()
                    result["phone_number"] = phone_data.get("number", "")
                    result["phone_name"] = phone_data.get("name", "")
                    result["server_url"] = phone_data.get("serverUrl", "")
                    result["fallback_server_url"] = phone_data.get("fallbackServerUrl", "")
                    result["assistant_id"] = phone_data.get("assistantId", "")
            except Exception as e:
                logger.error(f"Failed to fetch VAPI phone number details: {e}")

        # Fetch assistant details
        if settings.vapi_assistant_id:
            try:
                asst_resp = await client.get(
                    f"https://api.vapi.ai/assistant/{settings.vapi_assistant_id}",
                    headers=headers
                )
                if asst_resp.status_code == 200:
                    asst_data = asst_resp.json()
                    model_info = asst_data.get("model", {})
                    result["assistant_name"] = asst_data.get("name", "")
                    result["assistant_model"] = model_info.get("model", "") if isinstance(model_info, dict) else ""
                    result["assistant_provider"] = model_info.get("provider", "") if isinstance(model_info, dict) else ""
            except Exception as e:
                logger.error(f"Failed to fetch VAPI assistant details: {e}")

    result["vapi_connected"] = bool(settings.vapi_api_key)
    return result


@router.get("/{key}", response_model=schemas.SettingResponse)
def get_setting(key: str, db: Session = Depends(get_db)):
    setting = db.query(models.ReceptionistSetting).filter(models.ReceptionistSetting.key == key).first()
    if not setting:
        if key in DEFAULT_SETTINGS:
            import datetime
            return schemas.SettingResponse(
                key=key,
                value=DEFAULT_SETTINGS[key],
                updated_at=datetime.datetime.now()
            )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Setting for '{key}' not found")
    return setting


@router.post("", response_model=schemas.SettingResponse)
def save_setting(setting_in: schemas.SettingCreate, db: Session = Depends(get_db)):
    setting = db.query(models.ReceptionistSetting).filter(models.ReceptionistSetting.key == setting_in.key).first()
    if not setting:
        setting = models.ReceptionistSetting(key=setting_in.key, value=setting_in.value)
        db.add(setting)
    else:
        setting.value = setting_in.value

    db.commit()
    db.refresh(setting)
    return setting
