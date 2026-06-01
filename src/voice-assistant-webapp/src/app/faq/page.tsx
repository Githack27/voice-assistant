"use client";

import React, { useState, useMemo, useEffect } from "react";

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  matchRule: "exact" | "semantic" | "fallback";
}

const INITIAL_FAQS: FAQItem[] = [
  {
    id: "faq-1",
    category: "Hours",
    question: "What are your business hours?",
    answer: "Our standard office hours are Monday through Friday, 9:00 AM to 6:00 PM Pacific Standard Time.",
    matchRule: "semantic",
  },
  {
    id: "faq-2",
    category: "Pricing",
    question: "Do you offer a discount for annual billing?",
    answer: "Yes, we offer a 20% discount on all plans if you choose to pay annually instead of monthly.",
    matchRule: "semantic",
  },
  {
    id: "faq-3",
    category: "Integrations",
    question: "Can I connect my PostgreSQL database?",
    answer: "Yes, you can configure your own custom PostgreSQL database connection overrides directly in the Agent configuration page.",
    matchRule: "exact",
  },
  {
    id: "faq-4",
    category: "Support",
    question: "How can I escalate an urgent voice assistant failure?",
    answer: "Please request to speak to an operator or email critical-support@voiceai.com for immediate engineering attention.",
    matchRule: "fallback",
  },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function FAQRegistry() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  
  // Form states
  const [category, setCategory] = useState("Pricing");
  const [customCategory, setCustomCategory] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [matchRule, setMatchRule] = useState<"exact" | "semantic" | "fallback">("semantic");
  const [formError, setFormError] = useState("");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Sorting
  const [sortColumn, setSortColumn] = useState<"category" | "question">("category");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Fetch FAQ rules from database on mount
  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        const res = await fetch(`${API_URL}/api/settings/faqs`);
        if (!res.ok) throw new Error("Settings not found");
        const data = await res.json();
        if (data && Array.isArray(data.value)) {
          setFaqs(data.value);
        } else {
          setFaqs(INITIAL_FAQS);
        }
      } catch (err) {
        console.warn("Failed fetching FAQs from API, using default presets:", err);
        setFaqs(INITIAL_FAQS);
      }
    };
    fetchFAQs();
  }, []);

  // Helper to persist updated list to DB
  const saveFAQsToDB = async (updatedList: FAQItem[]) => {
    try {
      await fetch(`${API_URL}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "faqs",
          value: updatedList,
        }),
      });
    } catch (err) {
      console.error("Failed posting FAQ overrides to database settings store:", err);
    }
  };

  // Handle FAQ Creation
  const handleAddFAQ = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!question.trim() || !answer.trim()) {
      setFormError("Both the question and answer response fields are required.");
      return;
    }

    const finalCategory = category === "Custom" ? (customCategory.trim() || "General") : category;

    const newItem: FAQItem = {
      id: `faq-${Date.now()}`,
      category: finalCategory,
      question: question.trim(),
      answer: answer.trim(),
      matchRule,
    };

    const newList = [newItem, ...faqs];
    setFaqs(newList);
    saveFAQsToDB(newList);

    // Reset fields
    setQuestion("");
    setAnswer("");
    setCustomCategory("");
  };

  // Handle FAQ Deletion
  const handleDeleteFAQ = (id: string) => {
    const newList = faqs.filter((item) => item.id !== id);
    setFaqs(newList);
    saveFAQsToDB(newList);
  };

  // Toggle column sorting
  const handleSort = (column: "category" | "question") => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Compute unique categories for dropdown filter
  const allCategories = useMemo(() => {
    const categories = faqs.map((faq) => faq.category);
    return Array.from(new Set(categories));
  }, [faqs]);

  // Filter & sort list items
  const processedFaqs = useMemo(() => {
    return faqs
      .filter((faq) => {
        // Category Filter
        if (categoryFilter !== "all" && faq.category !== categoryFilter) return false;

        // Text Search
        if (searchQuery.trim() !== "") {
          const q = searchQuery.toLowerCase();
          const matchesQuestion = faq.question.toLowerCase().includes(q);
          const matchesAnswer = faq.answer.toLowerCase().includes(q);
          return matchesQuestion || matchesAnswer;
        }

        return true;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortColumn === "category") {
          comparison = a.category.localeCompare(b.category);
        } else if (sortColumn === "question") {
          comparison = a.question.localeCompare(b.question);
        }
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [faqs, categoryFilter, searchQuery, sortColumn, sortDirection]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#ffffff", marginBottom: "4px" }}>
          FAQ Addition & Override Registry
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          Register specific responses for common questions. FAQs override dynamic LLM generations.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "24px", alignItems: "start" }}>
        {/* Left Column: Form to Add FAQ */}
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius)",
            padding: "20px",
          }}
        >
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#ffffff", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
            Add FAQ Rule
          </h3>

          <form onSubmit={handleAddFAQ} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Category selection */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="Pricing">Pricing</option>
                <option value="Hours">Hours</option>
                <option value="Integrations">Integrations</option>
                <option value="Support">Support</option>
                <option value="Custom">-- Custom Category --</option>
              </select>
            </div>

            {category === "Custom" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>Custom Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Refunds"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
            )}

            {/* Match rule selection */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>Trigger Matching Rule</label>
              <select
                value={matchRule}
                onChange={(e) => setMatchRule(e.target.value as any)}
                style={{ width: "100%" }}
              >
                <option value="semantic">Semantic Match (Recommended)</option>
                <option value="exact">Exact Phrase Match</option>
                <option value="fallback">Global Fallback Reply</option>
              </select>
            </div>

            {/* Question input */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>Customer Question</label>
              <input
                type="text"
                placeholder="What is your return policy?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            {/* Answer input */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>Constant Reply Response</label>
              <textarea
                placeholder="Write the exact reply the assistant will say..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                style={{ width: "100%", minHeight: "100px", resize: "vertical" }}
              />
            </div>

            {formError && (
              <span style={{ fontSize: "12px", color: "var(--accent-red)", fontWeight: 500 }}>
                ⚠️ {formError}
              </span>
            )}

            <button
              type="submit"
              style={{
                backgroundColor: "var(--primary)",
                color: "#ffffff",
                fontWeight: 600,
                marginTop: "6px",
                height: "38px",
              }}
            >
              Add FAQ Rule
            </button>
          </form>
        </div>

        {/* Right Column: Interactive Table with Filters and Sorting */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Table Header Filter Controls */}
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              padding: "16px",
              borderRadius: "var(--radius)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            {/* Category Filter */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Filter by Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ height: "36px", minWidth: "150px" }}
              >
                <option value="all">All Categories</option>
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Search filter */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, maxWidth: "320px" }}>
              <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Search FAQ rules</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Search questions or responses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "100%", height: "36px", paddingRight: "36px" }}
                />
                <div style={{ position: "absolute", right: "12px", top: "10px", color: "var(--text-secondary)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Active FAQ Table */}
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
                    onClick={() => handleSort("category")}
                    style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer", userSelect: "none", width: "130px" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      Category
                      {sortColumn === "category" && (
                        <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("question")}
                    style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer", userSelect: "none", width: "240px" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      Question / Phrase
                      {sortColumn === "question" && (
                        <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </th>
                  <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
                    Constant Agent Reply
                  </th>
                  <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", width: "120px" }}>
                    Trigger Rule
                  </th>
                  <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", textAlign: "right", width: "80px" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {processedFaqs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
                      No registered FAQ rules matching the active filters.
                    </td>
                  </tr>
                ) : (
                  processedFaqs.map((faq) => (
                    <tr key={faq.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "12px 16px", fontSize: "13px" }}>
                        <span
                          style={{
                            backgroundColor: "rgba(255, 138, 0, 0.1)",
                            color: "var(--accent)",
                            border: "1px solid rgba(255, 138, 0, 0.2)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                          }}
                        >
                          {faq.category}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>
                        {faq.question}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                        {faq.answer}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "12px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor: faq.matchRule === "semantic" ? "rgba(138, 43, 226, 0.15)" : faq.matchRule === "exact" ? "rgba(255, 78, 133, 0.15)" : "rgba(245, 158, 11, 0.15)",
                            color: faq.matchRule === "semantic" ? "#c084fc" : faq.matchRule === "exact" ? "#f472b6" : "#fbbf24",
                            border: `1px solid ${faq.matchRule === "semantic" ? "rgba(138, 43, 226, 0.3)" : faq.matchRule === "exact" ? "rgba(255, 78, 133, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                            fontWeight: 500,
                          }}
                        >
                          {faq.matchRule === "semantic" ? "Semantic" : faq.matchRule === "exact" ? "Exact Phrase" : "Fallback"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteFAQ(faq.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--accent-red)",
                            padding: "4px 8px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: 500,
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
