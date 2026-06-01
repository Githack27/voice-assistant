"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function EmailComposer() {
  const searchParams = useSearchParams();
  const toParam = searchParams.get("to") || "";
  const suggestedParam = searchParams.get("suggested") || "";

  // Email form state
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("Follow-up regarding your call with VoiceAI");
  const [emailBody, setEmailBody] = useState("");
  
  const [aiSuggested, setAiSuggested] = useState(
    "Hi, thanks for reaching out. Let us know if we can help schedule your call or set up database storage."
  );

  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Populate from URL query parameters if present
  useEffect(() => {
    if (toParam) {
      setRecipient(toParam);
    }
    if (suggestedParam) {
      setAiSuggested(suggestedParam);
    }
  }, [toParam, suggestedParam]);

  const handleCopySuggestion = () => {
    setEmailBody(aiSuggested);
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSendSuccess(false);

    if (!recipient.trim()) {
      setErrorMsg("Recipient email address is required.");
      return;
    }
    if (!emailBody.trim()) {
      setErrorMsg("Email body content cannot be empty.");
      return;
    }

    setIsSending(true);

    // Simulate sending email
    setTimeout(() => {
      setIsSending(false);
      setSendSuccess(true);
      
      // Keep recipient but clear body on successful send
      setEmailBody("");
      
      // Auto-clear success message after 5 seconds
      setTimeout(() => setSendSuccess(false), 5000);
    }, 1500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#ffffff", marginBottom: "4px" }}>
          Email Integration & Client Follow-up
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          Review call summaries and compose emails directly to callers using AI suggested drafts.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>
        {/* Left Column: AI Draft and Reference */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius)",
              padding: "20px",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#ffffff", marginBottom: "12px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
              AI Suggested Response Draft
            </h3>
            
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5", marginBottom: "16px" }}>
              This draft was automatically generated based on the client's questions during the call.
            </p>

            <div
              style={{
                backgroundColor: "rgba(138, 43, 226, 0.08)",
                border: "1px solid var(--border-color)",
                padding: "16px",
                borderRadius: "var(--radius)",
                fontSize: "13px",
                fontFamily: "inherit",
                color: "var(--text-primary)",
                lineHeight: "1.6",
                minHeight: "120px",
                whiteSpace: "pre-wrap",
                marginBottom: "16px",
              }}
            >
              {aiSuggested || "Select a call from the Dashboard to see an AI suggested draft."}
            </div>

            <button
              onClick={handleCopySuggestion}
              type="button"
              disabled={!aiSuggested}
              style={{
                width: "100%",
                backgroundColor: "var(--bg-input)",
                border: "1px solid var(--border-color)",
                color: "var(--text-primary)",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                height: "38px",
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" />
              </svg>
              Insert AI Draft into Composer
            </button>
          </div>

          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius)",
              padding: "20px",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#ffffff", marginBottom: "12px" }}>
              Quick Templates
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setSubject("VoiceAI Hub Scheduler Invitation")}
                style={{
                  textAlign: "left",
                  fontSize: "12px",
                  backgroundColor: "rgba(0,0,0,0.15)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-secondary)",
                  padding: "8px 12px",
                }}
              >
                Subject: VoiceAI Hub Scheduler Invitation
              </button>
              <button
                type="button"
                onClick={() => setSubject("Information Request - VoiceAI Enterprise")}
                style={{
                  textAlign: "left",
                  fontSize: "12px",
                  backgroundColor: "rgba(0,0,0,0.15)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-secondary)",
                  padding: "8px 12px",
                }}
              >
                Subject: Information Request - VoiceAI Enterprise
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Compose Email Form */}
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius)",
            padding: "20px",
          }}
        >
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#ffffff", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
            New Email Message
          </h3>

          <form onSubmit={handleSendEmail} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Recipient Input */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>To (Client Email)</label>
              <input
                type="email"
                placeholder="client@company.com"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            {/* Subject Input */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>Subject Line</label>
              <input
                type="text"
                placeholder="Follow-up regarding call"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            {/* Body TextArea */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>Message Body</label>
              <textarea
                placeholder="Write your email here..."
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                style={{ width: "100%", minHeight: "220px", resize: "vertical", lineHeight: "1.5" }}
              />
            </div>

            {errorMsg && (
              <span style={{ fontSize: "13px", color: "var(--accent-red)", fontWeight: 500 }}>
                ⚠️ {errorMsg}
              </span>
            )}

            {sendSuccess && (
              <span style={{ fontSize: "13px", color: "#10b981", fontWeight: 600 }}>
                ✓ Email successfully sent to {recipient}!
              </span>
            )}

            <button
              type="submit"
              disabled={isSending}
              style={{
                backgroundColor: "var(--primary)",
                color: "#ffffff",
                fontWeight: 600,
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {isSending ? (
                "Sending..."
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Send Email Follow-up
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function EmailPage() {
  return (
    <Suspense fallback={<div style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Loading composer...</div>}>
      <EmailComposer />
    </Suspense>
  );
}
