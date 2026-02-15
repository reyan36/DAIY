// ============================================================
// Auth Helper Functions
// ============================================================

import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    updateProfile,
    type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./firebase";
import { createUserProfile } from "./firestore";

const googleProvider = new GoogleAuthProvider();

export async function signInWithEmail(email: string, password: string) {
    const auth = getFirebaseAuth();
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
}

export async function signUpWithEmail(
    email: string,
    password: string,
    displayName: string
) {
    const auth = getFirebaseAuth();
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName });
    await createUserProfile(result.user);
    return result.user;
}

export async function signInWithGoogle() {
    const auth = getFirebaseAuth();
    const result = await signInWithPopup(auth, googleProvider);
    // Create profile if first login
    await createUserProfile(result.user);
    return result.user;
}

export async function signOut() {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
}

export function getCurrentUser(): User | null {
    const auth = getFirebaseAuth();
    return auth.currentUser;
}
