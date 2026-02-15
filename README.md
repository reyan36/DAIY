# DAIY — Discover • Adapt • Invent • Yourself

An AI-powered Socratic learning tool that helps you build genuine understanding by **guiding you to answers** instead of giving them to you.

![DAIY Banner](public/daiy-banner.png)

## Features

- **Socratic AI Chat**: Never gives direct answers. It asks questions, challenges assumptions, and guides your thinking.
- **Breakthrough Detection**: Celebrates when you have a genuine "Aha!" moment.
- **Reasoning Timeline**: Visualizes your thought process (Question → Assumption → Challenge → Insight).
- **Multi-Model Support**: Use free models (Gemini Flash, Llama 3 via Groq) or bring your own keys (OpenAI, Anthropic).
- **Secure Architecture**: API keys are encrypted client-side or stored securely in Firestore (depending on configuration).

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + Custom Design System
- **Database**: Firebase Firestore
- **Auth**: Firebase Auth (Google + Email)
- **AI**: Vercel AI SDK patterns (custom implementation for Socratic behavior)
- **Animations**: Framer Motion & CSS

## Getting Started

### 1. Prerequisites

- Node.js 18+
- A Firebase project

### 2. Environment Setup

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Fill in your Firebase config and optional service keys:

```env
# Firebase Client Config (Required)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
# ... other firebase vars

# Optional Server-Side Keys for Free Tier
GEMINI_API_KEY=...
GROQ_API_KEY=...
```

### 3. Install Dependencies & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start learning.

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── api/          # Backend API routes (chat streaming)
│   ├── chat/         # Chat interface
│   ├── login/        # Auth pages
│   └── settings/     # User preferences
├── components/       # (Currently inline in pages for speed, will refactor)
├── context/          # React Context (Auth)
├── lib/              # Utilities
│   ├── ai/           # AI provider logic & prompts
│   ├── firebase.ts   # Firebase initialization
│   ├── firestore.ts  # Database operations
│   └── utils.ts      # Helper functions
└── types/            # TypeScript definitions
```

## Contributing

1. Fork the repo
2. Create a feature branch
3. Submit a PR
