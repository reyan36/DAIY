"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
    getConversation,
    getConversations,
    getMessages,
    addMessage,
    updateConversation,
    deleteConversation,
    createConversation,
    updateUserProfile,
} from "@/lib/firestore";
import { generateTitle, groupByDate, truncate, cn, parseTimelineEvents, parseThinkingContent, stripThinkingBlock, type ThinkingStep } from "@/lib/utils";
import type { Conversation, Message } from "@/types";
import { Timestamp } from "firebase/firestore";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    Send,
    Plus,
    Menu,
    X,
    Settings,
    Trash2,
    MessageSquare,
    Sparkles,
    PanelRightOpen,
    PanelRightClose,
    LogOut,
    Search,
    HelpCircle,
    Lightbulb,
    Target,
    Zap,
    Trophy,
    Shield,
    Pencil,
    ExternalLink,
    ChevronDown,
} from "lucide-react";
import { signOut } from "@/lib/auth";
import DaiyLogo from "@/components/DaiyLogo";
import { useToast } from "@/components/Toast";

// Timeline event icons
const timelineIcons: Record<string, React.ReactNode> = {
    question: <HelpCircle size={14} />,
    assumption: <Target size={14} />,
    challenge: <Zap size={14} />,
    insight: <Lightbulb size={14} />,
    breakthrough: <Trophy size={14} />,
};

const timelineColors: Record<string, string> = {
    question: "#A3A3A3",
    assumption: "#F59E0B",
    challenge: "#EF4444",
    insight: "#3B82F6",
    breakthrough: "#10B981",
};

