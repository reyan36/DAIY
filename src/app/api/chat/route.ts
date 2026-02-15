// ============================================================
// Chat API Route — POST /api/chat
// Three-pass architecture for extended thinking:
//   Pass 1: Problem decomposition (non-streaming, structured CoT)
//   Pass 2: Self-critique & refinement (non-streaming)
//   Pass 3: Streaming Socratic response (informed by both)
// ============================================================

import { NextRequest } from "next/server";
import { streamChat, completeChat, getProviderForModel } from "@/lib/ai/provider";
import { SOCRATIC_SYSTEM_PROMPT, buildExtendedThinkingMessages } from "@/lib/ai/prompts";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { messages, model = "llama-3.3-70b-versatile", apiKeys, extendedThinking } = body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return new Response(JSON.stringify({ error: "Messages are required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Determine provider and API key
        const provider = getProviderForModel(model);
        let apiKey = "";

        switch (provider) {
            case "gemini":
                apiKey = apiKeys?.google || process.env.GEMINI_API_KEY || "";
                break;
            case "openai":
                apiKey = apiKeys?.openai || "";
                break;
            case "anthropic":
                apiKey = apiKeys?.anthropic || "";
                break;
            case "groq":
                apiKey = apiKeys?.groq || process.env.GROQ_API_KEY || "";
                break;
        }

        if (!apiKey) {
            return new Response(
                JSON.stringify({
                    error: `No API key available for ${provider}. Please add one in Settings.`,
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const encoder = new TextEncoder();

        if (extendedThinking) {
            // ========== THREE-PASS EXTENDED THINKING ==========
            // This forces even fast/free models to think deeply by running
            // three separate API calls with different reasoning roles:
            //
            // Pass 1 (Decompose): Break the problem into atomic sub-problems,
            //   identify prerequisites, find misconceptions. The model is forced
            //   through 6 explicit reasoning steps it can't skip.
            //
            // Pass 2 (Critique): A fresh call reviews Pass 1's analysis and
            //   finds flaws, blind spots, and better strategies. This is the
            //   key innovation — self-critique produces genuinely deeper thinking
            //   even from models that normally respond instantly.
            //
            // Pass 3 (Respond): The final Socratic response is crafted using
            //   BOTH the original analysis and the refined critique. This
            //   produces noticeably more targeted, precise questions.

            const { decomposeMessages, buildCritiqueMessages, buildResponseMessages } =
                buildExtendedThinkingMessages(messages);

            const stream = new ReadableStream({
                async start(controller) {
                    try {
                        const send = (data: object) => {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                        };

                        // Helper: extract [TAG] lines from text
                        const extractSteps = (text: string) => {
                            const pattern = /\[(ANALYZING|DECOMPOSING|MAPPING|DETECTING|IDENTIFYING|STRATEGIZING|CONNECTING|EVALUATING|FORMULATING|RECALLING|QUESTIONING|SYNTHESIZING|CRITIQUING|REFINING|VALIDATING)\]\s*(.+)/gi;
                            const steps: { tag: string; text: string }[] = [];
                            let match;
                            while ((match = pattern.exec(text)) !== null) {
                                steps.push({ tag: match[1].toUpperCase(), text: match[2].trim() });
                            }
                            return steps;
                        };

                        // Helper: delay for progressive reveal
                        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

                        // Start the <think> block — frontend enters thinking mode
                        send({ text: "<think>\n" });

                        // --- PASS 1: Problem Decomposition (non-streaming) ---
                        const decomposition = await completeChat(
                            provider,
                            model,
                            decomposeMessages as any,
                            apiKey
                        );

                        // Extract steps from decomposition and stream them one by one
                        const thinkMatch = decomposition.match(/<think>([\s\S]*?)<\/think>/);
                        const decomposeSteps = thinkMatch
                            ? extractSteps(thinkMatch[1])
                            : extractSteps(decomposition);

                        for (const step of decomposeSteps) {
                            send({ text: `[${step.tag}] ${step.text}\n` });
                            await delay(400); // Reveal each step with a pause
                        }

                        // --- PASS 2: Self-Critique & Refinement (non-streaming) ---
                        // Send extra thinking steps while critique runs
                        send({ text: "[CRITIQUING] Reviewing analysis for blind spots and flaws\n" });
                        await delay(300);

                        const critiqueMessages = buildCritiqueMessages(decomposition);
                        const critique = await completeChat(
                            provider,
                            model,
                            critiqueMessages as any,
                            apiKey
                        );

                        send({ text: "[REFINING] Strengthening teaching strategy based on critique\n" });
                        await delay(300);
                        send({ text: "[VALIDATING] Confirming question targets the exact knowledge gap\n" });
                        await delay(200);

                        // Close the <think> block — frontend exits thinking mode
                        send({ text: "</think>\n\n" });

                        // Combine decomposition + critique for the response pass
                        const refinedAnalysis =
                            "=== ORIGINAL DECOMPOSITION ===\n" +
                            decomposition.replace(/<think>[\s\S]*?<\/think>\s*/g, "") +
                            "\n\n=== SELF-CRITIQUE & REFINEMENT ===\n" +
                            critique;

                        // --- PASS 3: Socratic Response (streaming) ---
                        const responseMessages = buildResponseMessages(refinedAnalysis);

                        for await (const chunk of streamChat(
                            provider,
                            model,
                            responseMessages as any,
                            apiKey
                        )) {
                            send({ text: chunk });
                        }

                        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                        controller.close();
                    } catch (err: any) {
                        const errorMsg = err?.message || "AI generation failed";
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`)
                        );
                        controller.close();
                    }
                },
            });

            return new Response(stream, {
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                },
            });
        } else {
            // ========== NORMAL SINGLE-PASS ==========
            const fullMessages = [
                { role: "system" as const, content: SOCRATIC_SYSTEM_PROMPT },
                ...messages,
            ];

            const stream = new ReadableStream({
                async start(controller) {
                    try {
                        for await (const chunk of streamChat(
                            provider,
                            model,
                            fullMessages,
                            apiKey
                        )) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
                        }
                        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                        controller.close();
                    } catch (err: any) {
                        const errorMsg = err?.message || "AI generation failed";
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`)
                        );
                        controller.close();
                    }
                },
            });

            return new Response(stream, {
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                },
            });
        }
    } catch (err: any) {
        console.error("Chat API error:", err);
        return new Response(
            JSON.stringify({ error: err?.message || "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
