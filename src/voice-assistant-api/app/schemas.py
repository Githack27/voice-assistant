from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID

# Client schemas
class ClientBase(BaseModel):
    phone_number: str
    name: Optional[str] = None
    email: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientResponse(ClientBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Transcript schemas
class TranscriptBase(BaseModel):
    speaker: str
    text: str

class TranscriptCreate(TranscriptBase):
    pass

class TranscriptResponse(TranscriptBase):
    id: UUID
    call_id: UUID
    timestamp: datetime

    class Config:
        from_attributes = True


# Voicemail schemas
class VoicemailBase(BaseModel):
    audio_url: str
    transcript: Optional[str] = None
    is_read: bool = False

class VoicemailCreate(VoicemailBase):
    pass

class VoicemailResponse(VoicemailBase):
    id: UUID
    call_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# Call schemas
class CallBase(BaseModel):
    status: str = "ongoing"
    recording_url: Optional[str] = None
    summary: Optional[str] = None

class CallCreate(CallBase):
    client_id: Optional[UUID] = None

class CallUpdate(BaseModel):
    end_time: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    status: Optional[str] = None
    recording_url: Optional[str] = None
    summary: Optional[str] = None

class CallResponse(CallBase):
    id: UUID
    client_id: Optional[UUID] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CallDetailResponse(CallResponse):
    client: Optional[ClientResponse] = None
    transcripts: List[TranscriptResponse] = []
    voicemails: List[VoicemailResponse] = []

    class Config:
        from_attributes = True


# Settings schemas
class SettingBase(BaseModel):
    key: str
    value: dict

class SettingCreate(SettingBase):
    pass

class SettingResponse(SettingBase):
    updated_at: datetime

    class Config:
        from_attributes = True
