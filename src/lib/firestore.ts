// ============================================================
// Firestore CRUD Operations
// ============================================================

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    orderBy,
    getDocs,
    addDoc,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
import { type User } from "firebase/auth";
import { getFirebaseDb } from "./firebase";
import type { Conversation, Message, UserProfile } from "@/types";

// Helper to get db instance
const db = () => getFirebaseDb();

// ========== Users ==========

export async function createUserProfile(user: User): Promise<void> {
    const ref = doc(db(), "users", user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        // Update last login
        await updateDoc(ref, { lastLoginAt: serverTimestamp() });
        return;
    }
    const profile: Omit<UserProfile, "uid"> = {
        displayName: user.displayName || "User",
        email: user.email || "",
        photoURL: user.photoURL,
        createdAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
        apiKeys: { openai: null, anthropic: null, google: null },
        preferences: { autoDetectModel: true, preferredModel: null },
        updatedAt: Timestamp.now(),
    };
    await setDoc(ref, profile);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(db(), "users", uid));
    if (!snap.exists()) return null;
    return { uid, ...snap.data() } as UserProfile;
}

export async function updateUserProfile(
    uid: string,
    data: Partial<UserProfile>
): Promise<void> {
    await updateDoc(doc(db(), "users", uid), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

// ========== Conversations ==========

export async function createConversation(
    userId: string,
    title: string,
    model: string
): Promise<string> {
    const ref = await addDoc(collection(db(), "conversations"), {
        userId,
        title,
        subject: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        messageCount: 0,
        model,
    });
    return ref.id;
}

export async function getConversations(
    userId: string
): Promise<Conversation[]> {
    const q = query(
        collection(db(), "conversations"),
        where("userId", "==", userId)
    );
    const snap = await getDocs(q);
    const convos = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Conversation)
    );
    // Client-side sort to avoid composite index requirement
    return convos.sort((a, b) => {
        const tA = a.lastMessageAt?.toMillis() || 0;
        const tB = b.lastMessageAt?.toMillis() || 0;
        return tB - tA;
    });
}

export async function getConversation(
    id: string
): Promise<Conversation | null> {
    const snap = await getDoc(doc(db(), "conversations", id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Conversation;
}

export async function updateConversation(
    id: string,
    data: Partial<Conversation>
): Promise<void> {
    await updateDoc(doc(db(), "conversations", id), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteConversation(id: string, userId: string): Promise<void> {
    // Delete all messages first — include userId filter for security rules compliance
    const messagesQuery = query(
        collection(db(), "messages"),
        where("conversationId", "==", id),
        where("userId", "==", userId)
    );
    const snap = await getDocs(messagesQuery);
    const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
    // Delete the conversation
    await deleteDoc(doc(db(), "conversations", id));
}

export async function deleteAllConversations(userId: string): Promise<number> {
    const convos = await getConversations(userId);
    let deleted = 0;
    for (const convo of convos) {
        await deleteConversation(convo.id, userId);
        deleted++;
    }
    return deleted;
}

// ========== Messages ==========

export async function addMessage(
    conversationId: string,
    userId: string,
    role: "user" | "assistant",
    content: string,
    model: string | null = null,
    isBreakthrough: boolean = false,
    timelineEvent: string | null = null
): Promise<string> {
    const ref = await addDoc(collection(db(), "messages"), {
        conversationId,
        userId,
        role,
        content,
        isBreakthrough,
        timelineEvent,
        createdAt: serverTimestamp(),
        model,
    });

    // Update conversation
    await updateDoc(doc(db(), "conversations", conversationId), {
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return ref.id;
}

export async function getMessages(conversationId: string, userId: string): Promise<Message[]> {
    const q = query(
        collection(db(), "messages"),
        where("conversationId", "==", conversationId),
        where("userId", "==", userId)
    );
    const snap = await getDocs(q);
    const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
    // Client-side sort
    return msgs.sort((a, b) => {
        const tA = a.createdAt?.toMillis() || 0;
        const tB = b.createdAt?.toMillis() || 0;
        return tA - tB;
    });
}

export async function updateMessage(
    id: string,
    data: Partial<Message>
): Promise<void> {
    await updateDoc(doc(db(), "messages", id), data);
}
