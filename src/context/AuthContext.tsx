"use client";

// ============================================================
// Auth Context Provider
// ============================================================

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { getUserProfile } from "@/lib/firestore";
import type { UserProfile } from "@/types";

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    refreshProfile: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshProfile = async () => {
        if (user) {
            try {
                const p = await getUserProfile(user.uid);
                setProfile(p);
            } catch (err) {
                console.warn("Failed to load profile:", err);
            }
        }
    };

    useEffect(() => {
        let unsub: (() => void) | undefined;
        try {
            const auth = getFirebaseAuth();
            unsub = onAuthStateChanged(auth, async (firebaseUser) => {
                setUser(firebaseUser);
                if (firebaseUser) {
                    try {
                        const p = await getUserProfile(firebaseUser.uid);
                        setProfile(p);
                    } catch (err) {
                        console.warn("Failed to load user profile:", err);
                    }
                } else {
                    setProfile(null);
                }
                setLoading(false);
            });
        } catch (err) {
            console.warn("Firebase auth not configured:", err);
            setLoading(false);
        }
        return () => {
            if (unsub) unsub();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
