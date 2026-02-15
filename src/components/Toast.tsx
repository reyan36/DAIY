"use client";

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

// ============================================================
// Toast Notification System
// ============================================================

export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType, duration?: number) => void;
    confirm: (message: string, onConfirm: () => void | Promise<void>, options?: { confirmText?: string; cancelText?: string; type?: "danger" | "warning" }) => void;
}

const ToastContext = createContext<ToastContextType>({
    toast: () => {},
    confirm: () => {},
});

export function useToast() {
    return useContext(ToastContext);
}

// ========== ConfirmDialog Component ==========
interface ConfirmDialogState {
    open: boolean;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText: string;
    cancelText: string;
    type: "danger" | "warning";
    loading: boolean;
}

function ConfirmDialog({ state, onClose }: { state: ConfirmDialogState; onClose: () => void }) {
    if (!state.open) return null;

    const handleConfirm = async () => {
        try {
            await state.onConfirm();
        } finally {
            onClose();
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="confirm-backdrop"
                onClick={onClose}
            />
            {/* Dialog */}
            <div className="confirm-dialog">
                <div className="confirm-icon-wrap">
                    <AlertTriangle size={24} color={state.type === "danger" ? "var(--color-error)" : "#F59E0B"} />
                </div>
                <p className="confirm-message">{state.message}</p>
                <div className="confirm-actions">
                    <button
                        className="confirm-btn cancel"
                        onClick={onClose}
                    >
                        {state.cancelText}
                    </button>
                    <button
                        className={`confirm-btn ${state.type}`}
                        onClick={handleConfirm}
                        disabled={state.loading}
                    >
                        {state.loading ? "..." : state.confirmText}
                    </button>
                </div>
            </div>
        </>
    );
}

// ========== Toast Item Component ==========
const toastIcons: Record<ToastType, ReactNode> = {
    success: <CheckCircle size={18} />,
    error: <XCircle size={18} />,
    warning: <AlertTriangle size={18} />,
    info: <Info size={18} />,
};

function ToastItem({ toast: t, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setExiting(true);
            setTimeout(() => onRemove(t.id), 300);
        }, t.duration || 4000);
        return () => clearTimeout(timer);
    }, [t, onRemove]);

    return (
        <div className={`toast-item toast-${t.type} ${exiting ? "toast-exit" : "toast-enter"}`}>
            <div className="toast-icon">{toastIcons[t.type]}</div>
            <span className="toast-message">{t.message}</span>
            <button
                className="toast-close"
                onClick={() => {
                    setExiting(true);
                    setTimeout(() => onRemove(t.id), 300);
                }}
            >
                <X size={14} />
            </button>
        </div>
    );
}

// ========== Toast Provider ==========
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmState, setConfirmState] = useState<ConfirmDialogState>({
        open: false,
        message: "",
        onConfirm: () => {},
        confirmText: "Confirm",
        cancelText: "Cancel",
        type: "danger",
        loading: false,
    });

    const addToast = useCallback((message: string, type: ToastType = "info", duration: number = 4000) => {
        const id = Date.now().toString() + Math.random().toString(36).slice(2);
        setToasts((prev) => [...prev, { id, message, type, duration }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showConfirm = useCallback(
        (
            message: string,
            onConfirm: () => void | Promise<void>,
            options?: { confirmText?: string; cancelText?: string; type?: "danger" | "warning" }
        ) => {
            setConfirmState({
                open: true,
                message,
                onConfirm,
                confirmText: options?.confirmText || "Confirm",
                cancelText: options?.cancelText || "Cancel",
                type: options?.type || "danger",
                loading: false,
            });
        },
        []
    );

    const closeConfirm = useCallback(() => {
        setConfirmState((prev) => ({ ...prev, open: false }));
    }, []);

    return (
        <ToastContext.Provider value={{ toast: addToast, confirm: showConfirm }}>
            {children}

            {/* Toast Container */}
            <div className="toast-container">
                {toasts.map((t) => (
                    <ToastItem key={t.id} toast={t} onRemove={removeToast} />
                ))}
            </div>

            {/* Confirm Dialog */}
            <ConfirmDialog state={confirmState} onClose={closeConfirm} />
        </ToastContext.Provider>
    );
}