export default function ChatConversationPage() {
    const { user, loading, profile } = useAuth();
    const router = useRouter();
    const params = useParams();
    const { toast, confirm: showConfirm } = useToast();
    // Handle optional catch-all route [[...id]]
    const rawId = params?.id;
    const conversationIdFromParams = Array.isArray(rawId) ? rawId[0] : (rawId as string | undefined);

    // Active conversation ID — tracks the real ID even after creating a new conversation
    // (window.history.replaceState does NOT update Next.js params, so we need local state)
    const [activeConvId, setActiveConvId] = useState<string | undefined>(conversationIdFromParams);

    // Sync from URL params when they change (e.g. clicking a sidebar conversation)
    useEffect(() => {
        setActiveConvId(conversationIdFromParams);
    }, [conversationIdFromParams]);

    const conversationId = activeConvId;

    // State
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [streamingContent, setStreamingContent] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [timelineOpen, setTimelineOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentModel, setCurrentModel] = useState("llama-3.3-70b-versatile");
    const [extendedThinking, setExtendedThinking] = useState(false);

    // Thinking visualization state
    const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
    const [isThinking, setIsThinking] = useState(false);
    const [thinkingComplete, setThinkingComplete] = useState(false);
    const [thinkingExpanded, setThinkingExpanded] = useState(true);
    const [thinkingStartTime, setThinkingStartTime] = useState<number | null>(null);
    const [thinkingDuration, setThinkingDuration] = useState<string>("");

    // Rename state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");

    // Load preferences
    useEffect(() => {
        if (profile?.preferences?.preferredModel) {
            // Check if preferred model is still valid (not gemini-2.0-flash)
            if (profile.preferences.preferredModel !== "gemini-2.0-flash") {
                setCurrentModel(profile.preferences.preferredModel);
            }
        }
        if (profile?.preferences?.extendedThinking !== undefined) {
            setExtendedThinking(profile.preferences.extendedThinking);
        }
    }, [profile]);

    const toggleExtendedThinking = async () => {
        if (!user) return;
        const newValue = !extendedThinking;
        setExtendedThinking(newValue);
        await updateUserProfile(user.uid, {
            preferences: {
                ...profile?.preferences,
                extendedThinking: newValue,
                autoDetectModel: profile?.preferences?.autoDetectModel ?? true,
                preferredModel: currentModel
            } as any
        });
        // refreshProfile is implied via useAuth update usually, or we can force it if exported
    };

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Keyboard shortcuts: Ctrl+N (new chat), Ctrl+K (search), Ctrl+Shift+T (thinking toggle)
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // Ctrl+N or Cmd+N → New Chat
            if ((e.ctrlKey || e.metaKey) && e.key === "n") {
                e.preventDefault();
                handleNewChat();
            }
            // Ctrl+K or Cmd+K → Focus search
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                if (!sidebarOpen) setSidebarOpen(true);
                // Small delay to allow sidebar to open before focusing
                setTimeout(() => {
                    searchInputRef.current?.focus();
                    searchInputRef.current?.select();
                }, 50);
            }
            // Ctrl+Shift+T or Cmd+Shift+T → Toggle extended thinking
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "T") {
                e.preventDefault();
                toggleExtendedThinking();
            }
        };
        window.addEventListener("keydown", handleGlobalKeyDown);
        return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sidebarOpen, extendedThinking, user, profile, currentModel]);

    // Auth guard
    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    // Load conversations list
    const loadConversations = useCallback(async () => {
        if (!user) return;
        const convos = await getConversations(user.uid);
        setConversations(convos);
    }, [user]);

    // Load current conversation and messages
    useEffect(() => {
        if (!user || !conversationId) return;
        // Clear thinking state when switching conversations
        setThinkingSteps([]);
        setIsThinking(false);
        setThinkingComplete(false);
        setThinkingDuration("");
        (async () => {
            const convo = await getConversation(conversationId);
            if (!convo || convo.userId !== user.uid) {
                router.push("/chat");
                return;
            }
            setCurrentConversation(convo);
            const msgs = await getMessages(conversationId, user.uid);
            setMessages(msgs);
        })();
    }, [user, conversationId, router]);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streamingContent]);

    // Auto-resize textarea
    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
    };

    // Send message
    const handleSend = async () => {
        if (!input.trim() || isGenerating || !user) return;

        // Ensure conversationId exists. If we are on /chat (no id), we shouldn't be here ideally, 
        // but handleNewChat should have redirected. 
        // If we are strictly on /chat/[id], conversationId is derived from params.
        let activeId = conversationId;
        if (!activeId) {
            try {
                if (!user) return;
                activeId = await createConversation(user.uid, "New Conversation", currentModel);
                // Update local state so subsequent messages use the same conversation
                setActiveConvId(activeId);
            } catch (error) {
                console.error("Failed to create conversation", error);
                return;
            }
        }

        const userMessage = input.trim();
        setInput("");
        if (inputRef.current) inputRef.current.style.height = "auto";

        // Optimistic add user message
        const tempUserMsg: Message = {
            id: "temp-user-" + Date.now(),
            conversationId: activeId!,
            userId: user.uid,
            role: "user",
            content: userMessage,
            isBreakthrough: false,
            timelineEvent: null,
            createdAt: Timestamp.now(),
            model: null,
        };
        setMessages((prev) => [...prev, tempUserMsg]);

        try {
            // Save user message to Firestore
            await addMessage(activeId!, user.uid, "user", userMessage);

            // Update title if first message
            if (messages.length === 0) {
                const title = generateTitle(userMessage);
                await updateConversation(activeId!, { title } as Partial<Conversation>);
                setCurrentConversation((prev) => (prev ? { ...prev, title } : prev));
                loadConversations();
            }

            if (!conversationId) {
                window.history.replaceState(null, "", `/chat/${activeId}`);
            }

            // Stream AI response
            setIsGenerating(true);
            setStreamingContent("");

            // Reset thinking state
            setThinkingSteps([]);
            setIsThinking(false);
            setThinkingComplete(false);
            setThinkingExpanded(true);
            setThinkingStartTime(extendedThinking ? Date.now() : null);
            setThinkingDuration("");

            // Prepare API keys (Session > Profile)
            const sessionKeys = {
                openai: typeof window !== 'undefined' ? sessionStorage.getItem("daiy_apikey_openai") : null,
                anthropic: typeof window !== 'undefined' ? sessionStorage.getItem("daiy_apikey_anthropic") : null,
                google: typeof window !== 'undefined' ? sessionStorage.getItem("daiy_apikey_google") : null,
                groq: typeof window !== 'undefined' ? sessionStorage.getItem("daiy_apikey_groq") : null,
            };

            const apiKeys = {
                openai: sessionKeys.openai || profile?.apiKeys?.openai,
                anthropic: sessionKeys.anthropic || profile?.apiKeys?.anthropic,
                google: sessionKeys.google || profile?.apiKeys?.google,
                groq: sessionKeys.groq || profile?.apiKeys?.groq,
            };

            const historyForAI = messages
                .filter((m) => m.id !== tempUserMsg.id)
                .map((m) => ({ role: m.role, content: m.content }));
            historyForAI.push({ role: "user", content: userMessage });

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: historyForAI,
                    model: currentModel,
                    apiKeys,
                    extendedThinking,
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Failed to get response");
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullContent = "";
            let thinkingDone = false; // local tracker (avoids stale closure)
            const sendStartTime = Date.now();

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split("\n");

                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            const data = line.slice(6);
                            if (data === "[DONE]") continue;
                            try {
                                const parsed = JSON.parse(data);
                                if (parsed.error) throw new Error(parsed.error);
                                if (parsed.text) {
                                    fullContent += parsed.text;

                                    // Parse thinking content if extended thinking is on
                                    if (extendedThinking) {
                                        const thinkResult = parseThinkingContent(fullContent);

                                        if (thinkResult.isThinking) {
                                            // Still inside <think> block
                                            setIsThinking(true);
                                            setThinkingSteps(thinkResult.steps);
                                            setStreamingContent(""); // Don't show raw thinking
                                        } else if (thinkResult.isComplete) {
                                            // Thinking done, now streaming response
                                            if (!thinkingDone) {
                                                thinkingDone = true;
                                                setIsThinking(false);
                                                setThinkingComplete(true);
                                                setThinkingSteps(thinkResult.steps);
                                                const elapsed = ((Date.now() - sendStartTime) / 1000).toFixed(1);
                                                setThinkingDuration(`${elapsed}s`);
                                                setThinkingExpanded(false); // Auto-collapse when done
                                            }
                                            setStreamingContent(thinkResult.responseContent);
                                        } else {
                                            setStreamingContent(fullContent);
                                        }
                                    } else {
                                        setStreamingContent(fullContent);
                                    }
                                }
                            } catch (e) {
                                // Skip malformed chunks
                            }
                        }
                    }
                }
            }

            // Strip thinking block before saving/displaying
            const cleanContent = extendedThinking ? stripThinkingBlock(fullContent) : fullContent;

            // Check for breakthrough
            const isBreakthrough = cleanContent.includes("[BREAKTHROUGH]");
            const timelineEvents = parseTimelineEvents(cleanContent);
            const mainEvent = timelineEvents.length > 0 ? timelineEvents[timelineEvents.length - 1].type : null;

            // Finalize thinking state
            if (extendedThinking && !thinkingDone) {
                const elapsed = ((Date.now() - sendStartTime) / 1000).toFixed(1);
                setThinkingDuration(`${elapsed}s`);
                setThinkingComplete(true);
                setIsThinking(false);
            }

            // Save assistant message (clean, no <think> block)
            const assistantMsgId = await addMessage(
                activeId!,
                user.uid,
                "assistant",
                cleanContent,
                currentModel,
                isBreakthrough,
                mainEvent
            );

            const assistantMsg: Message = {
                id: assistantMsgId,
                conversationId: activeId!,
                userId: user.uid,
                role: "assistant",
                content: cleanContent,
                isBreakthrough,
                timelineEvent: mainEvent as any,
                createdAt: Timestamp.now(),
                model: currentModel,
            };

            setMessages((prev) => [...prev, assistantMsg]);
            setStreamingContent("");
            loadConversations();
        } catch (err: any) {
            console.error("Chat generation failed:", err);
            const errorMsg: Message = {
                id: "error-" + Date.now(),
                conversationId: activeId!,
                userId: user.uid,
                role: "assistant",
                content: `⚠️ Error: ${err.message || "Something went wrong. Please try again."}`,
                isBreakthrough: false,
                timelineEvent: null,
                createdAt: Timestamp.now(),
                model: null,
            };
            setMessages((prev) => [...prev, errorMsg]);
            setStreamingContent("");
        } finally {
            setIsGenerating(false);
        }
    };

    // Handle Enter key
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // New chat — just navigate to /chat, conversation is created on first message
    const handleNewChat = () => {
        // Clear thinking state
        setThinkingSteps([]);
        setIsThinking(false);
        setThinkingComplete(false);
        setThinkingDuration("");
        setMessages([]);
        setCurrentConversation(null);
        setStreamingContent("");
        setActiveConvId(undefined);
        router.push("/chat");
    };

    // Delete chat
    const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;
        showConfirm(
            "Are you sure you want to delete this chat? This action cannot be undone.",
            async () => {
                try {
                    await deleteConversation(id, user.uid);
                    loadConversations();
                    toast("Chat deleted", "success");
                    if (id === conversationId) {
                        router.push("/chat");
                    }
                } catch (err) {
                    console.error("Delete failed", err);
                    toast("Failed to delete conversation. Please try again.", "error");
                }
            },
            { confirmText: "Delete", type: "danger" }
        );
    };

    // Rename Logic
    const startRename = (id: string, currentTitle: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(id);
        setEditTitle(currentTitle);
    };

    const handleRename = async (id: string, e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!editTitle.trim()) {
            setEditingId(null);
            return;
        }
        try {
            await updateConversation(id, { title: editTitle.trim() } as Partial<Conversation>);
            setEditingId(null);
            loadConversations();
        } catch (error) {
            console.error("Rename failed", error);
        }
    };

    // Filter conversations by search
    const filteredConversations = searchQuery
        ? conversations.filter((c) =>
            c.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : conversations;

    const groupedConversations = groupByDate(filteredConversations);

    // Timeline events from messages
    const timelineNodes = messages
        .filter((m) => m.role === "assistant" && m.timelineEvent)
        .map((m) => ({
            id: m.id,
            type: m.timelineEvent!,
            label: truncate(m.content.replace(/\[.*?\]/g, "").trim(), 60),
            messageId: m.id,
        }));

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
                <DaiyLogo size={48} animate className="animate-glow" />
            </div>
        );
    }

    return (
        <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>
            {/* Mobile sidebar overlay backdrop */}
            <div
                className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* ========== LEFT SIDEBAR ========== */}
            <aside
                className={`chat-sidebar ${sidebarOpen ? "open" : "closed"}`}
                style={{
                    width: sidebarOpen ? "var(--sidebar-width)" : 0,
                    minWidth: sidebarOpen ? "var(--sidebar-width)" : 0,
                    background: "var(--bg-secondary)",
                    borderRight: sidebarOpen ? "1px solid var(--border-default)" : "none",
                    display: "flex",
                    flexDirection: "column",
                    transition: "all var(--transition-normal)",
                    overflow: "hidden",
                }}
            >
                {/* Sidebar Header */}
                <div style={{ padding: "16px", borderBottom: "1px solid var(--border-default)" }}>
                    <button
                        onClick={() => { handleNewChat(); setSidebarOpen(false); }}
                        className="btn-primary"
                        style={{ width: "100%", padding: "10px", fontSize: "0.875rem" }}
                    >
                        <Plus size={16} />
                        New Chat
                    </button>
                </div>

                {/* Search */}
                <div style={{ padding: "12px 16px 0" }}>
                    <div style={{ position: "relative" }}>
                        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                        <input
                            ref={searchInputRef}
                            className="input-field"
                            placeholder="Search conversations...  (Ctrl+K)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ paddingLeft: 36, padding: "8px 12px 8px 36px", fontSize: "0.8125rem" }}
                        />
                    </div>
                </div>

                {/* Conversation List */}
                <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                    {groupedConversations.map((group) => (
                        <div key={group.label} style={{ marginBottom: "8px" }}>
                            <div style={{ padding: "8px 12px", fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                {group.label}
                            </div>
                            {group.items.map((convo) => (
                                <div
                                    key={convo.id}
                                    onClick={() => { router.push(`/chat/${convo.id}`); setSidebarOpen(false); }}
                                    style={{
                                        padding: "10px 12px",
                                        borderRadius: "var(--radius-sm)",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        background: convo.id === conversationId ? "var(--accent-muted)" : "transparent",
                                        color: convo.id === conversationId ? "var(--accent)" : "var(--text-secondary)",
                                        transition: "all var(--transition-fast)",
                                        position: "relative",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (convo.id !== conversationId) {
                                            (e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (convo.id !== conversationId) {
                                            (e.currentTarget as HTMLElement).style.background = "transparent";
                                        }
                                    }}
                                >
                                    {editingId === convo.id ? (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ flex: 1, display: "flex", gap: "4px" }}
                                        >
                                            <input
                                                autoFocus
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleRename(convo.id);
                                                    if (e.key === "Escape") setEditingId(null);
                                                }}
                                                onBlur={() => handleRename(convo.id)}
                                                style={{
                                                    width: "100%",
                                                    background: "var(--bg-primary)",
                                                    border: "1px solid var(--accent)",
                                                    borderRadius: "4px",
                                                    color: "var(--text-primary)",
                                                    fontSize: "0.8125rem",
                                                    padding: "2px 4px",
                                                    outline: "none"
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <MessageSquare size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
                                            <span style={{ flex: 1, fontSize: "0.8125rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {truncate(convo.title, 30)}
                                            </span>
                                            <div style={{ display: "flex", gap: "2px" }}>
                                                <button
                                                    onClick={(e) => startRename(convo.id, convo.title, e)}
                                                    className="sidebar-action-btn"
                                                    style={{
                                                        background: "none",
                                                        border: "none",
                                                        cursor: "pointer",
                                                        color: "var(--text-muted)",
                                                        padding: "4px",
                                                        borderRadius: "4px",
                                                        display: "flex",
                                                        opacity: 0.5,
                                                        transition: "all var(--transition-fast)",
                                                    }}
                                                    title="Rename"
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteConversation(convo.id, e)}
                                                    className="sidebar-action-btn"
                                                    style={{
                                                        background: "none",
                                                        border: "none",
                                                        cursor: "pointer",
                                                        color: "var(--text-muted)",
                                                        padding: "4px",
                                                        borderRadius: "4px",
                                                        display: "flex",
                                                        opacity: 0.5,
                                                        transition: "all var(--transition-fast)",
                                                    }}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                    {conversations.length === 0 && (
                        <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                            No conversations yet.
                            <br />
                            Start a new chat!
                        </div>
                    )}
                </div>

                {/* Sidebar Footer */}
                <div style={{ borderTop: "1px solid var(--border-default)", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "2px" }}>
                    <button
                        className="sidebar-footer-btn"
                        onClick={() => { router.push("/settings"); setSidebarOpen(false); }}
                    >
                        <Settings size={16} />
                        Settings
                    </button>
                    <button
                        className="sidebar-footer-btn"
                        onClick={() => { router.push("/privacy"); setSidebarOpen(false); }}
                    >
                        <Shield size={16} />
                        Privacy
                    </button>
                    <button
                        className="sidebar-footer-btn danger"
                        onClick={async () => { await signOut(); router.push("/login"); }}
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* ========== MAIN CHAT AREA ========== */}
            <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                {/* Chat Header */}
                <header
                    className="chat-header"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px 20px",
                        borderBottom: "1px solid var(--border-default)",
                        background: "var(--bg-secondary)",
                    }}
                >
                    <button
                        className="btn-ghost"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        style={{ padding: "6px" }}
                    >
                        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 className="chat-header-title" style={{ fontSize: "0.9375rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {currentConversation?.title || "New Conversation"}
                        </h2>
                    </div>

                    {/* Model Indicator */}
                    <select
                        className="model-selector"
                        value={currentModel}
                        onChange={(e) => setCurrentModel(e.target.value)}
                        style={{
                            background: "var(--bg-tertiary)",
                            color: "var(--text-secondary)",
                            border: "1px solid var(--border-default)",
                            borderRadius: "var(--radius-sm)",
                            padding: "6px 10px",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            fontFamily: "'Inter', sans-serif",
                            outline: "none",
                        }}
                    >
                        <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Free)</option>
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="gpt-4o-mini">GPT-4o Mini</option>
                        <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                    </select>

                    <button
                        className="btn-ghost timeline-toggle-btn"
                        onClick={() => setTimelineOpen(!timelineOpen)}
                        style={{ padding: "6px" }}
                    >
                        {timelineOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                    </button>
                </header>

                {/* Messages Area */}
                <div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    {messages.length === 0 && !streamingContent ? (
                        /* Empty state */
                        <div
                            style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "48px 24px",
                                gap: "24px",
                            }}
                        >
                            <DaiyLogo size={72} className="animate-float" style={{ filter: "drop-shadow(0 0 12px rgba(16, 185, 129, 0.4))" }} />
                            <div style={{ textAlign: "center" }}>
                                <h2 className="empty-state-title" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "8px" }}>
                                    What do you want to learn?
                                </h2>
                                <p className="empty-state-subtitle" style={{ color: "var(--text-secondary)", maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>
                                    Describe your problem, paste your code, or ask any question.
                                    I&apos;ll guide you to the answer, not give it to you.
                                </p>
                            </div>
                            <div
                                className="suggestion-pills"
                                style={{
                                    display: "flex",
                                    gap: "8px",
                                    flexWrap: "wrap",
                                    justifyContent: "center",
                                    maxWidth: 500,
                                }}
                            >
                                {[
                                    "Why is my loop not working?",
                                    "Help me understand recursion",
                                    "Review my essay argument",
                                    "Solve this calculus problem",
                                ].map((suggestion, i) => (
                                    <button
                                        key={i}
                                        className="btn-ghost"
                                        onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                                        style={{
                                            border: "1px solid var(--border-default)",
                                            borderRadius: "var(--radius-full)",
                                            fontSize: "0.8125rem",
                                            padding: "8px 16px",
                                        }}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Messages */
                        <div className="messages-container" style={{ maxWidth: 800, width: "100%", margin: "0 auto", padding: "24px 20px" }}>
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "animate-fade-in",
                                        msg.isBreakthrough && "breakthrough-msg"
                                    )}
                                    style={{
                                        display: "flex",
                                        gap: "14px",
                                        marginBottom: "24px",
                                        padding: msg.isBreakthrough ? "16px" : "0",
                                        borderRadius: msg.isBreakthrough ? "var(--radius-md)" : "0",
                                    }}
                                >
                                    {/* Avatar */}
                                    {msg.role === "assistant" ? (
                                        <DaiyLogo size={32} style={{ flexShrink: 0, marginTop: "2px" }} />
                                    ) : (
                                        <div
                                            style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: "50%",
                                                background: "var(--bg-tertiary)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                                marginTop: "2px",
                                                border: "1px solid var(--border-default)",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: "0.75rem",
                                                    fontWeight: 600,
                                                    color: "var(--text-secondary)",
                                                }}
                                            >
                                                {user?.displayName?.[0]?.toUpperCase() || "U"}
                                            </span>
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontSize: "0.75rem",
                                                fontWeight: 600,
                                                color: msg.role === "assistant" ? "var(--accent)" : "var(--text-secondary)",
                                                marginBottom: "6px",
                                            }}
                                        >
                                            {msg.role === "assistant" ? "DAIY" : user?.displayName || "You"}
                                            {msg.isBreakthrough && (
                                                <span
                                                    style={{
                                                        marginLeft: "8px",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: "4px",
                                                        background: "var(--accent-muted)",
                                                        color: "var(--accent)",
                                                        padding: "2px 8px",
                                                        borderRadius: "var(--radius-full)",
                                                        fontSize: "0.6875rem",
                                                    }}
                                                >
                                                    <Sparkles size={10} />
                                                    Breakthrough!
                                                </span>
                                            )}
                                        </div>
                                        <div className="markdown-content" style={{ fontSize: "0.9375rem", lineHeight: 1.7, color: "var(--text-primary)" }}>
                                            {msg.role === "assistant" ? (
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        a: ({ node, ...props }) => (
                                                            <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: "4px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                                                {props.children} <ExternalLink size={12} />
                                                            </a>
                                                        ),
                                                        strong: ({ node, ...props }) => (
                                                            <strong {...props} style={{ color: "var(--accent)", fontWeight: 700, backgroundColor: "rgba(16, 185, 129, 0.1)", padding: "0 4px", borderRadius: "4px" }}>{props.children}</strong>
                                                        ),
                                                        ul: ({ node, ...props }) => <ul {...props} style={{ paddingLeft: "1.5em", margin: "1.25em 0" }} />,
                                                        li: ({ node, ...props }) => <li {...props} style={{ marginBottom: "0.85em", lineHeight: "1.6" }} />
                                                    }}
                                                >
                                                    {msg.content.replace(/\[(QUESTION|ASSUMPTION|CHALLENGE|INSIGHT|BREAKTHROUGH)\]/gi, "")}
                                                </ReactMarkdown>
                                            ) : (
                                                <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Streaming message */}
                            {streamingContent && (
                                <div
                                    className="animate-fade-in"
                                    style={{ display: "flex", gap: "14px", marginBottom: "24px" }}
                                >
                                    <DaiyLogo size={32} animate style={{ flexShrink: 0, marginTop: "2px" }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--accent)", marginBottom: "6px" }}>
                                            DAIY
                                        </div>
                                        <div className="markdown-content" style={{ fontSize: "0.9375rem", lineHeight: 1.7 }}>
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    a: ({ node, ...props }) => (
                                                        <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: "4px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                                            {props.children} <ExternalLink size={12} />
                                                        </a>
                                                    ),
                                                    strong: ({ node, ...props }) => (
                                                        <strong {...props} style={{ color: "var(--accent)", fontWeight: 700, backgroundColor: "rgba(16, 185, 129, 0.1)", padding: "0 4px", borderRadius: "4px" }}>{props.children}</strong>
                                                    ),
                                                    ul: ({ node, ...props }) => <ul {...props} style={{ paddingLeft: "1.5em", margin: "1.25em 0" }} />,
                                                    li: ({ node, ...props }) => <li {...props} style={{ marginBottom: "0.85em", lineHeight: "1.6" }} />
                                                }}
                                            >
                                                {stripThinkingBlock(streamingContent).replace(/\[(QUESTION|ASSUMPTION|CHALLENGE|INSIGHT|BREAKTHROUGH)\]/gi, "")}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Thinking Visualization — always below streaming/response */}
                            {extendedThinking && (isThinking || thinkingComplete) && (
                                <div style={{ marginBottom: "16px" }}>
                                    <div className={cn("thinking-container", isThinking && "active")}>
                                        {/* Progress bar while thinking */}
                                        {isThinking && <div className="thinking-progress" />}

                                        {/* Header */}
                                        <div
                                            className="thinking-header"
                                            onClick={() => setThinkingExpanded(!thinkingExpanded)}
                                        >
                                            <div className="thinking-orb">
                                                <div className={cn("thinking-orb-inner", thinkingComplete && "done")} />
                                                <div className={cn("thinking-orb-ring", thinkingComplete && "done")} />
                                            </div>
                                            <div className="thinking-label">
                                                {isThinking ? "Thinking deeply..." : "Thought process"}
                                                {thinkingDuration && (
                                                    <span className="duration">{thinkingDuration}</span>
                                                )}
                                            </div>
                                            <ChevronDown
                                                size={16}
                                                className={cn("thinking-chevron", thinkingExpanded && "open")}
                                            />
                                        </div>

                                        {/* Steps */}
                                        {thinkingExpanded && thinkingSteps.length > 0 && (
                                            <div className="thinking-steps">
                                                {thinkingSteps.map((step, idx) => {
                                                    const isLatest = idx === thinkingSteps.length - 1 && isThinking;
                                                    const isDone = thinkingComplete || idx < thinkingSteps.length - 1;
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={cn("thinking-step", isLatest && "latest")}
                                                            style={{ animationDelay: `${idx * 0.1}s` }}
                                                        >
                                                            <div
                                                                className={cn(
                                                                    "thinking-step-dot",
                                                                    isLatest && "active",
                                                                    isDone && "done"
                                                                )}
                                                            />
                                                            <span className="thinking-step-tag">{step.tag}</span>
                                                            <span className="thinking-step-text">{step.text}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Summary when collapsed and complete */}
                                        {!thinkingExpanded && thinkingComplete && thinkingSteps.length > 0 && (
                                            <div className="thinking-summary">
                                                {thinkingSteps.length} reasoning steps completed
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Typing indicator (only show when NOT in thinking visualization) */}
                            {isGenerating && !streamingContent && !isThinking && (
                                <div style={{ display: "flex", gap: "14px", marginBottom: "24px" }}>
                                    <DaiyLogo size={32} animate style={{ flexShrink: 0 }} />
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingTop: "8px" }}>
                                        <span className="typing-dot" />
                                        <span className="typing-dot" />
                                        <span className="typing-dot" />
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div
                    className="input-area"
                    style={{
                        padding: "16px 20px",
                        borderTop: "1px solid var(--border-default)",
                        background: "var(--bg-secondary)",
                    }}
                >
                    <div
                        className="input-container"
                        style={{
                            maxWidth: 800,
                            margin: "0 auto",
                            display: "flex",
                            gap: "12px",
                            alignItems: "flex-end",
                        }}
                    >
                        <div
                            style={{
                                flex: 1,
                                position: "relative",
                            }}
                        >
                            <textarea
                                ref={inputRef}
                                className="input-textarea"
                                value={input}
                                onChange={handleTextareaChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Describe your problem or ask a question..."
                                rows={1}
                                disabled={isGenerating}
                                style={{
                                    width: "100%",
                                    padding: "14px 16px",
                                    background: "var(--bg-tertiary)",
                                    color: "var(--text-primary)",
                                    border: "1px solid var(--border-default)",
                                    borderRadius: "var(--radius-lg)",
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: "0.9375rem",
                                    lineHeight: 1.5,
                                    resize: "none",
                                    outline: "none",
                                    transition: "border-color var(--transition-fast)",
                                    maxHeight: 200,
                                }}
                                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                                onBlur={(e) => (e.target.style.borderColor = "var(--border-default)")}
                            />
                        </div>
                        <button
                            onClick={toggleExtendedThinking}
                            className={cn("thinking-toggle", extendedThinking && "active")}
                            title={extendedThinking ? "Deep Thinking: ON" : "Deep Thinking: OFF"}
                        >
                            <div className="thinking-toggle-track">
                                <div className="thinking-toggle-thumb" />
                            </div>
                            <span className="thinking-toggle-label">
                                {extendedThinking ? "Deep" : "Think"}
                            </span>
                        </button>
                        <button
                            className="send-button"
                            onClick={handleSend}
                            disabled={!input.trim() || isGenerating}
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: "50%",
                                background: input.trim() && !isGenerating ? "var(--accent)" : "var(--bg-tertiary)",
                                border: "none",
                                cursor: input.trim() && !isGenerating ? "pointer" : "not-allowed",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all var(--transition-fast)",
                                color: input.trim() && !isGenerating ? "#000" : "var(--text-muted)",
                                flexShrink: 0,
                            }}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                    <div
                        className="input-footer-text"
                        style={{
                            maxWidth: 800,
                            margin: "8px auto 0",
                            textAlign: "center",
                            fontSize: "0.7rem",
                            color: "var(--text-muted)",
                        }}
                    >
                        Model: {currentModel.includes("gemini") ? "Gemini" : currentModel.includes("gpt") ? "OpenAI" : currentModel.includes("claude") ? "Claude" : currentModel.includes("llama") ? "Llama" : currentModel}
                        {" • "}Socratic Intelligence
                    </div>
                </div>
            </main>

            {/* ========== RIGHT SIDEBAR — REASONING TIMELINE ========== */}
            <aside
                className="chat-timeline"
                style={{
                    width: timelineOpen ? "var(--timeline-width)" : 0,
                    minWidth: timelineOpen ? "var(--timeline-width)" : 0,
                    background: "var(--bg-secondary)",
                    borderLeft: timelineOpen ? "1px solid var(--border-default)" : "none",
                    transition: "all var(--transition-normal)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <div
                    style={{
                        padding: "16px 20px",
                        borderBottom: "1px solid var(--border-default)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                    }}
                >
                    <Sparkles size={16} color="var(--accent)" />
                    <h3 style={{ fontSize: "0.875rem", fontWeight: 600 }}>Reasoning Timeline</h3>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
                    {timelineNodes.length === 0 ? (
                        <div
                            style={{
                                textAlign: "center",
                                color: "var(--text-muted)",
                                fontSize: "0.8125rem",
                                padding: "32px 0",
                                lineHeight: 1.7,
                            }}
                        >
                            Your reasoning journey
                            <br />
                            will appear here as you
                            <br />
                            work through the problem.
                        </div>
                    ) : (
                        <div style={{ position: "relative", paddingLeft: "24px" }}>
                            {/* Vertical line */}
                            <div
                                style={{
                                    position: "absolute",
                                    left: "7px",
                                    top: "8px",
                                    bottom: "8px",
                                    width: "2px",
                                    background: "var(--border-default)",
                                }}
                            />
                            {timelineNodes.map((node, i) => (
                                <div
                                    key={node.id}
                                    className="animate-fade-in"
                                    style={{
                                        position: "relative",
                                        marginBottom: "20px",
                                        animationDelay: `${i * 0.1}s`,
                                    }}
                                >
                                    {/* Dot */}
                                    <div
                                        style={{
                                            position: "absolute",
                                            left: "-21px",
                                            top: "3px",
                                            width: "16px",
                                            height: "16px",
                                            borderRadius: "50%",
                                            background: timelineColors[node.type] || "var(--text-muted)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#000",
                                            boxShadow: node.type === "breakthrough" ? `0 0 8px ${timelineColors[node.type]}` : "none",
                                        }}
                                    >
                                        {timelineIcons[node.type]}
                                    </div>
                                    <div>
                                        <div
                                            style={{
                                                fontSize: "0.6875rem",
                                                fontWeight: 600,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.05em",
                                                color: timelineColors[node.type] || "var(--text-muted)",
                                                marginBottom: "2px",
                                            }}
                                        >
                                            {node.type}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: "0.8125rem",
                                                color: "var(--text-secondary)",
                                                lineHeight: 1.5,
                                            }}
                                        >
                                            {node.label}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
}
