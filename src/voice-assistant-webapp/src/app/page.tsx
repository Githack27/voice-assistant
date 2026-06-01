"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";

// Define mock data for call records
interface CallRecord {
  id: string;
  phone: string;
  email: string;
  timestamp: Date; // date objects
  duration: number; // in seconds
  status: "answered" | "missed" | "needs-reply" | "replied";
  summary: string;
  transcript: string;
  suggestedReply: string;
}

// Generate relative dates for realistic filtering
const now = new Date("2026-05-31T23:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

const MOCK_CALLS: CallRecord[] = [
  {
    id: "call-1",
    phone: "+1 (206) 555-0192",
    email: "sarah.jones@example.com",
    timestamp: hoursAgo(2),
    duration: 48,
    status: "answered",
    summary: "Inquiry about pricing and trial period options.",
    transcript: "Agent: Hello, thank you for calling VoiceAI Hub support. How can I help you?\nCaller: Hi, I'm interested in your product. Can you tell me about the pricing plans and if there's a free trial?\nAgent: Yes, we offer a 14-day free trial on all plans. Our Starter plan starts at $29/month, and the Pro plan is $79/month.\nCaller: Great, thanks! I will sign up on the website.",
    suggestedReply: "Hi Sarah, thank you for calling VoiceAI Hub. Here is the link to our pricing page and details about starting your 14-day free trial: https://voiceai.com/pricing. Please let us know if you have any questions!",
  },
  {
    id: "call-2",
    phone: "+1 (415) 555-0143",
    email: "david.miller@example.com",
    timestamp: hoursAgo(5),
    duration: 0,
    status: "missed",
    summary: "Abandoned call before agent pickup.",
    transcript: "[Caller hung up before the voice agent initialized]",
    suggestedReply: "Hi David, we noticed we missed a call from you today. If you need any assistance regarding our AI Voice services, please reply here or call us back at +1 (855) 790-2486.",
  },
  {
    id: "call-3",
    phone: "+1 (650) 555-0122",
    email: "robert.chen@example.com",
    timestamp: hoursAgo(14),
    duration: 112,
    status: "needs-reply",
    summary: "Requested a demo schedule for next Monday at 10 AM.",
    transcript: "Agent: Hi, welcome to VoiceAI Hub. How can I assist you?\nCaller: Hi, I'd like to schedule a detailed product demo for our engineering team. Is next Monday at 10 AM PST available?\nAgent: I can request that for you. I will have our sales team follow up with a calendar invitation shortly.\nCaller: Perfect. Send it to robert.chen@example.com. Thanks.",
    suggestedReply: "Hi Robert, following up on your call, we'd love to schedule a demo for your team next Monday at 10:00 AM PST. Please find our team calendar booking link here: https://calendly.com/voiceai-demo/meeting.",
  },
  {
    id: "call-4",
    phone: "+1 (212) 555-0188",
    email: "support@techcorp.io",
    timestamp: daysAgo(3),
    duration: 94,
    status: "answered",
    summary: "Question about integrating PostgreSQL database storage.",
    transcript: "Agent: VoiceAI Support, how can I help?\nCaller: Hello, does your assistant support storing caller memory in a custom PostgreSQL database instead of default vector clouds?\nAgent: Yes, we support custom database connections. You can configure your own PostgreSQL server, port, and schemas in the agent knowledge base configuration.\nCaller: Excellent, that's exactly what we need.",
    suggestedReply: "Hello Support Team, thank you for calling. Regarding your query, custom PostgreSQL storage configuration guide is available here: https://docs.voiceai.com/postgres-kb. Let us know if you need database access credentials setup.",
  },
  {
    id: "call-5",
    phone: "+1 (305) 555-0111",
    email: "info@floridaretail.com",
    timestamp: daysAgo(12),
    duration: 145,
    status: "replied",
    summary: "Detailed questions about custom FAQ triggers and categories.",
    transcript: "Agent: Hello, how can I help you today?\nCaller: Can we add our own custom rules for standard responses to questions like store location or return policy?\nAgent: Absolutely. You can configure FAQ Registry responses with semantic matching rules directly in the hub dashboard.\nCaller: Good, thank you.",
    suggestedReply: "Hi Florida Retail Team, here is a quick guide link to configure custom answers in your FAQ registry page: https://voiceai.com/dashboard/faq.",
  },
  {
    id: "call-6",
    phone: "+1 (617) 555-0155",
    email: "alex@designstudio.co",
    timestamp: daysAgo(25),
    duration: 35,
    status: "answered",
    summary: "Checking if API access is included in the basic starter tier.",
    transcript: "Agent: VoiceAI Hub, how can I help?\nCaller: Hi, is full developer API access included in the $29 starter tier?\nAgent: No, developer API access is only available on our Pro plan and Enterprise plan tiers.\nCaller: Okay, thank you.",
    suggestedReply: "Hi Alex, developer API endpoints details are available for our Pro tier ($79/mo) and custom plans: https://voiceai.com/api-docs.",
  },
  {
    id: "call-7",
    phone: "+1 (713) 555-0167",
    email: "billing@energycorp.com",
    timestamp: daysAgo(42),
    duration: 180,
    status: "answered",
    summary: "Invoiced amount clarification request.",
    transcript: "Agent: Hello, billing department. How can I help?\nCaller: We received an invoice that seems to charge twice for prompt tokens. Can you double check?\nAgent: I see. I've flagged this call for manual invoice review by our billing manager.\nCaller: OK, I'll wait.",
    suggestedReply: "Hello Energy Corp Billing Team, we have reviewed your prompt usage and adjusted invoice #2983. A credit has been applied to your account. Feel free to reach out if you notice any other anomalies.",
  },
  {
    id: "call-8",
    phone: "+1 (404) 555-0139",
    email: "georgia.tech@edu.org",
    timestamp: daysAgo(75),
    duration: 62,
    status: "answered",
    summary: "Academic researchers asking for API tokens.",
    transcript: "Caller: Hello, we are doing research on voice agents. Do you offer academic discounts?\nAgent: Yes, we provide up to 50% discount for validated academic institutions. I will send an email with the application instructions.\nCaller: Excellent, thank you very much.",
    suggestedReply: "Hello researchers, here is the application form for our academic discount program: https://voiceai.com/academic-grant.",
  }
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const mapApiCallToFrontend = (apiCall: any): CallRecord => {
  const phone = apiCall.client?.phone_number || "+1 (Unknown Caller)";
  const email = apiCall.client?.email || "info@clientcompany.com";
  const timestamp = new Date(apiCall.start_time);
  const duration = apiCall.duration_seconds || 0;
  
  let status: "answered" | "missed" | "needs-reply" | "replied" = "answered";
  if (apiCall.status === "missed") status = "missed";
  else if (apiCall.status === "needs-reply") status = "needs-reply";
  else if (apiCall.status === "replied") status = "replied";

  const summary = apiCall.summary || "Call completed.";

  let transcript = "";
  if (Array.isArray(apiCall.transcripts) && apiCall.transcripts.length > 0) {
    transcript = apiCall.transcripts
      .map((t: any) => `${t.speaker}: ${t.text}`)
      .join("\n");
  } else {
    transcript = "[No dialogue transcript available]";
  }

  const suggestedReply = `Hi, following up on your call regarding "${summary}". Please let us know if we can help you coordinate details.`;

  return {
    id: String(apiCall.id),
    phone,
    email,
    timestamp,
    duration,
    status,
    summary,
    transcript,
    suggestedReply,
  };
};

export default function Dashboard() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const [systemConfig, setSystemConfig] = useState({
    twilio_phone_number: "+1 (855) 790-2486",
    vapi_connected: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        const res = await fetch(`${API_URL}/api/calls`);
        if (!res.ok) throw new Error("Backend response error");
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped = data.map((item: any) => mapApiCallToFrontend(item));
          setCalls(mapped.length > 0 ? mapped : MOCK_CALLS);
        } else {
          setCalls(MOCK_CALLS);
        }
      } catch (err) {
        console.warn("API server offline, falling back to mock calls:", err);
        setCalls(MOCK_CALLS);
      }
    };

    const fetchSystemConfig = async () => {
      try {
        const res = await fetch(`${API_URL}/api/settings/public/config`);
        if (res.ok) {
          const data = await res.json();
          setSystemConfig({
            twilio_phone_number: data.twilio_phone_number,
            vapi_connected: !!data.vapi_connected,
          });
        }
      } catch (err) {
        console.warn("Failed to fetch system config:", err);
      }
    };

    if (mounted) {
      fetchCalls();
      fetchSystemConfig();
    }
  }, [mounted]);
  
  // States for search and filtering
  const [timeFilter, setTimeFilter] = useState<string>("24h"); // "24h" | "1m" | "3m" | "all"
  const [statusFilter, setStatusFilter] = useState<string>("all"); // "all" | "answered" | "missed" | "needs-reply" | "replied"
  const [searchQuery, setSearchQuery] = useState<string>("");

  // States for sorting
  const [sortColumn, setSortColumn] = useState<"timestamp" | "duration" | "phone">("timestamp");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Expanded call row ID
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

  // Toggle sorting
  const handleSort = (column: "timestamp" | "duration" | "phone") => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  // Filtered and sorted call list
  const processedCalls = useMemo(() => {
    return calls
      .filter((call) => {
        // 1. Time range filter
        const timeDiff = now.getTime() - call.timestamp.getTime();
        const oneDay = 24 * 60 * 60 * 1000;
        const oneMonth = 30 * 24 * 60 * 60 * 1000;
        const threeMonths = 90 * 24 * 60 * 60 * 1000;

        if (timeFilter === "24h" && timeDiff > oneDay) return false;
        if (timeFilter === "1m" && timeDiff > oneMonth) return false;
        if (timeFilter === "3m" && timeDiff > threeMonths) return false;

        // 2. Status filter
        if (statusFilter !== "all" && call.status !== statusFilter) return false;

        // 3. Text search
        if (searchQuery.trim() !== "") {
          const q = searchQuery.toLowerCase();
          const matchesPhone = call.phone.toLowerCase().includes(q);
          const matchesSummary = call.summary.toLowerCase().includes(q);
          const matchesTranscript = call.transcript.toLowerCase().includes(q);
          return matchesPhone || matchesSummary || matchesTranscript;
        }

        return true;
      })
      .sort((a, b) => {
        // 4. Sorting logic
        let comparison = 0;
        if (sortColumn === "timestamp") {
          comparison = a.timestamp.getTime() - b.timestamp.getTime();
        } else if (sortColumn === "duration") {
          comparison = a.duration - b.duration;
        } else if (sortColumn === "phone") {
          comparison = a.phone.localeCompare(b.phone);
        }
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [calls, timeFilter, statusFilter, searchQuery, sortColumn, sortDirection]);

  // Statistics calculation based on current timeFilter
  const stats = useMemo(() => {
    const timeFiltered = calls.filter((call) => {
      const timeDiff = now.getTime() - call.timestamp.getTime();
      const oneDay = 24 * 60 * 60 * 1000;
      const oneMonth = 30 * 24 * 60 * 60 * 1000;
      const threeMonths = 90 * 24 * 60 * 60 * 1000;

      if (timeFilter === "24h" && timeDiff > oneDay) return false;
      if (timeFilter === "1m" && timeDiff > oneMonth) return false;
      if (timeFilter === "3m" && timeDiff > threeMonths) return false;
      return true;
    });

    const total = timeFiltered.length;
    const answered = timeFiltered.filter((c) => c.status === "answered" || c.status === "replied").length;
    const missed = timeFiltered.filter((c) => c.status === "missed").length;
    const needsReply = timeFiltered.filter((c) => c.status === "needs-reply").length;

    return { total, answered, missed, needsReply };
  }, [calls, timeFilter]);

  const toggleRow = (id: string) => {
    setExpandedCallId((prev) => (prev === id ? null : id));
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "answered":
        return "badge badge-answered";
      case "missed":
        return "badge badge-missed";
      case "replied":
        return "badge badge-replied";
      case "needs-reply":
        return "badge badge-needs-reply";
      default:
        return "badge";
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return "--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#ffffff", marginBottom: "4px" }}>
            Dashboard Overview
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            Monitor voice assistant line & incoming customer call records.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
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
              Configured Voice Number
            </span>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent)" }}>
              {systemConfig.twilio_phone_number}
            </span>
          </div>
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
              Vapi Connection
            </span>
            <span style={{ fontSize: "16px", fontWeight: 700, color: systemConfig.vapi_connected ? "#10b981" : "var(--accent-red)", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: systemConfig.vapi_connected ? "#10b981" : "var(--accent-red)" }} />
              {systemConfig.vapi_connected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <div style={{ backgroundColor: "var(--bg-card)", padding: "16px", borderRadius: "var(--radius)", border: "1px solid var(--border-color)" }}>
          <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>Total Inbound Calls</span>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#ffffff", marginTop: "8px" }}>{stats.total}</div>
        </div>
        <div style={{ backgroundColor: "var(--bg-card)", padding: "16px", borderRadius: "var(--radius)", border: "1px solid var(--border-color)" }}>
          <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>Answered / Resolved</span>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#ffffff", marginTop: "8px" }}>{stats.answered}</div>
        </div>
        <div style={{ backgroundColor: "var(--bg-card)", padding: "16px", borderRadius: "var(--radius)", border: "1px solid var(--border-color)" }}>
          <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>Missed Calls</span>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--accent-red)", marginTop: "8px" }}>{stats.missed}</div>
        </div>
        <div style={{ backgroundColor: "var(--bg-card)", padding: "16px", borderRadius: "var(--radius)", border: "1px solid var(--border-color)" }}>
          <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>Needs Follow-up</span>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--accent)", marginTop: "8px" }}>{stats.needsReply}</div>
        </div>
      </div>

      {/* Filters & Control Bar */}
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
        {/* Left Side: Filter Options */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px" }}>
          {/* Time Filter */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Time Period</label>
            <div style={{ display: "flex", backgroundColor: "var(--bg-input)", borderRadius: "var(--radius)", padding: "2px", border: "1px solid var(--border-color)" }}>
              <button
                onClick={() => setTimeFilter("24h")}
                style={{
                  background: timeFilter === "24h" ? "var(--primary)" : "none",
                  padding: "6px 12px",
                  fontSize: "12px",
                  borderRadius: "calc(var(--radius) - 2px)",
                  fontWeight: timeFilter === "24h" ? 600 : 400,
                  color: "#ffffff",
                }}
              >
                24 Hours
              </button>
              <button
                onClick={() => setTimeFilter("1m")}
                style={{
                  background: timeFilter === "1m" ? "var(--primary)" : "none",
                  padding: "6px 12px",
                  fontSize: "12px",
                  borderRadius: "calc(var(--radius) - 2px)",
                  fontWeight: timeFilter === "1m" ? 600 : 400,
                  color: "#ffffff",
                }}
              >
                1 Month
              </button>
              <button
                onClick={() => setTimeFilter("3m")}
                style={{
                  background: timeFilter === "3m" ? "var(--primary)" : "none",
                  padding: "6px 12px",
                  fontSize: "12px",
                  borderRadius: "calc(var(--radius) - 2px)",
                  fontWeight: timeFilter === "3m" ? 600 : 400,
                  color: "#ffffff",
                }}
              >
                3 Months
              </button>
              <button
                onClick={() => setTimeFilter("all")}
                style={{
                  background: timeFilter === "all" ? "var(--primary)" : "none",
                  padding: "6px 12px",
                  fontSize: "12px",
                  borderRadius: "calc(var(--radius) - 2px)",
                  fontWeight: timeFilter === "all" ? 600 : 400,
                  color: "#ffffff",
                }}
              >
                All Time
              </button>
            </div>
          </div>

          {/* Status Filter */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Call Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                height: "36px",
                borderColor: "var(--border-color)",
                paddingRight: "24px",
              }}
            >
              <option value="all">All Statuses</option>
              <option value="answered">Answered</option>
              <option value="missed">Missed</option>
              <option value="needs-reply">Needs Reply</option>
              <option value="replied">Replied</option>
            </select>
          </div>
        </div>

        {/* Right Side: Search */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", maxWidth: "300px" }}>
          <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Search records</label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search phone, transcripts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                paddingRight: "36px",
                height: "36px",
              }}
            />
            <div style={{ position: "absolute", right: "12px", top: "10px", color: "var(--text-secondary)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Calls Table Container */}
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-color)", backgroundColor: "rgba(0,0,0,0.1)" }}>
              <th
                onClick={() => handleSort("timestamp")}
                style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  Date & Time
                  {sortColumn === "timestamp" && (
                    <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort("phone")}
                style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  Caller Number
                  {sortColumn === "phone" && (
                    <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort("duration")}
                style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  Duration
                  {sortColumn === "duration" && (
                    <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                  )}
                </div>
              </th>
              <th style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
                Status
              </th>
              <th style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
                Summary Description
              </th>
              <th style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", textAlign: "right" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {processedCalls.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "40px", textTransform: "none", textAlign: "center", color: "var(--text-secondary)" }}>
                  No call records found matching the active filters.
                </td>
              </tr>
            ) : (
              processedCalls.map((call) => {
                const isExpanded = expandedCallId === call.id;
                return (
                  <React.Fragment key={call.id}>
                    <tr
                      onClick={() => toggleRow(call.id)}
                      style={{
                        borderBottom: isExpanded ? "none" : "1px solid var(--border-color)",
                        cursor: "pointer",
                        backgroundColor: isExpanded ? "rgba(255,255,255,0.02)" : "transparent",
                      }}
                      className="hover-row"
                    >
                      <td style={{ padding: "14px 16px", fontSize: "14px" }}>
                        {mounted
                          ? call.timestamp.toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "14px", fontWeight: 600 }}>
                        {call.phone}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "14px" }}>
                        {formatDuration(call.duration)}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span className={getStatusBadgeClass(call.status)}>
                          {call.status.replace("-", " ")}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "14px 16px",
                          fontSize: "14px",
                          color: "var(--text-secondary)",
                          maxWidth: "320px",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                        }}
                      >
                        {call.summary}
                      </td>
                      <td
                        style={{
                          padding: "14px 16px",
                          fontSize: "14px",
                          textAlign: "right",
                        }}
                        onClick={(e) => e.stopPropagation()} // Prevent expansion when clicking specific action links
                      >
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <Link
                            href={`/email?to=${encodeURIComponent(call.email)}&suggested=${encodeURIComponent(call.suggestedReply)}`}
                            style={{
                              fontSize: "12px",
                              backgroundColor: "var(--bg-input)",
                              border: "1px solid var(--border-color)",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              color: "var(--text-primary)",
                              display: "inline-block",
                            }}
                          >
                            Email
                          </Link>
                          <Link
                            href={`/call?phone=${encodeURIComponent(call.phone)}`}
                            style={{
                              fontSize: "12px",
                              backgroundColor: "var(--primary)",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              color: "#ffffff",
                              display: "inline-block",
                            }}
                          >
                            Call
                          </Link>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Row Content */}
                    {isExpanded && (
                      <tr style={{ borderBottom: "1px solid var(--border-color)", backgroundColor: "rgba(255,255,255,0.02)" }}>
                        <td colSpan={6} style={{ padding: "16px 24px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                            {/* Transcript column */}
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
                            </div>

                            {/* Suggestion / Details Column */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                              <div>
                                <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent)", marginBottom: "4px" }}>
                                  AI Suggested Follow-up Response
                                </h4>
                                <div
                                  style={{
                                    backgroundColor: "rgba(138, 43, 226, 0.1)",
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

                              <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
                                <Link
                                  href={`/email?to=${encodeURIComponent(call.email)}&suggested=${encodeURIComponent(call.suggestedReply)}`}
                                  style={{
                                    flex: 1,
                                    textAlign: "center",
                                    padding: "8px 12px",
                                    borderRadius: "var(--radius)",
                                    fontSize: "13px",
                                    backgroundColor: "var(--bg-input)",
                                    border: "1px solid var(--border-color)",
                                    color: "var(--text-primary)",
                                    fontWeight: 600,
                                  }}
                                >
                                  Draft Email Reply
                                </Link>
                                <Link
                                  href={`/call?phone=${encodeURIComponent(call.phone)}`}
                                  style={{
                                    flex: 1,
                                    textAlign: "center",
                                    padding: "8px 12px",
                                    borderRadius: "var(--radius)",
                                    fontSize: "13px",
                                    backgroundColor: "var(--primary)",
                                    color: "#ffffff",
                                    fontWeight: 600,
                                  }}
                                >
                                  Direct Call Back
                                </Link>
                              </div>
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
      </div>
    </div>
  );
}
