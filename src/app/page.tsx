"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowRight,
  Sparkles,
  Target,
  BookOpen,
  Code2,
  PenTool,
  FlaskConical,
  ChevronDown,
  MessageSquare,
  Lightbulb,
  Trophy,
  Zap,
  Shield,
  Users,
  Clock,
  Brain,
  CheckCircle,
} from "lucide-react";
import DaiyLogo from "@/components/DaiyLogo";

// Intersection Observer hook for scroll-triggered animations
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

// Animated counter component
function AnimatedNumber({ target, suffix = "" }: { target: string; suffix?: string }) {
  const { ref, isVisible } = useInView();
  return (
    <span ref={ref} className={isVisible ? "count-animate" : ""} style={{ opacity: isVisible ? 1 : 0 }}>
      {target}{suffix}
    </span>
  );
}

// Demo chat conversation that auto-plays
function DemoChat() {
  const [visibleMessages, setVisibleMessages] = useState(0);
  const { ref, isVisible } = useInView(0.3);

  useEffect(() => {
    if (!isVisible) return;
    const messages = 4;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setVisibleMessages(i);
      if (i >= messages) clearInterval(timer);
    }, 800);
    return () => clearInterval(timer);
  }, [isVisible]);

  const chatMessages = [
    { role: "user", text: "Why is my for loop printing undefined?" },
    { role: "ai", text: "Let's trace through this together. What value does your loop variable have on the very first iteration?" },
    { role: "user", text: "Oh wait... it starts at 1, but my array index starts at 0!" },
    { role: "ai", tag: "BREAKTHROUGH", text: "Exactly! You just found an off-by-one error. That's one of the most common bugs in programming. How would you fix it?" },
  ];

  return (
    <div ref={ref} style={{
      background: "var(--bg-secondary)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-lg)",
      padding: "24px",
      maxWidth: 520,
      width: "100%",
    }}>
      {/* Chat header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", paddingBottom: "14px", borderBottom: "1px solid var(--border-default)" }}>
        <DaiyLogo size={24} animate={visibleMessages > 0 && visibleMessages < chatMessages.length} />
        <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)" }}>DAIY Session</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#F59E0B" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
        </div>
      </div>

      {/* Messages */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px", minHeight: 200 }}>
        {chatMessages.map((msg, i) => {
          if (i >= visibleMessages) return null;
          const isUser = msg.role === "user";
          return (
            <div
              key={i}
              className={isUser ? "bubble-right" : "bubble-left"}
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
                animationDelay: `${i * 0.1}s`,
              }}
            >
              {!isUser && <DaiyLogo size={22} />}
              <div style={{
                padding: "10px 14px",
                borderRadius: isUser ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                background: isUser ? "var(--bg-tertiary)" : "var(--accent-muted)",
                border: `1px solid ${isUser ? "var(--border-default)" : "rgba(16,185,129,0.15)"}`,
                fontSize: "0.8125rem",
                lineHeight: 1.6,
                color: "var(--text-primary)",
                maxWidth: "85%",
              }}>
                {"tag" in msg && msg.tag && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    background: "rgba(16,185,129,0.15)", color: "var(--accent)",
                    padding: "2px 8px", borderRadius: "var(--radius-full)",
                    fontSize: "0.6875rem", fontWeight: 600, marginBottom: "6px",
                  }}>
                    <Trophy size={10} /> Breakthrough!
                  </span>
                )}
                {msg.text}
              </div>
              {isUser && (
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "var(--bg-tertiary)", border: "1px solid var(--border-default)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.625rem", fontWeight: 600, color: "var(--text-secondary)", flexShrink: 0,
                }}>U</div>
              )}
            </div>
          );
        })}
        {visibleMessages > 0 && visibleMessages < chatMessages.length && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <DaiyLogo size={22} animate />
            <div style={{ display: "flex", gap: "4px", padding: "8px" }}>
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);
  const [navScrolled, setNavScrolled] = useState(false);

  // NO auto-redirect — logged-in users should be able to see the landing page
  // They get a "Go to Chat" button in the nav instead

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      setNavScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Section visibility hooks
  const howItWorks = useInView(0.1);
  const features = useInView(0.1);
  const stats = useInView(0.2);
  const cta = useInView(0.2);

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      {/* ============ NAVIGATION ============ */}
      <nav
        className={`landing-nav ${navScrolled ? "nav-scrolled" : ""}`}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: "14px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: navScrolled ? "rgba(0,0,0,0.85)" : "transparent",
          backdropFilter: navScrolled ? "blur(20px)" : "none",
          borderBottom: navScrolled ? "1px solid var(--border-default)" : "1px solid transparent",
          transition: "all 0.3s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <DaiyLogo size={32} />
          <span style={{
            fontSize: "1.2rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}>
            DAIY
          </span>
        </div>
        <div className="landing-nav-actions" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {!loading && user ? (
            <button
              className="btn-primary"
              onClick={() => router.push("/chat")}
              style={{ padding: "10px 24px" }}
            >
              Go to Chat
              <ArrowRight size={16} />
            </button>
          ) : (
            <>
              <button
                className="btn-ghost"
                onClick={() => router.push("/login")}
                style={{ padding: "10px 20px" }}
              >
                Log in
              </button>
              <button
                className="btn-primary"
                onClick={() => router.push("/login")}
                style={{ padding: "10px 24px" }}
              >
                Get Started
                <ArrowRight size={16} />
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ============ HERO SECTION ============ */}
      <section
        className="landing-hero"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "120px 24px 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Animated background orbs */}
        <div style={{
          position: "absolute", top: "15%", left: "5%",
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)",
          filter: "blur(80px)",
          transform: `translateY(${scrollY * 0.08}px)`,
        }} />
        <div style={{
          position: "absolute", bottom: "10%", right: "5%",
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)",
          filter: "blur(60px)",
          transform: `translateY(${scrollY * -0.05}px)`,
        }} />
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: `translate(-50%, -50%) translateY(${scrollY * 0.03}px)`,
          width: 800, height: 800, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 60%)",
          filter: "blur(100px)",
        }} />

        {/* Grid pattern background */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `
            linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
        }} />

        {/* Hero Logo */}
        <div className="hero-logo-animate" style={{ marginBottom: "32px", position: "relative" }}>
          <DaiyLogo size={80} />
          {/* Pulse rings */}
          <div style={{
            position: "absolute", inset: -8,
            border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: "50%",
          }} className="ring-pulse" />
          <div style={{
            position: "absolute", inset: -20,
            border: "1px solid rgba(16,185,129,0.1)",
            borderRadius: "50%",
            animationDelay: "0.5s",
          }} className="ring-pulse" />
        </div>

        {/* Badge */}
        <div
          className="animate-fade-up"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 20px",
            background: "var(--accent-muted)",
            border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: "var(--radius-full)",
            marginBottom: "28px",
            color: "var(--accent)",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          <Sparkles size={14} />
          AI that teaches, not tells
        </div>

        {/* Main heading */}
        <h1
          className="animate-fade-up"
          style={{
            fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            maxWidth: 800,
            marginBottom: "24px",
            color: "var(--text-primary)",
            animationDelay: "0.15s",
            position: "relative",
          }}
        >
          Learn to think,{" "}
          <span className="gradient-text-animated">
            not to copy
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="animate-fade-up"
          style={{
            fontSize: "clamp(1.05rem, 2vw, 1.3rem)",
            color: "var(--text-secondary)",
            maxWidth: 580,
            lineHeight: 1.7,
            marginBottom: "48px",
            animationDelay: "0.3s",
            position: "relative",
          }}
        >
          DAIY uses the Socratic method to guide you through problems.
          No answers given — just the right questions to unlock genuine understanding.
        </p>

        {/* CTA buttons */}
        <div
          className="animate-fade-up"
          style={{
            display: "flex",
            gap: "16px",
            flexWrap: "wrap",
            justifyContent: "center",
            animationDelay: "0.45s",
            position: "relative",
          }}
        >
          <button
            className="btn-primary"
            onClick={() => router.push(user ? "/chat" : "/login")}
            style={{
              padding: "16px 40px",
              fontSize: "1.05rem",
              boxShadow: "0 0 30px rgba(16,185,129,0.2)",
            }}
          >
            {user ? "Go to Chat" : "Start Learning Free"}
            <ArrowRight size={18} />
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
            }}
            style={{ padding: "16px 36px", fontSize: "1.05rem" }}
          >
            See How It Works
          </button>
        </div>

        {/* Scroll indicator */}
        <div
          className="animate-float"
          style={{
            position: "absolute",
            bottom: 40,
            left: "50%",
            transform: "translateX(-50%)",
            color: "var(--text-muted)",
            opacity: Math.max(0, 1 - scrollY / 200),
            transition: "opacity 0.2s",
          }}
        >
          <ChevronDown size={24} />
        </div>
      </section>

      {/* ============ LIVE DEMO SECTION ============ */}
      <section style={{ padding: "80px 24px 100px", position: "relative" }}>
        <div className="section-divider" style={{ marginBottom: "80px" }} />
        <div style={{
          maxWidth: 1100, margin: "0 auto",
          display: "flex", alignItems: "center", gap: "60px",
          flexWrap: "wrap", justifyContent: "center",
        }}>
          <div style={{ flex: "1 1 400px", maxWidth: 460 }}>
            <div
              ref={howItWorks.ref}
              className={howItWorks.isVisible ? "animate-fade-up" : ""}
              style={{ opacity: howItWorks.isVisible ? 1 : 0 }}
            >
              <span style={{
                fontSize: "0.75rem", fontWeight: 600, color: "var(--accent)",
                textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px", display: "block",
              }}>
                See it in action
              </span>
              <h2 style={{
                fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em",
                marginBottom: "16px", lineHeight: 1.2,
              }}>
                A conversation, not a lecture
              </h2>
              <p style={{
                color: "var(--text-secondary)", fontSize: "1.05rem",
                lineHeight: 1.7, marginBottom: "32px",
              }}>
                DAIY doesn&apos;t hand you answers. It asks the right questions at the right time,
                guiding you to that breakthrough moment where everything clicks.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {[
                  { icon: <Target size={18} />, text: "Identifies your exact knowledge gap" },
                  { icon: <Zap size={18} />, text: "Challenges assumptions you didn't know you had" },
                  { icon: <Trophy size={18} />, text: "Celebrates when YOU find the answer" },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    color: "var(--text-secondary)", fontSize: "0.95rem",
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "var(--radius-sm)",
                      background: "var(--accent-muted)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "var(--accent)", flexShrink: 0,
                    }}>
                      {item.icon}
                    </div>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Live Demo Chat */}
          <DemoChat />
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section
        id="how-it-works"
        className="landing-section"
        style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}
      >
        <div
          ref={features.ref}
          style={{ textAlign: "center", marginBottom: "72px" }}
          className={features.isVisible ? "animate-fade-up" : ""}
        >
          <h2 style={{
            fontSize: "2.25rem", fontWeight: 700,
            letterSpacing: "-0.02em", marginBottom: "16px",
          }}>
            Three steps to{" "}
            <span className="gradient-text-animated">real understanding</span>
          </h2>
          <p style={{
            color: "var(--text-secondary)", fontSize: "1.1rem",
            maxWidth: 500, margin: "0 auto",
          }}>
            The Socratic method, powered by AI
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px",
        }}>
          {[
            {
              step: "01",
              icon: <MessageSquare size={28} />,
              title: "Ask Your Question",
              desc: "Paste your code, describe your problem, or share any question. DAIY adapts to coding, math, writing, science, and beyond.",
              delay: "0s",
            },
            {
              step: "02",
              icon: <Brain size={28} />,
              title: "Think Deeper",
              desc: "DAIY asks targeted questions that challenge your assumptions. With Deep Thinking mode, it analyzes your problem through multiple reasoning passes.",
              delay: "0.15s",
            },
            {
              step: "03",
              icon: <Lightbulb size={28} />,
              title: "Own Your Breakthrough",
              desc: "When you discover the answer yourself, it truly sticks. DAIY celebrates your breakthrough — you earned that knowledge.",
              delay: "0.3s",
            },
          ].map((item, i) => (
            <div
              key={i}
              className={`landing-card ${features.isVisible ? "animate-fade-up" : ""}`}
              style={{
                padding: "40px 32px",
                textAlign: "center",
                animationDelay: item.delay,
                opacity: features.isVisible ? 1 : 0,
              }}
            >
              <div style={{
                fontSize: "3rem", fontWeight: 800,
                color: "rgba(16,185,129,0.1)",
                lineHeight: 1, marginBottom: "16px",
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {item.step}
              </div>
              <div style={{
                width: 60, height: 60,
                borderRadius: "var(--radius-md)",
                background: "var(--accent-muted)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
                color: "var(--accent)",
              }}>
                {item.icon}
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "12px" }}>
                {item.title}
              </h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem" }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ FEATURES GRID ============ */}
      <section style={{ padding: "60px 24px 100px", maxWidth: 1100, margin: "0 auto" }}>
        <div className="section-divider" style={{ marginBottom: "80px" }} />

        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <h2 style={{
            fontSize: "2.25rem", fontWeight: 700,
            letterSpacing: "-0.02em", marginBottom: "16px",
          }}>
            Works across{" "}
            <span className="gradient-text-animated">every field</span>
          </h2>
          <p style={{
            color: "var(--text-secondary)", fontSize: "1.1rem",
            maxWidth: 480, margin: "0 auto",
          }}>
            One tool, any subject. DAIY adapts its Socratic approach to your domain.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "16px",
        }}>
          {[
            {
              icon: <Code2 size={22} />,
              title: "Coding & CS",
              desc: "Debug errors, design algorithms, understand architecture patterns",
              color: "#3B82F6",
            },
            {
              icon: <FlaskConical size={22} />,
              title: "Math & Science",
              desc: "Solve proofs, grasp concepts, work through problem sets",
              color: "#8B5CF6",
            },
            {
              icon: <PenTool size={22} />,
              title: "Writing & Essays",
              desc: "Strengthen arguments, improve clarity, develop your thesis",
              color: "#F59E0B",
            },
            {
              icon: <BookOpen size={22} />,
              title: "Any Subject",
              desc: "Law, philosophy, medicine, business — if it can be taught, DAIY can guide",
              color: "#10B981",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="landing-card"
              style={{ padding: "28px 24px", display: "flex", gap: "16px", alignItems: "flex-start" }}
            >
              <div style={{
                width: 44, height: 44,
                borderRadius: "var(--radius-sm)",
                background: `${feature.color}15`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: feature.color, flexShrink: 0,
              }}>
                {feature.icon}
              </div>
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "6px" }}>
                  {feature.title}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>
                  {feature.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ KEY DIFFERENTIATORS ============ */}
      <section style={{ padding: "60px 24px 100px", maxWidth: 900, margin: "0 auto" }}>
        <div className="section-divider" style={{ marginBottom: "80px" }} />

        <div
          ref={stats.ref}
          style={{ textAlign: "center", marginBottom: "64px" }}
          className={stats.isVisible ? "animate-fade-up" : ""}
        >
          <h2 style={{
            fontSize: "2rem", fontWeight: 700,
            letterSpacing: "-0.02em", marginBottom: "16px",
          }}>
            Why DAIY is different
          </h2>
          <p style={{
            color: "var(--text-secondary)", fontSize: "1.05rem",
            maxWidth: 500, margin: "0 auto",
          }}>
            Built for learning, not for shortcuts
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "24px",
        }}>
          {[
            {
              icon: <Shield size={20} />,
              title: "Never Gives Answers",
              desc: "DAIY is architecturally prevented from giving direct answers. It can only guide.",
            },
            {
              icon: <Brain size={20} />,
              title: "Deep Thinking Mode",
              desc: "Three-pass analysis that forces even fast models to reason deeply about your problem.",
            },
            {
              icon: <Zap size={20} />,
              title: "Free to Start",
              desc: "Llama 3.3 70B on Groq is completely free. Bring your own keys for GPT-4 or Claude.",
            },
            {
              icon: <Clock size={20} />,
              title: "Reasoning Timeline",
              desc: "Watch your learning journey unfold — from first question to breakthrough.",
            },
            {
              icon: <Users size={20} />,
              title: "Any Learner",
              desc: "From first-year students to experienced developers. DAIY adapts to your level.",
            },
            {
              icon: <CheckCircle size={20} />,
              title: "Privacy First",
              desc: "Session-only API keys, no tracking. Your learning data stays yours.",
            },
          ].map((item, i) => (
            <div
              key={i}
              className={stats.isVisible ? "animate-fade-up" : ""}
              style={{
                padding: "24px",
                animationDelay: `${i * 0.1}s`,
                opacity: stats.isVisible ? 1 : 0,
              }}
            >
              <div style={{
                width: 40, height: 40,
                borderRadius: "var(--radius-sm)",
                background: "var(--accent-muted)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--accent)", marginBottom: "14px",
              }}>
                {item.icon}
              </div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "8px" }}>
                {item.title}
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.6 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ CTA SECTION ============ */}
      <section
        style={{
          padding: "100px 24px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div className="section-divider" style={{ marginBottom: "80px" }} />

        {/* Background glow */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16,185,129,0.08), transparent 70%)",
          filter: "blur(80px)",
        }} />

        <div
          ref={cta.ref}
          className={cta.isVisible ? "animate-fade-up" : ""}
          style={{ opacity: cta.isVisible ? 1 : 0, position: "relative" }}
        >
          <DaiyLogo size={56} className="hero-logo-animate" style={{
            marginBottom: "28px",
            filter: "drop-shadow(0 0 20px rgba(16,185,129,0.3))",
          }} />

          <h2 style={{
            fontSize: "2.5rem", fontWeight: 700,
            letterSpacing: "-0.02em", marginBottom: "20px",
          }}>
            Ready to actually{" "}
            <span className="gradient-text-animated">learn</span>?
          </h2>
          <p style={{
            color: "var(--text-secondary)", fontSize: "1.15rem",
            marginBottom: "40px", maxWidth: 480, margin: "0 auto 40px",
            lineHeight: 1.7,
          }}>
            Stop collecting answers you&apos;ll forget tomorrow.
            Start building understanding that lasts.
          </p>
          <button
            className="btn-primary"
            onClick={() => router.push(user ? "/chat" : "/login")}
            style={{
              padding: "16px 48px", fontSize: "1.1rem",
              boxShadow: "0 0 40px rgba(16,185,129,0.15)",
            }}
          >
            {user ? "Open DAIY" : "Start Learning — It's Free"}
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="landing-footer" style={{
        borderTop: "1px solid var(--border-default)",
        padding: "40px 24px",
        textAlign: "center",
        color: "var(--text-muted)",
        fontSize: "0.875rem",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: "10px", marginBottom: "12px",
        }}>
          <DaiyLogo size={20} />
          <span style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.95rem" }}>DAIY</span>
        </div>
        <p style={{ color: "var(--text-muted)", marginBottom: "4px" }}>
          Discover &bull; Adapt &bull; Invent &bull; Yourself
        </p>
        <p style={{ fontSize: "0.8rem" }}>
          &copy; {new Date().getFullYear()} DAIY. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
