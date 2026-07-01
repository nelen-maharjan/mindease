"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type ToastType = "default" | "success" | "error" | "warning";

interface ToastData {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
}

const ToastContext = React.createContext<{
  toast: (data: Omit<ToastData, "id">) => void;
}>({ toast: () => {} });

export function useToast() {
  return React.useContext(ToastContext);
}

export function Toaster() {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const toast = React.useCallback((data: Omit<ToastData, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...data, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border bg-card p-4 shadow-lg animate-slide-up",
              t.type === "success" && "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950",
              t.type === "error" && "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
              t.type === "warning" && "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
            )}
          >
            {t.type === "success" && <span className="text-green-600 text-lg">✓</span>}
            {t.type === "error" && <span className="text-red-600 text-lg">✕</span>}
            {t.type === "warning" && <span className="text-amber-600 text-lg">⚠</span>}
            <div>
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
