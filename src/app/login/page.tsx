"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from "@/lib/auth";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";
import DaiyLogo from "@/components/DaiyLogo";

export default function LoginPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!loading && user) {
            router.push("/chat");
        }
    }, [user, loading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            if (isLogin) {
                await signInWithEmail(email, password);
            } else {
                if (!displayName.trim()) {
                    setError("Please enter your name");
                    setIsSubmitting(false);
                    return;
                }
                await signUpWithEmail(email, password, displayName);
            }
            router.push("/chat");
        } catch (err: any) {
            const code = err?.code || "";
            if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
                setError("Invalid email or password");
            } else if (code === "auth/email-already-in-use") {
                setError("An account with this email already exists");
            } else if (code === "auth/weak-password") {
                setError("Password must be at least 6 characters");
            } else if (code === "auth/invalid-email") {
                setError("Please enter a valid email address");
            } else {
                setError(err?.message || "Something went wrong. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogle = async () => {
        setError("");
        try {
            await signInWithGoogle();
            router.push("/chat");
        } catch (err: any) {
            if (err?.code !== "auth/popup-closed-by-user") {
                setError("Google sign-in failed. Please try again.");
            }
        }
    };

    if (loading) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--bg-primary)",
                }}
            >
                <DaiyLogo size={48} animate className="animate-glow" />
            </div>
        );
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--bg-primary)",
                padding: "24px",
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* Background glow */}
            <div
                style={{
                    position: "absolute",
                    top: "30%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 500,
                    height: 500,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, var(--accent-glow), transparent 70%)",
                    filter: "blur(100px)",
                    opacity: 0.15,
                }}
            />

            <div
                className="card animate-fade-in"
                style={{
                    width: "100%",
                    maxWidth: 420,
                    padding: "48px 36px",
                    position: "relative",
                }}
            >
                {/* Logo */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        marginBottom: "36px",
                    }}
                >
                    <DaiyLogo size={56} style={{ marginBottom: "16px", filter: "drop-shadow(0 0 12px rgba(16, 185, 129, 0.3))" }} />
                    <h1
                        style={{
                            fontSize: "1.5rem",
                            fontWeight: 700,
                            letterSpacing: "-0.02em",
                        }}
                    >
                        {isLogin ? "Welcome back" : "Create your account"}
                    </h1>
                    <p
                        style={{
                            color: "var(--text-secondary)",
                            fontSize: "0.9rem",
                            marginTop: "6px",
                        }}
                    >
                        {isLogin
                            ? "Continue your learning journey"
                            : "Start learning the right way"}
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "12px 16px",
                            background: "rgba(239,68,68,0.1)",
                            border: "1px solid rgba(239,68,68,0.2)",
                            borderRadius: "var(--radius-md)",
                            color: "var(--color-error)",
                            fontSize: "0.875rem",
                            marginBottom: "20px",
                        }}
                    >
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {/* Google Button */}
                <button
                    onClick={handleGoogle}
                    style={{
                        width: "100%",
                        padding: "12px",
                        background: "var(--bg-tertiary)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--text-primary)",
                        fontSize: "0.9375rem",
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        transition: "all var(--transition-fast)",
                        fontFamily: "'Inter', sans-serif",
                    }}
                    onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.borderColor = "var(--border-hover)";
                        (e.target as HTMLButtonElement).style.background = "var(--bg-elevated)";
                    }}
                    onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.borderColor = "var(--border-default)";
                        (e.target as HTMLButtonElement).style.background = "var(--bg-tertiary)";
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    Continue with Google
                </button>

                {/* Divider */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        margin: "24px 0",
                    }}
                >
                    <div style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
                    <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>or</span>
                    <div style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {!isLogin && (
                        <div style={{ position: "relative" }}>
                            <User
                                size={18}
                                style={{
                                    position: "absolute",
                                    left: 14,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: "var(--text-muted)",
                                }}
                            />
                            <input
                                className="input-field"
                                type="text"
                                placeholder="Your name"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                style={{ paddingLeft: 44 }}
                            />
                        </div>
                    )}

                    <div style={{ position: "relative" }}>
                        <Mail
                            size={18}
                            style={{
                                position: "absolute",
                                left: 14,
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "var(--text-muted)",
                            }}
                        />
                        <input
                            className="input-field"
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{ paddingLeft: 44 }}
                        />
                    </div>

                    <div style={{ position: "relative" }}>
                        <Lock
                            size={18}
                            style={{
                                position: "absolute",
                                left: 14,
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "var(--text-muted)",
                            }}
                        />
                        <input
                            className="input-field"
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            style={{ paddingLeft: 44, paddingRight: 44 }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: "absolute",
                                right: 14,
                                top: "50%",
                                transform: "translateY(-50%)",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--text-muted)",
                                padding: 0,
                                display: "flex",
                            }}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={isSubmitting}
                        style={{
                            width: "100%",
                            padding: "13px",
                            marginTop: "4px",
                            fontSize: "0.95rem",
                        }}
                    >
                        {isSubmitting
                            ? "Please wait..."
                            : isLogin
                                ? "Sign In"
                                : "Create Account"}
                        {!isSubmitting && <ArrowRight size={16} />}
                    </button>
                </form>

                {/* Toggle */}
                <p
                    style={{
                        textAlign: "center",
                        color: "var(--text-secondary)",
                        fontSize: "0.875rem",
                        marginTop: "24px",
                    }}
                >
                    {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError("");
                        }}
                        style={{
                            background: "none",
                            border: "none",
                            color: "var(--accent)",
                            cursor: "pointer",
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            fontFamily: "'Inter', sans-serif",
                        }}
                    >
                        {isLogin ? "Sign up" : "Sign in"}
                    </button>
                </p>
            </div>
        </div>
    );
}
