import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DAIY — Discover • Adapt • Invent • Yourself",
  description:
    "AI-powered Socratic learning tool that guides you to discover answers yourself. Build real understanding across coding, math, writing, and more.",
  keywords: ["AI learning", "Socratic method", "education", "coding help", "problem solving"],
  authors: [{ name: "DAIY Team" }],
  openGraph: {
    title: "DAIY — Discover • Adapt • Invent • Yourself",
    description: "AI that teaches you to think, not gives you answers.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable}`}
        style={{ fontFamily: "'Inter', sans-serif" }}
        suppressHydrationWarning
      >
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
