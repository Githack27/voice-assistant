"""
live.py — Server-Sent Events (SSE) router for real-time incoming call notifications.

The frontend connects to GET /api/live/incoming-calls and receives events whenever:
- A VAPI call-started webhook fires
- A VAPI call-ended webhook fires
- Active calls are polled

This enables the dashboard to show live "Incoming Call" banners without polling.
"""
import asyncio
import json
import logging
from typing import AsyncGenerator, Dict, Set
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/live", tags=["live"])

# ─── Global SSE subscriber queue ──────────────────────────────────────────────
# Each connected browser gets an asyncio.Queue
_subscribers: Set[asyncio.Queue] = set()
_lock = asyncio.Lock()


async def broadcast_incoming_call(event_data: dict):
    """
    Broadcast a call event to all connected SSE clients.
    Called from vapi.py webhook handlers.
    """
    async with _lock:
        dead = set()
        for q in _subscribers:
            try:
                q.put_nowait(event_data)
            except asyncio.QueueFull:
                dead.add(q)
        for d in dead:
            _subscribers.discard(d)


async def _event_generator(request: Request) -> AsyncGenerator[str, None]:
    """
    Yields SSE formatted events to a connected browser client.
    Sends a keepalive ping every 15 seconds to prevent connection timeouts.
    """
    q: asyncio.Queue = asyncio.Queue(maxsize=50)

    async with _lock:
        _subscribers.add(q)

    logger.info("SSE client connected for live call monitoring")

    try:
        # Send initial connection confirmation
        yield f"data: {json.dumps({'type': 'connected', 'message': 'Live call monitoring active'})}\n\n"

        while True:
            # Check if client disconnected
            if await request.is_disconnected():
                break

            try:
                # Wait for an event with a timeout (for keepalive)
                event = await asyncio.wait_for(q.get(), timeout=15.0)
                payload = json.dumps(event)
                logger.info(f"SSE broadcasting event: {event.get('type')}")
                yield f"data: {payload}\n\n"

            except asyncio.TimeoutError:
                # Send keepalive ping
                yield "data: {\"type\": \"ping\"}\n\n"

    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"SSE stream error: {e}")
    finally:
        async with _lock:
            _subscribers.discard(q)
        logger.info("SSE client disconnected")


@router.get("/incoming-calls")
async def incoming_calls_stream(request: Request):
    """
    Server-Sent Events endpoint for live incoming call alerts.
    
    Frontend connects here and receives real-time events:
    - {"type": "connected"} — initial connection confirmation
    - {"type": "call-started", "vapiCallId": "...", "callerPhone": "...", "listenUrl": "..."} 
    - {"type": "call-ended", "vapiCallId": "..."}
    - {"type": "ping"} — keepalive every 15 seconds
    """
    return StreamingResponse(
        _event_generator(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        }
    )


@router.get("/subscriber-count")
async def get_subscriber_count():
    """Returns how many SSE clients are currently connected."""
    return {"count": len(_subscribers)}
