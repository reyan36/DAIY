// ============================================================
// DAIY — Core Type Definitions
// ============================================================

import { Timestamp } from "firebase/firestore";

// --- User Types ---
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  apiKeys: ApiKeys;
  preferences: UserPreferences;
  updatedAt: Timestamp;
}

export interface ApiKeys {
  openai: string | null;
  anthropic: string | null;
  google: string | null;
  groq?: string | null;
}

export interface UserPreferences {
  autoDetectModel: boolean;
  preferredModel: string | null;
  extendedThinking?: boolean;
}

// --- Conversation Types ---
export interface Conversation {
  id: string;
  userId: string;
  title: string;
  subject: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastMessageAt: Timestamp;
  messageCount: number;
  model: string;
}

// --- Message Types ---
export type MessageRole = "user" | "assistant";
export type TimelineEventType =
  | "question"
  | "assumption"
  | "challenge"
  | "insight"
  | "breakthrough";

export interface Message {
  id: string;
  conversationId: string;
  userId: string;
  role: MessageRole;
  content: string;
  isBreakthrough: boolean;
  timelineEvent: TimelineEventType | null;
  createdAt: Timestamp;
  model: string | null;
}

// --- AI Model Types ---
export type AIProvider = "gemini" | "openai" | "anthropic" | "openrouter" | "groq";

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  isFree: boolean;
  description?: string;
}

export const AVAILABLE_MODELS: AIModel[] = [

  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    isFree: false,
    description: "OpenAI's flagship model",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    isFree: false,
    description: "Fast and affordable",
  },
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    provider: "anthropic",
    isFree: false,
    description: "Anthropic's balanced model",
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    provider: "groq",
    isFree: true,
    description: "Free via Groq — fast inference",
  },
];

// --- Timeline Types ---
export interface TimelineNode {
  id: string;
  type: TimelineEventType;
  label: string;
  messageId: string;
  timestamp: Timestamp;
}

// --- Chat State ---
export interface ChatState {
  conversationId: string | null;
  messages: Message[];
  isGenerating: boolean;
  currentModel: string;
  error: string | null;
}

// --- API Request/Response Types ---
export interface ChatRequest {
  conversationId: string | null;
  message: string;
  model?: string;
}

export interface ChatResponse {
  content: string;
  conversationId: string;
  messageId: string;
  isBreakthrough: boolean;
  timelineEvent: TimelineEventType | null;
}
