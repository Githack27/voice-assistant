from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import calls, settings, vapi, live

app = FastAPI(title="Voice Assistant Receptionist API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(calls.router)
app.include_router(settings.router)
app.include_router(vapi.router)
app.include_router(live.router)

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "2.0.0", "integration": "VAPI Native"}

@app.get("/")
def read_root():
    return {
        "message": "Welcome to Voice Assistant Receptionist API v2.0 (VAPI Native).",
        "docs": "/docs",
        "model": "claude-haiku-4.5"
    }
