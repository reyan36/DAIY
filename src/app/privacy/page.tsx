import Link from "next/link";
import { ArrowLeft, Shield, Lock, Eye, Server } from "lucide-react";

export default function PrivacyPolicyPage() {
    return (
        <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
            <header
                style={{
                    borderBottom: "1px solid var(--border-default)",
                    background: "var(--bg-secondary)",
                    padding: "16px 24px",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                }}
            >
                <Link href="/chat" className="btn-ghost" style={{ padding: "6px" }}>
                    <ArrowLeft size={20} />
                </Link>
                <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Privacy Policy</h1>
            </header>

            <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px" }}>
                <div style={{ textAlign: "center", marginBottom: "48px" }}>
                    <div
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: "50%",
                            background: "var(--accent-muted)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 16px",
                        }}
                    >
                        <Shield size={32} color="var(--accent)" />
                    </div>
                    <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "16px" }}>
                        Your Privacy is Our Priority
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", maxWidth: 600, margin: "0 auto" }}>
                        We believe in transparency. Here's exactly how we handle your data.
                    </p>
                </div>

                <div style={{ display: "grid", gap: "32px" }}>
                    <section className="card" style={{ padding: "32px" }}>
                        <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                            <Lock size={24} color="var(--accent)" />
                            <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Data Storage</h2>
                        </div>
                        <p style={{ lineHeight: 1.7, color: "var(--text-secondary)" }}>
                            Your conversations and account details are stored securely using Google Firebase.
                            We implement industry-standard security measures to protect your data from unauthorized access.
                        </p>
                    </section>

                    <section className="card" style={{ padding: "32px" }}>
                        <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                            <Eye size={24} color="var(--accent)" />
                            <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>AI Model Interactions</h2>
                        </div>
                        <p style={{ lineHeight: 1.7, color: "var(--text-secondary)" }}>
                            When you chat with DAIY, your message content is sent to the selected AI provider (OpenAI, Anthropic, Google, or Groq) to generate a response.
                            We do not use your data to train these models. However, please avoid sharing sensitive personal information in chats.
                        </p>
                    </section>

                    <section className="card" style={{ padding: "32px" }}>
                        <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                            <Server size={24} color="var(--accent)" />
                            <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>API Keys</h2>
                        </div>
                        <p style={{ lineHeight: 1.7, color: "var(--text-secondary)" }}>
                            If you provide your own API keys, you can choose to store them permanently (encrypted) or for the current session only.
                            Session-only keys are never stored in our database and are cleared when you close the browser tab.
                        </p>
                    </section>

                    <div style={{ textAlign: "center", marginTop: "32px", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                        Last updated: February 2026
                    </div>
                </div>
            </div>
        </div>
    );
}
