import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
    addMessage,
    updateConversation,
    getMessages,
    getConversation,
    createConversation,
    deleteConversation,
    getConversations,
} from "@/lib/firestore";
import { generateTitle, parseTimelineEvents } from "@/lib/utils";
import type { Conversation, Message } from "@/types";
import { Timestamp } from "firebase/firestore";

export function useChat(conversationId?: string) {
    const { user, profile } = useAuth();
    const router = useRouter();

    // State
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [streamingContent, setStreamingContent] = useState("");
    const [currentModel, setCurrentModel] = useState("llama-3.3-70b-versatile");
    const [searchQuery, setSearchQuery] = useState("");

    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Load preferred model
    useEffect(() => {
        if (profile?.preferences?.preferredModel) {
            setCurrentModel(profile.preferences.preferredModel);
        }
    }, [profile]);

    // Load conversations
    const loadConversations = useCallback(async () => {
        if (!user) return;
        try {
            const convos = await getConversations(user.uid);
            setConversations(convos);
        } catch (error) {
            console.error("Failed to load conversations:", error);
        }
    }, [user]);

    // Load current conversation
    useEffect(() => {
        if (!user || !conversationId) {
            setCurrentConversation(null);
            setMessages([]);
            return;
        }

        let isMounted = true;
        (async () => {
            try {
                const convo = await getConversation(conversationId);
                if (isMounted) {
                    if (!convo || convo.userId !== user.uid) {
                        router.push("/chat");
                        return;
                    }
                    setCurrentConversation(convo);
                    const msgs = await getMessages(conversationId, user.uid);
                    setMessages(msgs);
                }
            } catch (error) {
                console.error("Failed to load conversation:", error);
            }
        })();

        return () => { isMounted = false; };
    }, [user, conversationId, router]);

    // Initial load
    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    // Handle sending a message
    const sendMessage = async () => {
        if (!input.trim() || isGenerating || !user) return;

        if (!conversationId) {
            return;
        }

        const userMessage = input.trim();
        setInput("");
        if (inputRef.current) inputRef.current.style.height = "auto";

        // Optimistic UI
        const tempUserMsg: Message = {
            id: "temp-user-" + Date.now(),
            conversationId,
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
            // Save user message
            await addMessage(conversationId, user.uid, "user", userMessage);

            // Update title if needed
            if (messages.length === 0) {
                const title = generateTitle(userMessage);
                await updateConversation(conversationId, { title } as any);
                setCurrentConversation((prev) => (prev ? { ...prev, title } : prev));
                loadConversations();
            }

            setIsGenerating(true);
            setStreamingContent("");

            // Prepare API keys (Session > Profile)
            const sessionKeys = {
                openai: typeof window !== 'undefined' ? sessionStorage.getItem("daiy_apikey_openai") : null,
                anthropic: typeof window !== 'undefined' ? sessionStorage.getItem("daiy_apikey_anthropic") : null,
                google: typeof window !== 'undefined' ? sessionStorage.getItem("daiy_apikey_google") : null,
            };

            const apiKeys = {
                openai: sessionKeys.openai || profile?.apiKeys?.openai,
                anthropic: sessionKeys.anthropic || profile?.apiKeys?.anthropic,
                google: sessionKeys.google || profile?.apiKeys?.google,
            };

            // Prepare history
            const historyForAI = messages
                .filter((m) => m.id !== tempUserMsg.id)
                .map((m) => ({ role: m.role, content: m.content }));
            historyForAI.push({ role: "user", content: userMessage });

            // Call API
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: historyForAI,
                    model: currentModel,
                    apiKeys,
                    extendedThinking: profile?.preferences?.extendedThinking || false,
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Failed to get response");
            }

            // Stream handling
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullContent = "";

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
                                    setStreamingContent(fullContent);
                                }
                            } catch (e) { /* ignore malformed */ }
                        }
                    }
                }
            }

            // Process completion
            const isBreakthrough = fullContent.includes("[BREAKTHROUGH]");
            const timelineEvents = parseTimelineEvents(fullContent);
            const mainEvent = timelineEvents.length > 0 ? timelineEvents[timelineEvents.length - 1].type : null;

            const assistantMsgId = await addMessage(
                conversationId,
                user.uid,
                "assistant",
                fullContent,
                currentModel,
                isBreakthrough,
                mainEvent
            );

            const assistantMsg: Message = {
                id: assistantMsgId,
                conversationId,
                userId: user.uid,
                role: "assistant",
                content: fullContent,
                isBreakthrough,
                timelineEvent: mainEvent as any,
                createdAt: Timestamp.now(),
                model: currentModel,
            };

            setMessages((prev) => [...prev, assistantMsg]);
            setStreamingContent("");
            loadConversations();
        } catch (err: any) {
            console.error("Chat error:", err);
            const errorMsg: Message = {
                id: "error-" + Date.now(),
                conversationId,
                userId: user.uid,
                role: "assistant",
                content: `⚠️ Error: ${err.message || "Something went wrong."}`,
                isBreakthrough: false,
                timelineEvent: null,
                createdAt: Timestamp.now(),
                model: null,
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setIsGenerating(false);
            setStreamingContent("");
        }
    };

    const createNewChat = async () => {
        if (!user) return;
        try {
            const id = await createConversation(user.uid, "New Conversation", currentModel);
            router.push(`/chat/${id}`);
        } catch (error) {
            console.error("Failed to create chat:", error);
        }
    };

    const deleteChat = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!user) return;
        try {
            await deleteConversation(id, user.uid);
            loadConversations();
            if (id === conversationId) {
                router.push("/chat");
            }
        } catch (error) {
            console.error("Failed to delete chat:", error);
        }
    };

    return {
        conversations,
        currentConversation,
        messages,
        input,
        setInput,
        isGenerating,
        streamingContent,
        currentModel,
        setCurrentModel,
        searchQuery,
        setSearchQuery,
        inputRef,
        sendMessage,
        createNewChat,
        deleteChat,
        loadConversations,
    };
}
