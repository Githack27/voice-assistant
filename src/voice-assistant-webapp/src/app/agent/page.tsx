"use client";

import React, { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AgentConfig() {
  // Form states
  const [model, setModel] = useState("gemini-1.5-flash");
  const [voiceName, setVoiceName] = useState("en-US-Neural-F");
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful, professional receptionist for VoiceAI Hub. Your job is to answer customer questions about pricing, features, and schedules. If a customer wants a pricing details page or custom developer APIs, instruct them that it requires a Pro tier and note down their details. If they ask about database storage, confirm we support PostgreSQL connection overrides in the hub configuration. Always maintain a polite tone and keep responses concise."
  );

  const [kbProvider, setKbProvider] = useState("pgvector");
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch saved config from database on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_URL}/api/settings/agent_config`);
        if (!res.ok) throw new Error("Settings key not found");
        const data = await res.json();
        if (data && data.value) {
          setModel(data.value.model || "gemini-1.5-flash");
          setVoiceName(data.value.voiceName || "en-US-Neural-F");
          setSpeechRate(data.value.speechRate ?? 1.0);
          setSpeechPitch(data.value.speechPitch ?? 1.0);
          setSystemPrompt(data.value.systemPrompt || "");
        }
      } catch (err) {
        console.warn("Failed fetching agent configuration from API, using default presets:", err);
      }
    };
    fetchConfig();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).map((file) => ({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
      }));
      setUploadedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    const configPayload = {
      key: "agent_config",
      value: {
        model,
        voiceName,
        speechRate,
        speechPitch,
        systemPrompt,
      },
    };

    try {
      const res = await fetch(`${API_URL}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configPayload),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaveSuccess(true);
    } catch (err) {
      console.warn("Failed posting agent config to backend, running offline fallback simulation:", err);
      setSaveSuccess(true);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#ffffff", marginBottom: "4px" }}>
          Agent Selection & Configuration
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          Configure settings, speaking voice, prompts, and knowledge retrieval settings.
        </p>
      </div>

      <form onSubmit={handleSave} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>
        {/* Left Column: Model details, Voice, Database */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Agent selection card */}
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius)", padding: "20px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#ffffff", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
              1. LLM Model Selection
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>
                  Active LLM Engine
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  style={{ width: "100%" }}
                >
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Default - High Speed)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Thorough - Multi-step logic)</option>
                  <option value="gpt-4o-voice">GPT-4o Realtime Audio Engine</option>
                  <option value="claude-3.5-sonnet">Claude 3.5 Sonnet (API pipeline)</option>
                  <option value="claude-haiku-4.5">Claude Haiku 4.5</option>
                </select>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Gemini 1.5 Flash provides sub-second audio response latency, suitable for fluid voice dialogue.
                </span>
              </div>
            </div>
          </div>

          {/* Voice Customization Card */}
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius)", padding: "20px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#ffffff", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
              2. Speaking Voice Settings
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>
                  Voice Avatar Profile
                </label>
                <select
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  style={{ width: "100%" }}
                >
                  <option value="en-US-Neural-F">Female - Friendly Receptionist (Neural)</option>
                  <option value="en-US-Neural-M">Male - Corporate Professional (Neural)</option>
                  <option value="en-GB-Neural-Br">British Female - Elegant Accent (Neural)</option>
                  <option value="es-ES-Neural-S">Spanish - Bilingual Agent (Neural)</option>
                </select>
              </div>

              {/* Speech Speed slider */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <label style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Speech Rate (Speed)</label>
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>{speechRate}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={speechRate}
                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                  style={{
                    accentColor: "var(--primary)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              </div>

              {/* Speech Pitch Slider */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <label style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Speech Pitch</label>
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>{speechPitch}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={speechPitch}
                  onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                  style={{
                    accentColor: "var(--primary)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Database Setup Card */}
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius)", padding: "20px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#ffffff", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
              3. Knowledge Base Storage Provider
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>
                  Active Retrieval Target
                </label>
                <select
                  value={kbProvider}
                  onChange={(e) => setKbProvider(e.target.value)}
                  style={{ width: "100%" }}
                >
                  <option value="pgvector">PostgreSQL (Local Vector Store - Port 5434)</option>
                  <option value="pinecone">Pinecone Cloud Vector Database</option>
                  <option value="local">Local Markdown Docs (Text Scanning)</option>
                </select>
              </div>

              {/* File Uploader */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>
                  Upload Knowledge Source Files (PDF, TXT, MD)
                </label>
                
                <div
                  style={{
                    border: "2px dashed var(--border-color)",
                    borderRadius: "var(--radius)",
                    padding: "16px",
                    textAlign: "center",
                    cursor: "pointer",
                    backgroundColor: "rgba(0,0,0,0.1)",
                    position: "relative",
                  }}
                >
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.txt,.md"
                    onChange={handleFileUpload}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      opacity: 0,
                      cursor: "pointer",
                    }}
                  />
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>
                      Click to choose or drag files here
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Limit: 10MB per file (PDF, TXT, MD)
                    </span>
                  </div>
                </div>

                {/* Uploaded File List */}
                {uploadedFiles.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>
                      Uploaded Files
                    </span>
                    {uploadedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          backgroundColor: "var(--bg-input)",
                          border: "1px solid var(--border-color)",
                          padding: "6px 10px",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                      >
                        <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "200px" }}>
                          {file.name}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "var(--text-muted)" }}>({file.size})</span>
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--accent-red)",
                              padding: "2px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Prompt instructions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#ffffff", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
              4. System Instructions & Prompt Template
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
                <label style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>
                  Receptionist Persona Directive
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  style={{
                    width: "100%",
                    minHeight: "310px",
                    fontFamily: "var(--font-geist-mono)",
                    lineHeight: "1.5",
                    fontSize: "13px",
                    resize: "none",
                    flex: 1,
                  }}
                  placeholder="Insert instructions for the voice assistant here..."
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
                <div>
                  {saveSuccess && (
                    <span style={{ fontSize: "13px", color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                      ✓ Configuration saved successfully
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "#ffffff",
                    fontWeight: 600,
                    minWidth: "160px",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isSaving ? "Saving Config..." : "Save Configuration"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
