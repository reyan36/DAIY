// ============================================================
// General Utility Functions
// ============================================================

import { Timestamp } from "firebase/firestore";

/**
 * Format a Firestore timestamp into a human-readable relative time
 */
export function formatRelativeTime(timestamp: Timestamp | null): string {
    if (!timestamp) return "";
    const now = Date.now();
    const date = timestamp.toDate();
    const diff = now - date.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
}

/**
 * Group conversations by date category
 */
export function groupByDate<T extends { lastMessageAt: Timestamp }>(
    items: T[]
): { label: string; items: T[] }[] {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const weekStart = new Date(todayStart.getTime() - 7 * 86400000);
    const monthStart = new Date(todayStart.getTime() - 30 * 86400000);

    const groups: Record<string, T[]> = {
        Today: [],
        Yesterday: [],
        "Previous 7 Days": [],
        "Previous 30 Days": [],
        Older: [],
    };

    for (const item of items) {
        const d = item.lastMessageAt?.toDate?.() || new Date(0);
        if (d >= todayStart) groups["Today"].push(item);
        else if (d >= yesterdayStart) groups["Yesterday"].push(item);
        else if (d >= weekStart) groups["Previous 7 Days"].push(item);
        else if (d >= monthStart) groups["Previous 30 Days"].push(item);
        else groups["Older"].push(item);
    }

    return Object.entries(groups)
        .filter(([, items]) => items.length > 0)
        .map(([label, items]) => ({ label, items }));
}

/**
 * Truncate a string to a max length with ellipsis
 */
export function truncate(str: string, maxLength: number = 40): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength).trimEnd() + "…";
}

/**
 * Generate a title from the first user message
 */
export function generateTitle(message: string): string {
    const cleaned = message.replace(/\n/g, " ").trim();
    return truncate(cleaned, 50);
}

/**
 * Mask an API key for display
 */
export function maskApiKey(key: string): string {
    if (key.length <= 8) return "••••••••";
    return key.slice(0, 4) + "••••" + key.slice(-4);
}

/**
 * cn — simple class name merger
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
    return classes.filter(Boolean).join(" ");
}

// ============================================================
// Thinking Block Parser
// ============================================================

export interface ThinkingStep {
    tag: string;
    text: string;
}

export interface ThinkingParseResult {
    isThinking: boolean;        // currently inside <think> block
    isComplete: boolean;        // </think> was found
    steps: ThinkingStep[];      // parsed steps so far
    responseContent: string;    // content after </think>
    rawThinking: string;        // raw text inside <think>
}

/**
 * Parse streaming content to extract thinking steps from <think> blocks.
 * Returns the parsed thinking steps and the remaining response content.
 */
export function parseThinkingContent(fullContent: string): ThinkingParseResult {
    const thinkOpenIdx = fullContent.indexOf("<think>");
    const thinkCloseIdx = fullContent.indexOf("</think>");

    // No thinking block at all
    if (thinkOpenIdx === -1) {
        return {
            isThinking: false,
            isComplete: false,
            steps: [],
            responseContent: fullContent,
            rawThinking: "",
        };
    }

    // Inside thinking block (no close tag yet)
    if (thinkCloseIdx === -1) {
        const rawThinking = fullContent.slice(thinkOpenIdx + 7);
        const steps = extractThinkingSteps(rawThinking);
        return {
            isThinking: true,
            isComplete: false,
            steps,
            responseContent: "",
            rawThinking,
        };
    }

    // Thinking block is complete
    const rawThinking = fullContent.slice(thinkOpenIdx + 7, thinkCloseIdx);
    const steps = extractThinkingSteps(rawThinking);
    const responseContent = fullContent.slice(thinkCloseIdx + 8).trim();

    return {
        isThinking: false,
        isComplete: true,
        steps,
        responseContent,
        rawThinking,
    };
}

/**
 * Extract individual thinking steps from raw thinking block text.
 * Looks for patterns like [TAG] text on the same line.
 */
function extractThinkingSteps(raw: string): ThinkingStep[] {
    const steps: ThinkingStep[] = [];
    const tagPattern = /\[(ANALYZING|DECOMPOSING|MAPPING|DETECTING|IDENTIFYING|STRATEGIZING|CONNECTING|EVALUATING|FORMULATING|RECALLING|QUESTIONING|SYNTHESIZING|CRITIQUING|REFINING|VALIDATING)\]\s*(.+)/gi;

    let match;
    while ((match = tagPattern.exec(raw)) !== null) {
        steps.push({
            tag: match[1].toUpperCase(),
            text: match[2].trim(),
        });
    }

    return steps;
}

/**
 * Strip <think>...</think> block from content for display
 */
export function stripThinkingBlock(content: string): string {
    return content.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();
}

/**
 * Parse timeline events from AI message content
 */
export function parseTimelineEvents(
    content: string
): { type: string; text: string }[] {
    const parts = content.split(/\[(QUESTION|ASSUMPTION|CHALLENGE|INSIGHT|BREAKTHROUGH)\]/i);
    const events: { type: string; text: string }[] = [];

    // parts[0] is text before first tag (ignore)
    // parts[1] is first tag type
    // parts[2] is text after first tag
    // parts[3] is second tag type...
    for (let i = 1; i < parts.length; i += 2) {
        const type = parts[i].toLowerCase();
        const textRaw = parts[i + 1] || "";
        // Clean up text: take first sentence or line, truncate
        const text = truncate(textRaw.trim().split("\n")[0], 80);
        events.push({ type, text });
    }

    return events;
}
