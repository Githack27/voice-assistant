from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/settings", tags=["settings"])

DEFAULT_SETTINGS = {
    "agent_config": {
        "model": "gemini-1.5-flash",
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

from app.config import settings

@router.get("/public/config")
def get_public_config():
    return {
        "twilio_phone_number": settings.twilio_phone_number or "+1 (Unknown Twilio Number)",
        "vapi_phone_number_id": settings.vapi_phone_number_id,
        "vapi_connected": bool(settings.vapi_api_key and settings.vapi_api_key != "vapi_api_key_placeholder")
    }

@router.get("/{key}", response_model=schemas.SettingResponse)
def get_setting(key: str, db: Session = Depends(get_db)):
    setting = db.query(models.ReceptionistSetting).filter(models.ReceptionistSetting.key == key).first()
    if not setting:
        if key in DEFAULT_SETTINGS:
            # Return transient default settings so frontend loads seamlessly
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
