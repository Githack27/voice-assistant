import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VoiceAI Hub",
  description: "AI Voice Assistant dashboard, monitoring, configuration, FAQ management, and messaging logs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body style={{ display: "flex", margin: 0, padding: 0, minHeight: "100vh", backgroundColor: "var(--bg-body)", color: "var(--text-primary)" }}>
        <Sidebar />
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            height: "100vh",
            padding: "24px 32px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
