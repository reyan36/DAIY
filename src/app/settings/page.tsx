"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { updateUserProfile, deleteAllConversations } from "@/lib/firestore";
import { signOut } from "@/lib/auth";
import { maskApiKey } from "@/lib/utils";
import {
    ArrowLeft,
    User,
    Key,
    Cpu,
    Trash2,
    LogOut,
    Check,
    Eye,
    EyeOff,
    Save,
    Shield,
    AlertTriangle,
    Clock,
    Infinity as InfinityIcon,
} from "lucide-react";
import DaiyLogo from "@/components/DaiyLogo";
import { useToast } from "@/components/Toast";

export default function SettingsPage() {
    const { user, profile, loading, refreshProfile } = useAuth();
    const router = useRouter();
    const { toast, confirm: showConfirm } = useToast();

    // Profile
    const [displayName, setDisplayName] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // API Keys state
    const [keys, setKeys] = useState({
        openai: "",
        anthropic: "",
        google: "",
        groq: "",
    });

    // Key persistence preference (true = permanent, false = session)
    const [persistKeys, setPersistKeys] = useState({
        openai: true,
        anthropic: true,
        google: true,
        groq: true,
    });

    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
    const [keysSaving, setKeysSaving] = useState(false);
    const [keysSaved, setKeysSaved] = useState(false);

    // Preferences
    const [autoDetect, setAutoDetect] = useState(true);
    const [extendedThinking, setExtendedThinking] = useState(false);
    const [preferredModel, setPreferredModel] = useState("");

    // Delete all chats
    const [deletingChats, setDeletingChats] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (profile) {
            setDisplayName(profile.displayName || "");
            setAutoDetect(profile.preferences?.autoDetectModel ?? true);
            setExtendedThinking(profile.preferences?.extendedThinking ?? false);
            setPreferredModel(profile.preferences?.preferredModel || "");

            // Load keys from profile (permanent)
            // Checks session storage for temporary keys if not in profile
            const newKeys = { ...keys };
            const newPersist = { ...persistKeys };
            const providers = ['openai', 'anthropic', 'google', 'groq'] as const;

            providers.forEach(provider => {
                if (profile.apiKeys?.[provider]) {
                    // Found in profile -> Permanent
                    newPersist[provider] = true;
                } else {
                    // Check session
                    const sessionKey = typeof window !== 'undefined' ? sessionStorage.getItem(`daiy_apikey_${provider}`) : null;
                    if (sessionKey) {
                        newKeys[provider] = sessionKey;
                        newPersist[provider] = false;
                    }
                }
            });
            setKeys(newKeys);
            setPersistKeys(newPersist);
        }
    }, [profile]);

    const handleSaveProfile = async () => {
        if (!user) return;
        setSaving(true);
        try {
            await updateUserProfile(user.uid, { displayName } as any);
            await refreshProfile();
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveKeys = async () => {
        if (!user) return;
        setKeysSaving(true);
        try {
            const updates: any = { apiKeys: { ...profile?.apiKeys } };
            const providers = ['openai', 'anthropic', 'google', 'groq'] as const;

            providers.forEach(provider => {
                const key = keys[provider];
                if (!key && !profile?.apiKeys?.[provider]) return; // No change

                if (persistKeys[provider]) {
                    // Permanent: Save to Profile, Clear Session
                    if (key) {
                        updates.apiKeys[provider] = key;
                        sessionStorage.removeItem(`daiy_apikey_${provider}`);
                    }
                } else {
                    // Session: Save to Session, Clear Profile
                    if (key) {
                        sessionStorage.setItem(`daiy_apikey_${provider}`, key);
                        updates.apiKeys[provider] = null; // Remove from profile
                    }
                }
            });

            await updateUserProfile(user.uid, updates);
            await refreshProfile();

            // Clear inputs for security (UI only)
            setKeys({ openai: "", anthropic: "", google: "", groq: "" });

            setKeysSaved(true);
            setTimeout(() => setKeysSaved(false), 2000);
        } finally {
            setKeysSaving(false);
        }
    };

    const handleSavePreferences = async () => {
        if (!user) return;
        await updateUserProfile(user.uid, {
            preferences: {
                autoDetectModel: autoDetect,
                extendedThinking: extendedThinking,
                preferredModel: preferredModel || null,
            },
        } as any);
        await refreshProfile();
    };

    const handleRemoveKey = async (provider: string) => {
        if (!user || !profile) return;
        // Remove from both
        const apiKeys = { ...profile.apiKeys, [provider]: null };
        await updateUserProfile(user.uid, { apiKeys } as any);
        sessionStorage.removeItem(`daiy_apikey_${provider}`);
        await refreshProfile();
        setKeys(prev => ({ ...prev, [provider]: "" }));
    };

    const toggleShowKey = (provider: string) => {
        setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
    };

    const RenderKeyInput = ({ provider, label }: { provider: 'openai' | 'anthropic' | 'google' | 'groq', label: string }) => {
        const hasPermanent = !!profile?.apiKeys?.[provider];
        const hasSession = typeof window !== 'undefined' && !!sessionStorage.getItem(`daiy_apikey_${provider}`);
        const hasKey = hasPermanent || hasSession;

        // TypeScript hack for accessing dynamic keys
        const currentKey = keys[provider as keyof typeof keys];
        const isPersist = persistKeys[provider as keyof typeof persistKeys];

        return (
            <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--text-secondary)" }}>{label}</label>
                    {hasKey && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "0.75rem", color: hasSession ? "var(--text-secondary)" : "var(--accent)" }}>
                                {hasSession ? "Session Key Active" : maskApiKey(profile?.apiKeys?.[provider] || "")}
                            </span>
                            <button onClick={() => handleRemoveKey(provider)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px" }}>
                                <Trash2 size={13} />
                            </button>
                        </div>
                    )}
                </div>

                <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
                    <div style={{ position: "relative" }}>
                        <input
                            className="input-field"
                            type={showKeys[provider] ? "text" : "password"}
                            value={currentKey}
                            onChange={(e) => setKeys({ ...keys, [provider]: e.target.value })}
                            placeholder={hasKey ? "Replace existing key..." : `Enter ${label} Key`}
                            style={{ paddingRight: 36 }}
                        />
                        <button
                            onClick={() => toggleShowKey(provider)}
                            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                        >
                            {showKeys[provider] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem", color: "var(--text-secondary)", cursor: "pointer", width: "fit-content" }}>
                        <input
                            type="checkbox"
                            checked={isPersist}
                            onChange={(e) => setPersistKeys({ ...persistKeys, [provider]: e.target.checked })}
                            style={{ accentColor: "var(--accent)" }}
                        />
                        {isPersist ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <InfinityIcon size={12} /> Remember permanently
                            </span>
                        ) : (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <Clock size={12} /> Forget after session (Session Only)
                            </span>
                        )}
                    </label>
                </div>
            </div>
        );
    };

    if (loading || !user) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
                <DaiyLogo size={48} animate className="animate-glow" />
            </div>
        );
    }

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
            {/* Header */}
            <header
                className="settings-header"
                style={{
                    borderBottom: "1px solid var(--border-default)",
                    background: "var(--bg-secondary)",
                    padding: "16px 24px",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                }}
            >
                <button
                    className="btn-ghost"
                    onClick={() => router.back()}
                    style={{ padding: "6px" }}
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Settings</h1>
            </header>

            <div className="settings-container" style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px" }}>
                {/* Profile Section */}
                <section className="card settings-card" style={{ padding: "28px", marginBottom: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", background: "var(--accent-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <User size={18} color="var(--accent)" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: "1.05rem", fontWeight: 600 }}>Profile</h2>
                            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>Manage your account details</p>
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div>
                            <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>
                                Display Name
                            </label>
                            <input
                                className="input-field"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Your name"
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>
                                Email
                            </label>
                            <input
                                className="input-field"
                                value={user.email || ""}
                                disabled
                                style={{ opacity: 0.5, cursor: "not-allowed" }}
                            />
                        </div>
                        <button
                            className="btn-primary"
                            onClick={handleSaveProfile}
                            disabled={saving || !displayName.trim()}
                            style={{ alignSelf: "flex-start" }}
                        >
                            {saved ? <><Check size={16} /> Saved!</> : saving ? "Saving..." : <><Save size={16} /> Save Changes</>}
                        </button>
                    </div>
                </section>

                {/* API Keys Section */}
                <section className="card settings-card" style={{ padding: "28px", marginBottom: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", background: "var(--accent-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Key size={18} color="var(--accent)" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: "1.05rem", fontWeight: 600 }}>API Keys</h2>
                            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>Add your own API keys for premium models</p>
                        </div>
                    </div>

                    <div
                        style={{
                            background: "var(--accent-muted)",
                            border: "1px solid rgba(16,185,129,0.15)",
                            borderRadius: "var(--radius-sm)",
                            padding: "12px 16px",
                            fontSize: "0.8125rem",
                            color: "var(--accent)",
                            marginBottom: "20px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                        }}
                    >
                        <Shield size={14} />
                        Keys are stored securely. Free models work without any keys.
                    </div>

                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <RenderKeyInput provider="openai" label="OpenAI (GPT-4)" />
                        <RenderKeyInput provider="anthropic" label="Anthropic (Claude)" />
                        <RenderKeyInput provider="google" label="Google (Gemini)" />
                        <RenderKeyInput provider="groq" label="Groq (Llama 3)" />

                        <button
                            className="btn-primary"
                            onClick={handleSaveKeys}
                            disabled={keysSaving}
                            style={{ alignSelf: "flex-start", marginTop: "12px" }}
                        >
                            {keysSaved ? <><Check size={16} /> Saved!</> : keysSaving ? "Saving..." : <><Save size={16} /> Save Keys</>}
                        </button>
                    </div>
                </section>

                {/* Model Preferences */}
                <section className="card settings-card" style={{ padding: "28px", marginBottom: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", background: "var(--accent-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Cpu size={18} color="var(--accent)" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: "1.05rem", fontWeight: 600 }}>Model Preferences</h2>
                            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>AI behavior settings</p>
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                            <input
                                type="checkbox"
                                checked={autoDetect}
                                onChange={(e) => { setAutoDetect(e.target.checked); handleSavePreferences(); }}
                                style={{ accentColor: "var(--accent)", width: 18, height: 18 }}
                            />
                            <div>
                                <div style={{ fontSize: "0.9375rem", fontWeight: 500 }}>Auto-detect best model</div>
                                <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                                    Use the best model based on available keys
                                </div>
                            </div>
                        </label>


                    </div>
                </section>

                {/* Danger Zone */}
                <section className="card" style={{ padding: "28px", borderColor: "rgba(239,68,68,0.2)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <AlertTriangle size={18} color="var(--color-error)" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--color-error)" }}>Danger Zone</h2>
                            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>Irreversible actions</p>
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <button
                            className="btn-secondary"
                            onClick={() => {
                                if (!user) return;
                                showConfirm(
                                    "Are you sure you want to delete ALL your chats? This action cannot be undone.",
                                    async () => {
                                        setDeletingChats(true);
                                        try {
                                            await deleteAllConversations(user.uid);
                                            toast("All chats deleted successfully", "success");
                                        } catch (err) {
                                            console.error("Failed to delete chats", err);
                                            toast("Failed to delete chats. Please try again.", "error");
                                        } finally {
                                            setDeletingChats(false);
                                        }
                                    },
                                    { confirmText: "Delete All", type: "danger" }
                                );
                            }}
                            disabled={deletingChats}
                            style={{
                                borderColor: "rgba(239,68,68,0.3)",
                                color: "var(--color-error)",
                            }}
                        >
                            {deletingChats ? "Deleting..." : <><Trash2 size={16} /> Delete All Chats</>}
                        </button>

                        <button
                            className="btn-secondary"
                            onClick={async () => {
                                await signOut();
                                router.push("/login");
                            }}
                            style={{
                                borderColor: "rgba(239,68,68,0.3)",
                                color: "var(--color-error)",
                            }}
                        >
                            <LogOut size={16} />
                            Sign Out
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
