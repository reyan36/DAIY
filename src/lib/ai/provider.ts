// ============================================================
// AI Provider Abstraction Layer
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { SOCRATIC_SYSTEM_PROMPT } from "./prompts";

export type ProviderName = "gemini" | "openai" | "anthropic" | "groq";

interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

/**
 * Stream a chat completion from the appropriate provider.
 * Returns an async iterable of text chunks.
 */
export async function* streamChat(
    provider: ProviderName,
    model: string,
    messages: ChatMessage[],
    apiKey: string
): AsyncGenerator<string> {
    switch (provider) {
        case "gemini":
            yield* streamGemini(model, messages, apiKey);
            break;
        case "openai":
            yield* streamOpenAI(model, messages, apiKey);
            break;
        case "anthropic":
            yield* streamAnthropic(model, messages, apiKey);
            break;
        case "groq":
            yield* streamGroq(model, messages, apiKey);
            break;
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

/**
 * Non-streaming chat completion. Used for the analysis pass in extended thinking.
 * Returns the full response text.
 */
export async function completeChat(
    provider: ProviderName,
    model: string,
    messages: ChatMessage[],
    apiKey: string
): Promise<string> {
    switch (provider) {
        case "gemini":
            return completeGemini(model, messages, apiKey);
        case "openai":
            return completeOpenAI(model, messages, apiKey);
        case "anthropic":
            return completeAnthropic(model, messages, apiKey);
        case "groq":
            return completeGroq(model, messages, apiKey);
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

// ========== Gemini ==========

async function* streamGemini(
    model: string,
    messages: ChatMessage[],
    apiKey: string
): AsyncGenerator<string> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const systemMessage = messages.find(m => m.role === "system");
    const systemInstruction = systemMessage ? systemMessage.content : SOCRATIC_SYSTEM_PROMPT;

    const genModel = genAI.getGenerativeModel({
        model,
        systemInstruction,
    });

    const history = messages
        .filter((m) => m.role !== "system")
        .slice(0, -1)
        .map((m) => ({
            role: m.role === "assistant" ? ("model" as const) : ("user" as const),
            parts: [{ text: m.content }],
        }));

    const lastMessage = messages[messages.length - 1];
    const chat = genModel.startChat({ history });
    const result = await chat.sendMessageStream(lastMessage.content);

    for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
    }
}

async function completeGemini(
    model: string,
    messages: ChatMessage[],
    apiKey: string
): Promise<string> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const systemMessage = messages.find(m => m.role === "system");
    const systemInstruction = systemMessage ? systemMessage.content : SOCRATIC_SYSTEM_PROMPT;

    const genModel = genAI.getGenerativeModel({
        model,
        systemInstruction,
    });

    const history = messages
        .filter((m) => m.role !== "system")
        .slice(0, -1)
        .map((m) => ({
            role: m.role === "assistant" ? ("model" as const) : ("user" as const),
            parts: [{ text: m.content }],
        }));

    const lastMessage = messages[messages.length - 1];
    const chat = genModel.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    return result.response.text();
}

// ========== OpenAI ==========

async function* streamOpenAI(
    model: string,
    messages: ChatMessage[],
    apiKey: string
): AsyncGenerator<string> {
    const client = new OpenAI({ apiKey });
    const stream = await client.chat.completions.create({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
    });

    for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content;
        if (text) yield text;
    }
}

async function completeOpenAI(
    model: string,
    messages: ChatMessage[],
    apiKey: string
): Promise<string> {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: 0.8,
    });
    return response.choices[0]?.message?.content || "";
}

// ========== Anthropic ==========

async function* streamAnthropic(
    model: string,
    messages: ChatMessage[],
    apiKey: string
): AsyncGenerator<string> {
    const client = new Anthropic({ apiKey });

    const systemMsg = messages.find((m) => m.role === "system");
    const chatMsgs = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const stream = await client.messages.stream({
        model,
        max_tokens: 4096,
        system: systemMsg?.content || SOCRATIC_SYSTEM_PROMPT,
        messages: chatMsgs,
    });

    for await (const event of stream) {
        if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
        ) {
            yield event.delta.text;
        }
    }
}

async function completeAnthropic(
    model: string,
    messages: ChatMessage[],
    apiKey: string
): Promise<string> {
    const client = new Anthropic({ apiKey });

    const systemMsg = messages.find((m) => m.role === "system");
    const chatMsgs = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const response = await client.messages.create({
        model,
        max_tokens: 2048,
        system: systemMsg?.content || SOCRATIC_SYSTEM_PROMPT,
        messages: chatMsgs,
    });

    return response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");
}

// ========== Groq (uses OpenAI-compatible API) ==========

async function* streamGroq(
    model: string,
    messages: ChatMessage[],
    apiKey: string
): AsyncGenerator<string> {
    const client = new OpenAI({
        apiKey,
        baseURL: "https://api.groq.com/openai/v1",
    });

    const stream = await client.chat.completions.create({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
    });

    for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content;
        if (text) yield text;
    }
}

async function completeGroq(
    model: string,
    messages: ChatMessage[],
    apiKey: string
): Promise<string> {
    const client = new OpenAI({
        apiKey,
        baseURL: "https://api.groq.com/openai/v1",
    });

    const response = await client.chat.completions.create({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: 0.8,
    });
    return response.choices[0]?.message?.content || "";
}

/**
 * Determine the provider for a given model id
 */
export function getProviderForModel(modelId: string): ProviderName {
    if (modelId.startsWith("gemini")) return "gemini";
    if (modelId.startsWith("gpt")) return "openai";
    if (modelId.startsWith("claude")) return "anthropic";
    if (modelId.startsWith("llama") || modelId.includes("groq")) return "groq";
    // Default to groq (free) for unknown
    return "groq";
}
