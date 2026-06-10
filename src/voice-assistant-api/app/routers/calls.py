from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/calls", tags=["calls"])

@router.get("", response_model=List[schemas.CallDetailResponse])
def get_calls(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    calls = db.query(models.Call).order_by(models.Call.start_time.desc()).offset(skip).limit(limit).all()
    return calls

@router.get("/{call_id}", response_model=schemas.CallDetailResponse)
def get_call_detail(call_id: UUID, db: Session = Depends(get_db)):
    call = db.query(models.Call).filter(models.Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Call not found")
    return call

@router.post("", response_model=schemas.CallResponse, status_code=status.HTTP_201_CREATED)
def create_call(call_in: schemas.CallCreate, db: Session = Depends(get_db)):
    call = models.Call(**call_in.model_dump())
    db.add(call)
    db.commit()
    db.refresh(call)
    return call

@router.put("/{call_id}", response_model=schemas.CallResponse)
def update_call(call_id: UUID, call_in: schemas.CallUpdate, db: Session = Depends(get_db)):
    call = db.query(models.Call).filter(models.Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Call not found")
    
    update_data = call_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(call, key, value)
    
    db.commit()
    db.refresh(call)
    return call

@router.post("/{call_id}/transcripts", response_model=schemas.TranscriptResponse, status_code=status.HTTP_201_CREATED)
def add_transcript(call_id: UUID, transcript_in: schemas.TranscriptCreate, db: Session = Depends(get_db)):
    call = db.query(models.Call).filter(models.Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Call not found")
    
    transcript = models.Transcript(call_id=call_id, **transcript_in.model_dump())
    db.add(transcript)
    db.commit()
    db.refresh(transcript)
    return transcript

@router.post("/{call_id}/voicemails", response_model=schemas.VoicemailResponse, status_code=status.HTTP_201_CREATED)
def add_voicemail(call_id: UUID, voicemail_in: schemas.VoicemailCreate, db: Session = Depends(get_db)):
    call = db.query(models.Call).filter(models.Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Call not found")
    
    voicemail = models.Voicemail(call_id=call_id, **voicemail_in.model_dump())
    db.add(voicemail)
    db.commit()
    db.refresh(voicemail)
    return voicemail
