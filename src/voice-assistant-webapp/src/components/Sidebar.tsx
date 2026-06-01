"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dashboard",
      path: "/",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      ),
    },
    {
      label: "Agent Config",
      path: "/agent",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          <path d="M12 20v2M12 2v2" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      ),
    },
    {
      label: "FAQ Registry",
      path: "/faq",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    {
      label: "Email Client",
      path: "/email",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      ),
    },
    {
      label: "Dialer Callback",
      path: "/call",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      ),
    },
  ];

  return (
    <aside
      style={{
        width: isCollapsed ? "72px" : "260px",
        backgroundColor: "var(--bg-sidebar)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        borderRight: "1px solid var(--border-color)",
        flexShrink: 0,
        position: "sticky",
        top: 0,
      }}
    >
      {/* Top Brand Logo Container */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          padding: "20px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {!isCollapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                backgroundColor: "var(--accent)",
                borderRadius: "var(--radius)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                color: "#ffffff",
              }}
            >
              V
            </div>
            <span style={{ fontWeight: 600, fontSize: "16px", color: "#ffffff" }}>
              VoiceAI Hub
            </span>
          </div>
        )}
        {isCollapsed && (
          <div
            style={{
              width: "32px",
              height: "32px",
              backgroundColor: "var(--accent)",
              borderRadius: "var(--radius)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              color: "#ffffff",
            }}
          >
            V
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            background: "none",
            border: "none",
            color: "#ffffff",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.8,
            cursor: "pointer",
            marginLeft: isCollapsed ? "0" : "8px",
          }}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          )}
        </button>
      </div>

      {/* Middle Navigation Routes */}
      <nav
        style={{
          flex: 1,
          padding: "24px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isCollapsed ? "center" : "flex-start",
                gap: "12px",
                padding: "10px 14px",
                borderRadius: "var(--radius)",
                color: isActive ? "#ffffff" : "var(--text-secondary)",
                backgroundColor: isActive ? "var(--primary)" : "transparent",
                fontWeight: isActive ? 600 : 500,
                fontSize: "14px",
              }}
              title={isCollapsed ? item.label : undefined}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isActive ? "#ffffff" : "var(--text-secondary)",
                }}
              >
                {item.icon}
              </div>
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile details */}
      <div
        style={{
          padding: "16px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              fontSize: "14px",
              color: "#ffffff",
              flexShrink: 0,
            }}
          >
            MK
          </div>
          {!isCollapsed && (
            <div style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: "13px",
                  color: "#ffffff",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                }}
              >
                M. Kausthuban
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.6)",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                }}
              >
                admin@voiceai.com
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
