"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, Trophy } from "lucide-react";
import DaiyLogo from "@/components/DaiyLogo";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ======================================================================
// Particle Canvas
// ======================================================================
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let particles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    const init = () => {
      resize();
      const count = Math.min(50, Math.floor((canvas.offsetWidth * canvas.offsetHeight) / 20000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
      }));
    };

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16, 185, 129, ${p.alpha})`;
        ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(16, 185, 129, ${0.04 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animationId = requestAnimationFrame(draw);
    };

    init();
    draw();
    window.addEventListener("resize", init);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", init);
    };
  }, []);

  return (
    <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
  );
}

// ======================================================================
// Demo Chat
// ======================================================================
function TypingDemo() {
  const [phase, setPhase] = useState<"typing" | "toggle" | "sending" | "sent" | "reset">("typing");
  const [typedText, setTypedText] = useState("");
  const [deepThinking, setDeepThinking] = useState(false);
  const [showSent, setShowSent] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const fullMessage = "Why does my function return undefined?";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          runCycle();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function runCycle() {
    // Phase 1: Type the message
    setPhase("typing");
    setTypedText("");
    setDeepThinking(false);
    setShowSent(false);

    let charIndex = 0;
    const typeTimer = setInterval(() => {
      charIndex++;
      setTypedText(fullMessage.slice(0, charIndex));
      if (charIndex >= fullMessage.length) {
        clearInterval(typeTimer);
        // Phase 2: Toggle deep thinking after a short pause
        setTimeout(() => {
          setPhase("toggle");
          setDeepThinking(true);
          // Phase 3: Send after a pause
          setTimeout(() => {
            setPhase("sending");
            setTimeout(() => {
              setPhase("sent");
              setShowSent(true);
              setTypedText("");
              // Phase 4: Reset and repeat
              setTimeout(() => {
                setPhase("reset");
                setTimeout(() => runCycle(), 800);
              }, 2500);
            }, 600);
          }, 1200);
        }, 600);
      }
    }, 50);
  }

  return (
    <div ref={ref} style={{
      background: "var(--bg-secondary)", border: "1px solid var(--border-default)",
      borderRadius: 16, padding: 0, maxWidth: 480, width: "100%", overflow: "hidden",
    }}>
      {/* Window chrome */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px", padding: "14px 20px",
        borderBottom: "1px solid var(--border-default)",
      }}>
        <DaiyLogo size={22} animate={phase === "sending"} />
        <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)" }}>DAIY</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#F59E0B" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
        </div>
      </div>

      {/* Sent message area */}
      <div style={{ padding: "20px 20px 16px", minHeight: 80, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        {showSent && (
          <div style={{
            display: "flex", gap: "10px", alignItems: "flex-start", justifyContent: "flex-end",
            animation: "fade-up 0.3s ease-out",
          }}>
            <div style={{
              padding: "10px 14px", borderRadius: "12px 12px 4px 12px",
              background: "var(--bg-tertiary)", border: "1px solid var(--border-default)",
              fontSize: "0.8125rem", lineHeight: 1.6, color: "var(--text-primary)", maxWidth: "85%",
            }}>
              {fullMessage}
            </div>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", background: "var(--bg-tertiary)",
              border: "1px solid var(--border-default)", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "0.625rem", fontWeight: 600,
              color: "var(--text-secondary)", flexShrink: 0,
            }}>U</div>
          </div>
        )}
        {showSent && (
          <div style={{
            display: "flex", gap: "10px", alignItems: "center", marginTop: 14,
            animation: "fade-up 0.3s ease-out 0.3s both",
          }}>
            <DaiyLogo size={22} animate />
            <div style={{ display: "flex", gap: "4px", padding: "8px" }}>
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            </div>
            <span style={{ fontSize: "0.7rem", color: "var(--accent)", fontWeight: 500, opacity: 0.7 }}>Deep thinking...</span>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{
        padding: "12px 16px", borderTop: "1px solid var(--border-default)",
        display: "flex", flexDirection: "column", gap: "10px",
      }}>
        {/* Deep thinking toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: 32, height: 18, borderRadius: 9,
            background: deepThinking ? "var(--accent)" : "rgba(255,255,255,0.1)",
            transition: "background 0.3s ease",
            position: "relative", cursor: "default",
          }}>
            <div style={{
              width: 14, height: 14, borderRadius: "50%", background: "white",
              position: "absolute", top: 2,
              left: deepThinking ? 16 : 2,
              transition: "left 0.3s ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }} />
          </div>
          <span style={{
            fontSize: "0.7rem", fontWeight: 600,
            color: deepThinking ? "var(--accent)" : "var(--text-muted)",
            transition: "color 0.3s ease",
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            Deep Thinking {deepThinking ? "ON" : "OFF"}
          </span>
        </div>

        {/* Input + send */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={{
            flex: 1, padding: "10px 14px", borderRadius: 10,
            background: "var(--bg-tertiary)", border: "1px solid var(--border-default)",
            fontSize: "0.8125rem", color: typedText ? "var(--text-primary)" : "var(--text-muted)",
            minHeight: 20, display: "flex", alignItems: "center",
          }}>
            {typedText || "Ask DAIY anything..."}
            {phase === "typing" && typedText && (
              <span style={{
                display: "inline-block", width: 2, height: 16,
                background: "var(--accent)", marginLeft: 1,
                animation: "pulse 0.8s ease-in-out infinite",
              }} />
            )}
          </div>
          <button style={{
            width: 36, height: 36, borderRadius: 10,
            background: (phase === "sending" || phase === "sent") ? "var(--accent)" : typedText ? "var(--accent)" : "rgba(255,255,255,0.06)",
            border: "none", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.3s ease", cursor: "default",
            transform: phase === "sending" ? "scale(0.9)" : "scale(1)",
          }}>
            <ArrowRight size={16} style={{ color: typedText || phase === "sent" ? "black" : "var(--text-muted)" }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ======================================================================
// Main Landing Page
// ======================================================================
export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [navScrolled, setNavScrolled] = useState(false);

  // Refs
  const heroRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const heroCTARef = useRef<HTMLDivElement>(null);
  const philosophyRef = useRef<HTMLDivElement>(null);
  const philosophyTextRef = useRef<HTMLParagraphElement>(null);
  const demoSectionRef = useRef<HTMLDivElement>(null);
  const demoTextRef = useRef<HTMLDivElement>(null);
  const demoChatRef = useRef<HTMLDivElement>(null);
  const horizontalRef = useRef<HTMLDivElement>(null);
  const horizontalTrackRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  // Nav scroll
  useEffect(() => {
    const handleScroll = () => setNavScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // GSAP Animations
  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      const ctx = gsap.context(() => {
        // ---- Hero entrance ----
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        if (headlineRef.current) {
          const words = headlineRef.current.querySelectorAll(".hero-word");
          tl.from(words, { y: 60, opacity: 0, duration: 0.6, stagger: 0.1 }, 0.3);
        }
        tl.from(subtitleRef.current, { y: 20, opacity: 0, duration: 0.6 }, "-=0.2");
        tl.from(heroCTARef.current, { y: 20, opacity: 0, duration: 0.6 }, "-=0.3");

        // Hero parallax
        gsap.to(".hero-bg-orb-1", { y: -120, scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: 1 } });
        gsap.to(".hero-bg-orb-2", { y: 80, scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: 1 } });

        // ---- Philosophy text reveal — words fade in on scroll ----
        if (philosophyTextRef.current) {
          const words = philosophyTextRef.current.querySelectorAll(".reveal-word");
          gsap.fromTo(words,
            { opacity: 0.15 },
            {
              opacity: 1,
              duration: 0.3,
              stagger: 0.05,
              ease: "none",
              scrollTrigger: {
                trigger: philosophyRef.current,
                start: "top 70%",
                end: "bottom 50%",
                scrub: 1,
              },
            }
          );
        }

        // ---- Demo section ----
        if (demoTextRef.current) {
          gsap.fromTo(demoTextRef.current, { x: -50, opacity: 0 }, {
            x: 0, opacity: 1, duration: 0.8, ease: "power2.out",
            scrollTrigger: { trigger: demoSectionRef.current, start: "top 80%", toggleActions: "play none none none" },
          });
        }
        if (demoChatRef.current) {
          gsap.fromTo(demoChatRef.current, { x: 50, opacity: 0 }, {
            x: 0, opacity: 1, duration: 0.8, ease: "power2.out",
            scrollTrigger: { trigger: demoSectionRef.current, start: "top 80%", toggleActions: "play none none none" },
          });
        }

        // ---- Horizontal scroll section ----
        if (horizontalRef.current && horizontalTrackRef.current) {
          const track = horizontalTrackRef.current;
          const totalScroll = track.scrollWidth - window.innerWidth;

          gsap.to(track, {
            x: -totalScroll,
            ease: "none",
            scrollTrigger: {
              trigger: horizontalRef.current,
              start: "top top",
              end: () => `+=${totalScroll}`,
              pin: true,
              scrub: 1,
              invalidateOnRefresh: true,
            },
          });
        }

        // ---- CTA ----
        if (ctaRef.current) {
          gsap.fromTo(ctaRef.current, { scale: 0.92, opacity: 0 }, {
            scale: 1, opacity: 1, duration: 0.8, ease: "power2.out",
            scrollTrigger: { trigger: ctaRef.current, start: "top 85%", toggleActions: "play none none none" },
          });
        }

        ScrollTrigger.refresh();
      });

      (window as unknown as Record<string, unknown>).__gsapCtx = ctx;
    });

    return () => {
      cancelAnimationFrame(frameId);
      const ctx = (window as unknown as Record<string, Record<string, unknown>>).__gsapCtx as gsap.Context | undefined;
      if (ctx) ctx.revert();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  // Magnetic button
  const handleMagnetic = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    gsap.to(e.currentTarget, { x: (e.clientX - rect.left - rect.width / 2) * 0.15, y: (e.clientY - rect.top - rect.height / 2) * 0.15, duration: 0.3, ease: "power2.out" });
  }, []);
  const handleMagneticLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" });
  }, []);

  // Philosophy text — split into words for per-word reveal
  const philosophyText = "We believe the best way to learn isn't to be given answers. It's to be asked the right questions. DAIY guides you through problems using the Socratic method — so every breakthrough is yours.";
  const philosophyWords = philosophyText.split(" ");

  // Horizontal scroll panels — typographic, no cards
  const panels = [
    { title: "Coding", question: "Why does my loop skip the last element?", color: "#3B82F6" },
    { title: "Math", question: "Can you prove this without induction?", color: "#8B5CF6" },
    { title: "Writing", question: "What makes this argument fall apart?", color: "#F59E0B" },
    { title: "Science", question: "Which variable did you forget to control?", color: "#EF4444" },
  ];

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh", overflowX: "hidden" }}>
      {/* ============ NAV ============ */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
        background: navScrolled ? "rgba(0,0,0,0.85)" : "transparent",
        backdropFilter: navScrolled ? "blur(20px)" : "none",
        borderBottom: navScrolled ? "1px solid var(--border-default)" : "1px solid transparent",
        transition: "all 0.3s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <DaiyLogo size={32} />
          <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>DAIY</span>
        </div>
        <div className="landing-nav-actions" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {!loading && user ? (
            <button className="btn-primary" onClick={() => router.push("/chat")} style={{ padding: "10px 24px" }}>
              Go to Chat <ArrowRight size={16} />
            </button>
          ) : (
            <>
              <button className="btn-ghost" onClick={() => router.push("/login")} style={{ padding: "10px 20px" }}>Log in</button>
              <button className="btn-primary" onClick={() => router.push("/login")} style={{ padding: "10px 24px" }}>
                Get Started <ArrowRight size={16} />
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section ref={heroRef} style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        padding: "120px 24px 80px", position: "relative", overflow: "hidden",
      }}>
        <ParticleCanvas />
        <div className="hero-bg-orb-1" style={{ position: "absolute", top: "10%", left: "5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)", filter: "blur(80px)", pointerEvents: "none" }} />
        <div className="hero-bg-orb-2" style={{ position: "absolute", bottom: "10%", right: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)", filter: "blur(60px)", pointerEvents: "none" }} />

        <h1 ref={headlineRef} style={{
          fontSize: "clamp(3.5rem, 10vw, 8rem)", fontWeight: 800,
          lineHeight: 0.95, letterSpacing: "-0.05em",
          maxWidth: 1000, marginBottom: "32px",
          color: "var(--text-primary)", position: "relative",
        }}>
          <span className="hero-word" style={{ display: "inline-block", marginRight: "0.2em" }}>Think</span>
          <span className="hero-word" style={{ display: "inline-block", marginRight: "0.2em" }}>deeper,</span>
          <br />
          <span className="hero-word gradient-text-animated" style={{ display: "inline-block", marginRight: "0.2em" }}>learn</span>
          <span className="hero-word gradient-text-animated" style={{ display: "inline-block" }}>better.</span>
        </h1>

        <p ref={subtitleRef} style={{
          fontSize: "clamp(1rem, 1.8vw, 1.2rem)", color: "var(--text-muted)",
          maxWidth: 420, lineHeight: 1.6, marginBottom: "48px", position: "relative",
        }}>
          The AI tutor that asks questions instead of giving answers.
        </p>

        <div ref={heroCTARef} style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center", position: "relative" }}>
          <button
            className="btn-primary"
            onClick={() => router.push(user ? "/chat" : "/login")}
            onMouseMove={handleMagnetic}
            onMouseLeave={handleMagneticLeave}
            style={{ padding: "18px 48px", fontSize: "1.05rem", boxShadow: "0 0 40px rgba(16,185,129,0.2)" }}
          >
            {user ? "Open DAIY" : "Start Free"}
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ============ VIDEO EMBED ============ */}
      <section style={{ padding: "0 24px", maxWidth: 1000, margin: "0 auto", marginTop: "-40px", marginBottom: "80px", position: "relative", zIndex: 10 }}>
        <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 30px 60px rgba(0,0,0,0.5), 0 0 40px rgba(16,185,129,0.1)" }}>
          <iframe
            src="https://player.mux.com/r6ilC9gijIkNhR1DgJ97juWD01wfDTioUPv3KPEtlMjI?metadata-video-title=Daiy+Video&video-title=Daiy+Video&accent-color=%2311c05d&primary-color=%23ffffff&loop=true&autoplay=true&muted=true"
            style={{ width: "100%", border: "none", aspectRatio: "16/9", display: "block" }}
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
            allowFullScreen
          ></iframe>
        </div>
      </section>

      {/* ============ PHILOSOPHY — word-by-word scroll reveal ============ */}
      <section ref={philosophyRef} style={{
        padding: "160px 24px", maxWidth: 900, margin: "0 auto",
      }}>
        <p ref={philosophyTextRef} style={{
          fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)",
          fontWeight: 600,
          lineHeight: 1.4,
          letterSpacing: "-0.02em",
          color: "var(--text-primary)",
        }}>
          {philosophyWords.map((word, i) => (
            <span key={i} className="reveal-word" style={{
              display: "inline-block",
              marginRight: "0.3em",
              opacity: 0.15,
              transition: "opacity 0.1s",
            }}>
              {word}
            </span>
          ))}
        </p>
      </section>

      {/* ============ DEMO ============ */}
      <section ref={demoSectionRef} style={{ padding: "100px 24px 120px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div ref={demoTextRef} style={{ marginBottom: "48px" }}>
            <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              A conversation,{" "}
              <span className="gradient-text-animated">not a lecture.</span>
            </h2>
          </div>
          <div ref={demoChatRef} style={{ display: "flex", justifyContent: "center" }}>
            <TypingDemo />
          </div>
        </div>
      </section>

      {/* ============ HORIZONTAL SCROLL — Typographic Panels ============ */}
      <section ref={horizontalRef} style={{
        height: "100vh", overflow: "hidden", position: "relative",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div ref={horizontalTrackRef} style={{
          display: "flex", alignItems: "stretch",
          height: "100%",
          width: "max-content",
        }}>
          {/* Opening panel */}
          <div style={{
            minWidth: "100vw", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "0 8vw", flexShrink: 0,
          }}>
            <h2 style={{
              fontSize: "clamp(2.5rem, 6vw, 5rem)", fontWeight: 800,
              letterSpacing: "-0.04em", lineHeight: 1, textAlign: "center",
            }}>
              DAIY asks the{" "}
              <span className="gradient-text-animated">right questions.</span>
            </h2>
          </div>

          {/* Subject panels */}
          {panels.map((panel, i) => (
            <div key={i} style={{
              minWidth: "80vw", display: "flex", alignItems: "center",
              padding: "0 8vw", flexShrink: 0,
              position: "relative",
            }}>
              {/* Vertical accent line */}
              <div style={{
                width: 3, height: "40%", borderRadius: 2,
                background: panel.color, opacity: 0.6,
                position: "absolute", left: "4vw", top: "30%",
              }} />

              <div style={{ paddingLeft: "4vw" }}>
                {/* Large subject name */}
                <h3 style={{
                  fontSize: "clamp(4rem, 10vw, 9rem)", fontWeight: 800,
                  letterSpacing: "-0.05em", lineHeight: 0.9,
                  color: panel.color, opacity: 0.15,
                  marginBottom: "24px",
                  userSelect: "none",
                }}>
                  {panel.title}
                </h3>

                {/* The question DAIY would ask */}
                <p style={{
                  fontSize: "clamp(1.3rem, 2.5vw, 2rem)",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  fontStyle: "italic",
                  lineHeight: 1.4,
                  maxWidth: 600,
                  letterSpacing: "-0.01em",
                }}>
                  &ldquo;{panel.question}&rdquo;
                </p>

                {/* Subtle label */}
                <p style={{
                  fontSize: "0.75rem", color: "var(--text-muted)",
                  textTransform: "uppercase", letterSpacing: "0.12em",
                  marginTop: "20px", fontWeight: 500,
                }}>
                  — DAIY would ask
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ SLOGAN MARQUEE ============ */}
      <div style={{ overflow: "hidden", position: "relative", height: 220 }}>
        <div style={{
          padding: "40px 0",
          transform: "rotate(-3deg)",
          position: "absolute",
          top: 0, left: "-10%",
          width: "120%",
          willChange: "transform",
        }}>
          {/* Row 1 — scrolls left */}
          <div className="marquee-track" style={{ marginBottom: "4px" }}>
            {[...Array(6)].map((_, setIndex) => (
              <span key={setIndex} style={{ display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
                {["DISCOVER", "ADAPT", "INVENT", "YOURSELF"].map((word, i) => (
                  <span key={`${setIndex}-${i}`} style={{ display: "flex", alignItems: "center" }}>
                    <span style={{
                      fontSize: "clamp(2.5rem, 5vw, 4rem)",
                      fontWeight: 800,
                      color: "white",
                      letterSpacing: "-0.03em",
                      padding: "0 20px",
                    }}>
                      {word}
                    </span>
                    <span style={{
                      fontSize: "clamp(1.2rem, 2.5vw, 2rem)",
                      color: "var(--accent)",
                      padding: "0 12px",
                      opacity: 0.5,
                    }}>
                      ·
                    </span>
                  </span>
                ))}
              </span>
            ))}
          </div>

          {/* Row 2 — scrolls right */}
          <div className="marquee-track-reverse">
            {[...Array(6)].map((_, setIndex) => (
              <span key={setIndex} style={{ display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
                {["DISCOVER", "ADAPT", "INVENT", "YOURSELF"].map((word, i) => (
                  <span key={`r${setIndex}-${i}`} style={{ display: "flex", alignItems: "center" }}>
                    <span style={{
                      fontSize: "clamp(2.5rem, 5vw, 4rem)",
                      fontWeight: 800,
                      color: "rgba(255,255,255,0.15)",
                      letterSpacing: "-0.03em",
                      padding: "0 20px",
                    }}>
                      {word}
                    </span>
                    <span style={{
                      fontSize: "clamp(1.2rem, 2.5vw, 2rem)",
                      color: "var(--accent)",
                      padding: "0 12px",
                      opacity: 0.2,
                    }}>
                      ·
                    </span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ============ CTA ============ */}
      <section style={{ padding: "120px 24px 100px", position: "relative", overflow: "hidden" }}>
        {/* Glow */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16,185,129,0.08), transparent 65%)",
          filter: "blur(60px)", pointerEvents: "none",
        }} />

        <div ref={ctaRef} style={{
          position: "relative", maxWidth: 600, margin: "0 auto", textAlign: "center",
        }}>
          <h2 style={{
            fontSize: "clamp(2.2rem, 5vw, 3.8rem)", fontWeight: 700,
            letterSpacing: "-0.04em", marginBottom: "40px", lineHeight: 1.1,
          }}>
            Ready to{" "}
            <span className="gradient-text-animated">think</span>?
          </h2>

          <button
            className="btn-primary"
            onClick={() => router.push(user ? "/chat" : "/login")}
            onMouseMove={handleMagnetic}
            onMouseLeave={handleMagneticLeave}
            style={{
              padding: "18px 52px", fontSize: "1.1rem",
              boxShadow: "0 0 50px rgba(16,185,129,0.2), 0 0 100px rgba(16,185,129,0.08)",
            }}
          >
            {user ? "Open DAIY" : "Get Started"}
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="landing-footer" style={{
        borderTop: "1px solid var(--border-default)",
        padding: "40px 24px", textAlign: "center",
        color: "var(--text-muted)", fontSize: "0.875rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "12px" }}>
          <DaiyLogo size={20} />
          <span style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.95rem" }}>DAIY</span>
        </div>
        <p style={{ fontSize: "0.8rem" }}>
          &copy; {new Date().getFullYear()} DAIY. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
