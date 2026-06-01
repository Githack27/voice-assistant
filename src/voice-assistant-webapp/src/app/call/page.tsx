"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function DialerPanel() {
  const searchParams = useSearchParams();
  const phoneParam = searchParams.get("phone") || "";

  // Dial states
  const [phoneNumber, setPhoneNumber] = useState("");
  const [callState, setCallState] = useState<"ready" | "ringing" | "connected" | "ended">("ready");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Populate phone number from query params if available
  useEffect(() => {
    if (phoneParam) {
      setPhoneNumber(phoneParam);
    }
  }, [phoneParam]);

  // Handle timer updates during active call
  useEffect(() => {
    if (callState === "connected") {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (callState === "ready") {
        setCallDuration(0);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callState]);

  // Click dialpad button
  const handleDial = (char: string) => {
    if (callState === "ready") {
      setPhoneNumber((prev) => prev + char);
      setError(null);
    }
  };

  // Backspace phone number
  const handleBackspace = () => {
    if (callState === "ready") {
      setPhoneNumber((prev) => prev.slice(0, -1));
      setError(null);
    }
  };

  // Trigger outbound call sequence
  const startCall = async () => {
    if (!phoneNumber.trim()) return;

    setCallState("ringing");
    setError(null);

    try {
      const res = await fetch(
        `${API_URL}/api/vapi/outbound?phone=${encodeURIComponent(phoneNumber)}`,
        {
          method: "POST",
        }
      );
      if (!res.ok) {
        let errorMsg = "Call request failed";
        try {
          const errorData = await res.json();
          errorMsg = errorData.detail || errorMsg;
        } catch (_) {}
        throw new Error(errorMsg);
      }
      setCallState("connected");
    } catch (err: any) {
      console.error("Failed calling Vapi REST API:", err.message);
      setError(err.message || "Failed to initiate call via Vapi.");
      setCallState("ready");
    }
  };

  // Hangup call
  const endCall = () => {
    setCallState("ended");

    // Reset back to ready after short delay
    setTimeout(() => {
      setCallState("ready");
    }, 2000);
  };

  // Format call seconds (e.g. 01:23)
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "480px", margin: "0 auto", width: "100%" }}>
      {/* Page Header */}
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#ffffff", marginBottom: "4px" }}>
          Dialer Callback Center
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          Direct outgoing callback connection line.
        </p>
      </div>

      {/* Softphone Interface Wrapper */}
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          alignItems: "center",
        }}
      >
        {/* Status indicator bar */}
        <div
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: "var(--radius)",
            backgroundColor: "rgba(0,0,0,0.2)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "13px",
            border: `1px solid ${
              callState === "connected"
                ? "#10b981"
                : callState === "ringing"
                ? "var(--accent)"
                : callState === "ended"
                ? "var(--accent-red)"
                : "var(--border-color)"
            }`,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor:
                  callState === "connected"
                    ? "#10b981"
                    : callState === "ringing"
                    ? "var(--accent)"
                    : callState === "ended"
                    ? "var(--accent-red)"
                    : "var(--text-muted)",
              }}
            />
            <span style={{ textTransform: "capitalize", fontWeight: 600 }}>
              {callState === "ready" ? "Operator Line Ready" : `${callState}...`}
            </span>
          </span>
          {callState === "connected" && (
            <span style={{ fontFamily: "monospace", color: "#10b981", fontWeight: 600 }}>
              {formatTime(callDuration)}
            </span>
          )}
        </div>

        {/* Error Alert Box */}
        {error && (
          <div
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "var(--radius)",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid var(--accent-red)",
              color: "#fca5a5",
              fontSize: "13px",
              lineHeight: "1.4",
              textAlign: "left",
            }}
          >
            <strong>Call Failed:</strong> {error}
          </div>
        )}

        {/* Dialer Display Input */}
        <div style={{ width: "100%", position: "relative" }}>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => {
              if (callState === "ready") {
                setPhoneNumber(e.target.value);
                setError(null);
              }
            }}
            placeholder="Enter phone number..."
            disabled={callState !== "ready"}
            style={{
              width: "100%",
              height: "56px",
              fontSize: "22px",
              fontWeight: 700,
              textAlign: "center",
              letterSpacing: "1px",
              paddingRight: "50px",
              backgroundColor: "var(--bg-input)",
              color: "#ffffff",
              border: "1px solid var(--border-color)",
            }}
          />
          {phoneNumber && callState === "ready" && (
            <button
              onClick={handleBackspace}
              type="button"
              style={{
                position: "absolute",
                right: "12px",
                top: "14px",
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                <line x1="18" y1="9" x2="12" y2="15" />
                <line x1="12" y1="9" x2="18" y2="15" />
              </svg>
            </button>
          )}
        </div>

        {/* Dialpad buttons Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "12px",
            width: "100%",
            maxWidth: "280px",
            opacity: callState !== "ready" ? 0.3 : 1,
            pointerEvents: callState !== "ready" ? "none" : "auto",
          }}
        >
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((char) => (
            <button
              key={char}
              type="button"
              onClick={() => handleDial(char)}
              style={{
                height: "56px",
                fontSize: "20px",
                fontWeight: 600,
                backgroundColor: "var(--bg-input)",
                color: "#ffffff",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {char}
            </button>
          ))}
        </div>

        {/* Call State controls */}
        <div style={{ width: "100%", marginTop: "10px", display: "flex", flexDirection: "column", gap: "12px" }}>
          
          {/* Mute and Speaker toggles (only visible/interactable during active call) */}
          {(callState === "connected" || callState === "ringing") && (
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginBottom: "8px" }}>
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                style={{
                  flex: 1,
                  backgroundColor: isMuted ? "var(--accent)" : "var(--bg-input)",
                  border: "1px solid var(--border-color)",
                  color: "#ffffff",
                  fontSize: "12px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {isMuted ? (
                    <>
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                    </>
                  ) : (
                    <>
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </>
                  )}
                </svg>
                {isMuted ? "Muted" : "Mute"}
              </button>
              <button
                type="button"
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                style={{
                  flex: 1,
                  backgroundColor: isSpeakerOn ? "var(--accent)" : "var(--bg-input)",
                  border: "1px solid var(--border-color)",
                  color: "#ffffff",
                  fontSize: "12px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
                Speaker
              </button>
            </div>
          )}

          {/* Primary Action Button */}
          {callState === "ready" ? (
            <button
              onClick={startCall}
              disabled={!phoneNumber.trim()}
              style={{
                width: "100%",
                height: "48px",
                fontSize: "15px",
                fontWeight: 600,
                backgroundColor: "var(--primary)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Initiate Outbound Call
            </button>
          ) : (
            <button
              onClick={endCall}
              style={{
                width: "100%",
                height: "48px",
                fontSize: "15px",
                fontWeight: 600,
                backgroundColor: "var(--accent-red)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L3.99 7.47a2 2 0 0 1-.45-2.11 12.84 12.84 0 0 0 .7-2.81A2 2 0 0 1 5.96 2h3" />
                <line x1="23" y1="1" x2="1" y2="23" />
              </svg>
              Hang Up Call
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DialerPage() {
  return (
    <Suspense fallback={<div style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Loading dialer...</div>}>
      <DialerPanel />
    </Suspense>
  );
}
