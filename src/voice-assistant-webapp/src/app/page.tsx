"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CallRecord {
  id: string;
  vapiCallId: string | null;
  phone: string;
  email: string;
  timestamp: Date;
  duration: number;
  status: "answered" | "missed" | "needs-reply" | "replied" | "ongoing";
  summary: string;
  transcript: string;
  suggestedReply: string;
  listenUrl: string | null;
  recordingUrl: string | null;
}

interface ActiveCall {
  vapiCallId: string;
  callerPhone: string;
  listenUrl: string | null;
  controlUrl: string | null;
  startedAt: string;
  alertedAt?: number;
}

interface VapiInfo {
  phone_number?: string;
  vapi_connected?: boolean;
  assistant_model?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const POLL_INTERVAL_MS = 20000; // 20 seconds

// ─── Map raw VAPI API response to frontend CallRecord ────────────────────────
const mapApiCallToFrontend = (item: any): CallRecord => {
  const phone = item.phone || item.client?.phone_number || "+1 (Unknown Caller)";
  const email = item.email || item.client?.email || "unknown@caller.com";

  // Parse timestamp
  let timestamp = new Date();
  try {
    if (item.startTime) timestamp = new Date(item.startTime);
    else if (item.start_time) timestamp = new Date(item.start_time);
  } catch (_) {}

  const duration = item.duration ?? item.duration_seconds ?? 0;

  let status: CallRecord["status"] = "answered";
  if (item.status === "missed") status = "missed";
  else if (item.status === "needs-reply") status = "needs-reply";
  else if (item.status === "replied") status = "replied";
  else if (item.status === "ongoing" || item.status === "in-progress") status = "ongoing";

  const summary = item.summary || "Call completed.";

  // Build transcript string from API transcript or array
  let transcript = "";
  if (typeof item.transcript === "string" && item.transcript.trim()) {
    transcript = item.transcript;
  } else if (Array.isArray(item.transcripts) && item.transcripts.length > 0) {
    transcript = item.transcripts.map((t: any) => `${t.speaker}: ${t.text}`).join("\n");
  } else {
    transcript = "[No dialogue transcript available]";
  }

  const suggestedReply = `Hi, following up on your call regarding "${summary}". Please let us know if we can help.`;

  return {
    id: String(item.id),
    vapiCallId: item.vapiCallId || item.vapi_call_id || null,
    phone,
    email,
    timestamp,
    duration,
    status,
    summary,
    transcript,
    suggestedReply,
    listenUrl: item.listenUrl || item.listen_url || null,
    recordingUrl: item.recordingUrl || item.recording_url || null,
  };
};

// ─── Live Listen Modal (PCM audio via WebSocket) ──────────────────────────────
function LiveListenModal({
  call,
  onClose,
}: {
  call: ActiveCall;
  onClose: () => void;
}) {
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);

  // Call duration timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // Connect to VAPI listenUrl via WebSocket and play PCM audio
  const startListening = useCallback(async () => {
    if (!call.listenUrl) {
      setError("No live audio stream URL available for this call.");
      return;
    }

    try {
      // Resume / create AudioContext after user gesture (browser autoplay policy)
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 16000,
        });
      }
      const audioCtx = audioCtxRef.current;
      if (audioCtx.state === "suspended") await audioCtx.resume();

      nextPlayTimeRef.current = audioCtx.currentTime;

      const ws = new WebSocket(call.listenUrl);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          // Decode PCM s16le → Float32 for Web Audio API
          const int16 = new Int16Array(event.data);
          const float32 = new Float32Array(int16.length);
          for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / 32768.0;
          }

          const audioBuffer = audioCtx.createBuffer(1, float32.length, 16000);
          audioBuffer.copyToChannel(float32, 0);

          const source = audioCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioCtx.destination);

          const startAt = Math.max(nextPlayTimeRef.current, audioCtx.currentTime + 0.05);
          source.start(startAt);
          nextPlayTimeRef.current = startAt + audioBuffer.duration;
        } else if (typeof event.data === "string") {
          // Some VAPI streams send JSON transcript events
          try {
            const msg = JSON.parse(event.data);
            if (msg.transcript) {
              setTranscript((prev) => [...prev.slice(-20), msg.transcript]);
            }
          } catch (_) {}
        }
      };

      ws.onerror = () => {
        setError("Audio stream connection error. The call may have ended.");
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
      };
    } catch (e: any) {
      setError(`Failed to start audio: ${e.message}`);
    }
  }, [call.listenUrl]);

  // Auto-connect when modal opens
  useEffect(() => {
    startListening();
    return () => {
      wsRef.current?.close();
      audioCtxRef.current?.close();
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "12px",
          padding: "28px",
          width: "480px",
          maxWidth: "95vw",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: isConnected ? "#10b981" : "#f59e0b",
                boxShadow: isConnected ? "0 0 8px #10b981" : "0 0 8px #f59e0b",
                animation: "pulse 1.5s infinite",
              }}
            />
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#fff" }}>
              Live Call Monitor
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-secondary)", padding: "4px", fontSize: "20px" }}
          >
            ✕
          </button>
        </div>

        {/* Caller info */}
        <div
          style={{
            backgroundColor: "rgba(138,43,226,0.12)",
            border: "1px solid var(--primary)",
            borderRadius: "8px",
            padding: "14px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>
              CALLER
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#fff" }}>
              {call.callerPhone}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>
              ELAPSED
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#10b981", fontFamily: "monospace" }}>
              {formatTime(elapsed)}
            </div>
          </div>
        </div>

        {/* Connection status */}
        <div
          style={{
            backgroundColor: "rgba(0,0,0,0.2)",
            borderRadius: "8px",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            border: `1px solid ${isConnected ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isConnected ? "#10b981" : "#f59e0b"}
            strokeWidth="2"
          >
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
          <span style={{ fontSize: "13px", color: isConnected ? "#10b981" : "#f59e0b", fontWeight: 600 }}>
            {isConnected ? "Streaming live audio..." : "Connecting to audio stream..."}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              backgroundColor: "rgba(239,68,68,0.1)",
              border: "1px solid var(--accent-red)",
              borderRadius: "8px",
              padding: "12px 16px",
              fontSize: "13px",
              color: "#fca5a5",
            }}
          >
            ⚠ {error}
            {call.listenUrl && (
              <button
                onClick={startListening}
                style={{
                  marginTop: "8px",
                  display: "block",
                  backgroundColor: "var(--primary)",
                  color: "#fff",
                  fontSize: "12px",
                  padding: "4px 10px",
                }}
              >
                Retry Connection
              </button>
            )}
          </div>
        )}

        {/* Live transcript feed */}
        {transcript.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>
              Live Transcript
            </div>
            <div
              style={{
                backgroundColor: "var(--bg-input)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                padding: "10px 12px",
                fontSize: "12px",
                fontFamily: "monospace",
                color: "var(--text-primary)",
                lineHeight: "1.6",
                maxHeight: "120px",
                overflowY: "auto",
              }}
            >
              {transcript.map((t, i) => (
                <div key={i}>{t}</div>
              ))}
            </div>
          </div>
        )}

        {/* No listenUrl fallback */}
        {!call.listenUrl && (
          <div
            style={{
              textAlign: "center",
              color: "var(--text-secondary)",
              fontSize: "13px",
              padding: "16px",
              backgroundColor: "rgba(0,0,0,0.2)",
              borderRadius: "8px",
              lineHeight: "1.6",
            }}
          >
            Live audio is available only for <strong style={{ color: "#fff" }}>actively ringing</strong> calls.
            <br />
            The call may have ended or the stream URL has expired.
          </div>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            backgroundColor: "var(--bg-input)",
            border: "1px solid var(--border-color)",
            color: "var(--text-primary)",
            fontSize: "13px",
            fontWeight: 600,
            padding: "10px",
          }}
        >
          Close Monitor
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}

// ─── Incoming Call Alert Banner ───────────────────────────────────────────────
function IncomingCallBanner({
  activeCall,
  onListen,
  onDismiss,
}: {
  activeCall: ActiveCall;
  onListen: () => void;
  onDismiss: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: 999,
        width: "360px",
        backgroundColor: "var(--bg-card)",
        border: "2px solid #10b981",
        borderRadius: "12px",
        padding: "16px 20px",
        boxShadow: "0 8px 32px rgba(16,185,129,0.25)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        animation: "slideInRight 0.3s ease",
      }}
    >
      {/* Pulsing ring icon + title */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ position: "relative", width: "36px", height: "36px", flexShrink: 0 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              backgroundColor: "rgba(16,185,129,0.15)",
              animation: "ringPulse 1.2s ease-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "4px",
              borderRadius: "50%",
              backgroundColor: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
        </div>
        <div>
          <div style={{ fontSize: "12px", color: "#10b981", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Incoming Call
          </div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#fff" }}>
            {activeCall.callerPhone}
          </div>
        </div>
        <div style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: "14px", color: "#10b981", fontWeight: 700 }}>
          {formatTime(elapsed)}
        </div>
      </div>

      <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
        VAPI AI Agent is handling this call now.
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={onListen}
          style={{
            flex: 1,
            backgroundColor: "#10b981",
            color: "#fff",
            fontSize: "12px",
            fontWeight: 700,
            padding: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
          Listen Live
        </button>
        <button
          onClick={onDismiss}
          style={{
            backgroundColor: "var(--bg-input)",
            border: "1px solid var(--border-color)",
            color: "var(--text-secondary)",
            fontSize: "12px",
            padding: "8px 12px",
          }}
        >
          Dismiss
        </button>
      </div>

      <style>{`
        @keyframes ringPulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(60px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [vapiInfo, setVapiInfo] = useState<VapiInfo>({ vapi_connected: false });

  // Active incoming call (SSE-driven)
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [listeningCall, setListeningCall] = useState<ActiveCall | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const sseRef = useRef<EventSource | null>(null);

  // Table state
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortColumn, setSortColumn] = useState<"timestamp" | "duration" | "phone">("timestamp");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // ── Fetch real calls from VAPI API (via backend) ──────────────────────────
  const fetchCalls = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/vapi/calls?limit=50`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setCalls(data.map(mapApiCallToFrontend));
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.warn("VAPI calls fetch failed:", err);
      // Fallback: try the local DB endpoint
      try {
        const r2 = await fetch(`${API_URL}/api/calls`);
        if (r2.ok) {
          const d2 = await r2.json();
          if (Array.isArray(d2) && d2.length > 0) {
            setCalls(d2.map(mapApiCallToFrontend));
            setLastUpdated(new Date());
          }
        }
      } catch (_) {}
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Fetch VAPI phone/assistant info for header ────────────────────────────
  const fetchVapiInfo = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings/public/vapi-info`);
      if (res.ok) {
        const data = await res.json();
        setVapiInfo(data);
      }
    } catch (_) {
      // Fallback to basic config
      try {
        const r2 = await fetch(`${API_URL}/api/settings/public/config`);
        if (r2.ok) {
          const d2 = await r2.json();
          setVapiInfo({ vapi_connected: d2.vapi_connected });
        }
      } catch (_) {}
    }
  }, []);

  // ── SSE: Connect to live incoming-call stream ─────────────────────────────
  const connectSSE = useCallback(() => {
    if (sseRef.current) sseRef.current.close();
    const es = new EventSource(`${API_URL}/api/live/incoming-calls`);
    sseRef.current = es;

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "call-started" && !dismissedIds.has(event.vapiCallId)) {
          setActiveCall({
            vapiCallId: event.vapiCallId,
            callerPhone: event.callerPhone || "Unknown Caller",
            listenUrl: event.listenUrl || null,
            controlUrl: event.controlUrl || null,
            startedAt: event.startedAt,
          });
          // Also refresh call list immediately
          fetchCalls();
        } else if (event.type === "call-ended") {
          setActiveCall((prev) => prev?.vapiCallId === event.vapiCallId ? null : prev);
          setListeningCall((prev) => prev?.vapiCallId === event.vapiCallId ? null : prev);
          // Refresh dashboard
          setTimeout(() => fetchCalls(), 3000);
        }
      } catch (_) {}
    };

    es.onerror = () => {
      // Reconnect after 5s on error
      setTimeout(() => connectSSE(), 5000);
    };
  }, [dismissedIds, fetchCalls]);

  // ── Initialize on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;

    // Initial data load
    fetchCalls();
    fetchVapiInfo();

    // 20-second polling
    pollRef.current = setInterval(() => {
      fetchCalls();
    }, POLL_INTERVAL_MS);

    // SSE for live call alerts
    connectSSE();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (sseRef.current) sseRef.current.close();
    };
  }, [mounted]);

  // Sorting
  const handleSort = (column: "timestamp" | "duration" | "phone") => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const now = new Date();

  // Filtered + sorted calls
  const processedCalls = useMemo(() => {
    return calls
      .filter((call) => {
        const timeDiff = now.getTime() - call.timestamp.getTime();
        const oneDay = 86400000;
        const oneMonth = 30 * oneDay;
        const threeMonths = 90 * oneDay;

        if (timeFilter === "24h" && timeDiff > oneDay) return false;
        if (timeFilter === "1m" && timeDiff > oneMonth) return false;
        if (timeFilter === "3m" && timeDiff > threeMonths) return false;
        if (statusFilter !== "all" && call.status !== statusFilter) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            call.phone.toLowerCase().includes(q) ||
            call.summary.toLowerCase().includes(q) ||
            call.transcript.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortColumn === "timestamp") cmp = a.timestamp.getTime() - b.timestamp.getTime();
        else if (sortColumn === "duration") cmp = a.duration - b.duration;
        else if (sortColumn === "phone") cmp = a.phone.localeCompare(b.phone);
        return sortDirection === "asc" ? cmp : -cmp;
      });
  }, [calls, timeFilter, statusFilter, searchQuery, sortColumn, sortDirection, now]);

  // Stats
  const stats = useMemo(() => {
    const filtered = calls.filter((call) => {
      const timeDiff = now.getTime() - call.timestamp.getTime();
      if (timeFilter === "24h" && timeDiff > 86400000) return false;
      if (timeFilter === "1m" && timeDiff > 30 * 86400000) return false;
      if (timeFilter === "3m" && timeDiff > 90 * 86400000) return false;
      return true;
    });
    return {
      total: filtered.length,
      answered: filtered.filter((c) => c.status === "answered" || c.status === "replied").length,
      missed: filtered.filter((c) => c.status === "missed").length,
      needsReply: filtered.filter((c) => c.status === "needs-reply").length,
      ongoing: filtered.filter((c) => c.status === "ongoing").length,
    };
  }, [calls, timeFilter, now]);

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return "--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "answered": return "badge badge-answered";
      case "missed": return "badge badge-missed";
      case "replied": return "badge badge-replied";
      case "needs-reply": return "badge badge-needs-reply";
      case "ongoing": return "badge badge-ongoing";
      default: return "badge";
    }
  };

  return (
    <>
      {/* ── Live Incoming Call Banner ── */}
      {activeCall && !dismissedIds.has(activeCall.vapiCallId) && (
        <IncomingCallBanner
          activeCall={activeCall}
          onListen={() => setListeningCall(activeCall)}
          onDismiss={() => {
            setDismissedIds((prev) => new Set([...prev, activeCall.vapiCallId]));
            setActiveCall(null);
          }}
        />
      )}

      {/* ── Live Listen Modal ── */}
      {listeningCall && (
        <LiveListenModal call={listeningCall} onClose={() => setListeningCall(null)} />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* ── Page Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#ffffff", marginBottom: "4px" }}>
              Dashboard Overview
            </h1>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "8px" }}>
              Monitor VAPI voice assistant line &amp; incoming customer call records.
              {lastUpdated && mounted && (
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  · Last updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>

          {/* Status cards */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {/* VAPI Phone Number */}
            <div
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                padding: "10px 16px",
                borderRadius: "var(--radius)",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >
              <span style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 600 }}>
                VAPI Phone Number
              </span>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--accent)" }}>
                {vapiInfo.phone_number || "Loading..."}
              </span>
            </div>

            {/* VAPI Connection Status */}
            <div
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                padding: "10px 16px",
                borderRadius: "var(--radius)",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >
              <span style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 600 }}>
                VAPI Status
              </span>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: vapiInfo.vapi_connected ? "#10b981" : "var(--accent-red)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: vapiInfo.vapi_connected ? "#10b981" : "var(--accent-red)",
                    boxShadow: vapiInfo.vapi_connected ? "0 0 6px #10b981" : undefined,
                  }}
                />
                {vapiInfo.vapi_connected ? "Connected" : "Disconnected"}
              </span>
            </div>

            {/* Model badge */}
            <div
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                padding: "10px 16px",
                borderRadius: "var(--radius)",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >
              <span style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 600 }}>
                AI Model
              </span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#c084fc" }}>
                Claude Haiku 4.5
              </span>
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px" }}>
          {[
            { label: "Total Calls", value: stats.total, color: "#ffffff" },
            { label: "Answered", value: stats.answered, color: "#38bdf8" },
            { label: "Missed", value: stats.missed, color: "var(--accent-red)" },
            { label: "Needs Follow-up", value: stats.needsReply, color: "var(--accent)" },
            { label: "Live / Ongoing", value: stats.ongoing, color: "#10b981" },
          ].map((s) => (
            <div
              key={s.label}
              style={{ backgroundColor: "var(--bg-card)", padding: "16px", borderRadius: "var(--radius)", border: "1px solid var(--border-color)" }}
            >
              <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>{s.label}</span>
              <div style={{ fontSize: "28px", fontWeight: 700, color: s.color, marginTop: "8px" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            padding: "16px",
            borderRadius: "var(--radius)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px" }}>
            {/* Time filter */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Time Period</label>
              <div style={{ display: "flex", backgroundColor: "var(--bg-input)", borderRadius: "var(--radius)", padding: "2px", border: "1px solid var(--border-color)" }}>
                {[
                  { key: "24h", label: "24 Hours" },
                  { key: "1m", label: "1 Month" },
                  { key: "3m", label: "3 Months" },
                  { key: "all", label: "All Time" },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setTimeFilter(f.key)}
                    style={{
                      background: timeFilter === f.key ? "var(--primary)" : "none",
                      padding: "6px 12px",
                      fontSize: "12px",
                      borderRadius: "calc(var(--radius) - 2px)",
                      fontWeight: timeFilter === f.key ? 600 : 400,
                      color: "#ffffff",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status filter */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Call Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ height: "36px", paddingRight: "24px", borderColor: "var(--border-color)" }}
              >
                <option value="all">All Statuses</option>
                <option value="ongoing">Live / Ongoing</option>
                <option value="answered">Answered</option>
                <option value="missed">Missed</option>
                <option value="needs-reply">Needs Reply</option>
                <option value="replied">Replied</option>
              </select>
            </div>
          </div>

          {/* Search + refresh */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Search records</label>
              <button
                onClick={fetchCalls}
                title="Refresh now"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  padding: "2px",
                  fontSize: "11px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Refresh
              </button>
            </div>
            <div style={{ position: "relative", width: "280px" }}>
              <input
                type="text"
                placeholder="Search phone, transcripts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", paddingRight: "36px", height: "36px" }}
              />
              <div style={{ position: "absolute", right: "12px", top: "10px", color: "var(--text-secondary)" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* ── Calls Table ── */}
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius)",
            overflow: "hidden",
          }}
        >
          {isLoading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "var(--text-secondary)", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "32px", height: "32px", border: "3px solid var(--border-color)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <span>Loading calls from VAPI...</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)", backgroundColor: "rgba(0,0,0,0.1)" }}>
                  {[
                    { key: "timestamp", label: "Date & Time" },
                    { key: "phone", label: "Caller Number" },
                    { key: "duration", label: "Duration" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key as any)}
                      style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {col.label}
                        {sortColumn === col.key && <span>{sortDirection === "asc" ? "▲" : "▼"}</span>}
                      </div>
                    </th>
                  ))}
                  <th style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>Status</th>
                  <th style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>Summary</th>
                  <th style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {processedCalls.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "48px", textAlign: "center", color: "var(--text-secondary)" }}>
                      {calls.length === 0
                        ? "No calls found in VAPI. Make a call to your VAPI number to see records here."
                        : "No records match the active filters."}
                    </td>
                  </tr>
                ) : (
                  processedCalls.map((call) => {
                    const isExpanded = expandedCallId === call.id;
                    const isOngoing = call.status === "ongoing";

                    return (
                      <React.Fragment key={call.id}>
                        <tr
                          onClick={() => setExpandedCallId((prev) => (prev === call.id ? null : call.id))}
                          style={{
                            borderBottom: isExpanded ? "none" : "1px solid var(--border-color)",
                            cursor: "pointer",
                            backgroundColor: isOngoing
                              ? "rgba(16,185,129,0.06)"
                              : isExpanded
                              ? "rgba(255,255,255,0.02)"
                              : "transparent",
                          }}
                          className="hover-row"
                        >
                          <td style={{ padding: "14px 16px", fontSize: "14px" }}>
                            {mounted
                              ? call.timestamp.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                              : ""}
                          </td>
                          <td style={{ padding: "14px 16px", fontSize: "14px", fontWeight: 600 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {isOngoing && (
                                <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981", boxShadow: "0 0 6px #10b981", flexShrink: 0, animation: "pulse 1.5s infinite" }} />
                              )}
                              {call.phone}
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px", fontSize: "14px" }}>{formatDuration(call.duration)}</td>
                          <td style={{ padding: "14px 16px" }}>
                            <span className={getStatusBadgeClass(call.status)}>
                              {call.status.replace("-", " ")}
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px", fontSize: "14px", color: "var(--text-secondary)", maxWidth: "280px", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                            {call.summary}
                          </td>
                          <td style={{ padding: "14px 16px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                              {/* Live listen button for ongoing calls */}
                              {isOngoing && call.listenUrl && (
                                <button
                                  onClick={() =>
                                    setListeningCall({
                                      vapiCallId: call.vapiCallId || call.id,
                                      callerPhone: call.phone,
                                      listenUrl: call.listenUrl,
                                      controlUrl: null,
                                      startedAt: call.timestamp.toISOString(),
                                    })
                                  }
                                  style={{
                                    fontSize: "12px",
                                    backgroundColor: "#10b981",
                                    color: "#fff",
                                    padding: "4px 8px",
                                    borderRadius: "4px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                  </svg>
                                  Listen
                                </button>
                              )}
                              <Link
                                href={`/email?to=${encodeURIComponent(call.email)}&suggested=${encodeURIComponent(call.suggestedReply)}`}
                                style={{ fontSize: "12px", backgroundColor: "var(--bg-input)", border: "1px solid var(--border-color)", padding: "4px 8px", borderRadius: "4px", color: "var(--text-primary)", display: "inline-block" }}
                              >
                                Email
                              </Link>
                              <Link
                                href={`/call?phone=${encodeURIComponent(call.phone)}`}
                                style={{ fontSize: "12px", backgroundColor: "var(--primary)", padding: "4px 8px", borderRadius: "4px", color: "#ffffff", display: "inline-block" }}
                              >
                                Call
                              </Link>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded transcript row */}
                        {isExpanded && (
                          <tr style={{ borderBottom: "1px solid var(--border-color)", backgroundColor: "rgba(255,255,255,0.02)" }}>
                            <td colSpan={6} style={{ padding: "16px 24px" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                                {/* Transcript */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent)" }}>
                                    Call Dialogue Transcript
                                  </h4>
                                  <div
                                    style={{
                                      backgroundColor: "var(--bg-input)",
                                      border: "1px solid var(--border-color)",
                                      padding: "12px",
                                      borderRadius: "var(--radius)",
                                      fontSize: "13px",
                                      fontFamily: "var(--font-geist-mono)",
                                      whiteSpace: "pre-wrap",
                                      maxHeight: "220px",
                                      overflowY: "auto",
                                      color: "var(--text-primary)",
                                      lineHeight: "1.5",
                                    }}
                                  >
                                    {call.transcript}
                                  </div>
                                  {/* Recording link */}
                                  {call.recordingUrl && (
                                    <a
                                      href={call.recordingUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{
                                        fontSize: "12px",
                                        color: "var(--accent)",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        textDecoration: "underline",
                                      }}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                                      </svg>
                                      Play Recording
                                    </a>
                                  )}
                                </div>

                                {/* Actions / suggestion */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                  <div>
                                    <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent)", marginBottom: "6px" }}>
                                      AI Suggested Follow-up
                                    </h4>
                                    <div
                                      style={{
                                        backgroundColor: "rgba(138,43,226,0.1)",
                                        border: "1px solid var(--primary)",
                                        padding: "12px",
                                        borderRadius: "var(--radius)",
                                        fontSize: "13px",
                                        color: "var(--text-primary)",
                                        lineHeight: "1.4",
                                      }}
                                    >
                                      {call.suggestedReply}
                                    </div>
                                  </div>

                                  <div style={{ display: "flex", gap: "12px" }}>
                                    <Link
                                      href={`/email?to=${encodeURIComponent(call.email)}&suggested=${encodeURIComponent(call.suggestedReply)}`}
                                      style={{ flex: 1, textAlign: "center", padding: "8px 12px", borderRadius: "var(--radius)", fontSize: "13px", backgroundColor: "var(--bg-input)", border: "1px solid var(--border-color)", color: "var(--text-primary)", fontWeight: 600 }}
                                    >
                                      Draft Email Reply
                                    </Link>
                                    <Link
                                      href={`/call?phone=${encodeURIComponent(call.phone)}`}
                                      style={{ flex: 1, textAlign: "center", padding: "8px 12px", borderRadius: "var(--radius)", fontSize: "13px", backgroundColor: "var(--primary)", color: "#ffffff", fontWeight: 600 }}
                                    >
                                      Callback
                                    </Link>
                                  </div>

                                  {/* VAPI call ID badge */}
                                  {call.vapiCallId && (
                                    <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>
                                      VAPI ID: {call.vapiCallId}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Auto-refresh notice */}
        <div style={{ textAlign: "center", fontSize: "11px", color: "var(--text-muted)" }}>
          Dashboard auto-refreshes every 20 seconds from VAPI API · Polling interval: {POLL_INTERVAL_MS / 1000}s
        </div>
      </div>

      {/* Ongoing pulse + badge styles */}
      <style>{`
        .badge-ongoing {
          background-color: rgba(16,185,129,0.15);
          color: #10b981;
          border: 1px solid rgba(16,185,129,0.4);
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}
