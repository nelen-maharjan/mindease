"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  crisisDetected?: boolean;
}

const SUGGESTIONS = [
  "I'm feeling anxious today — can you help?",
  "Guide me through a breathing exercise",
  "I'm having trouble sleeping",
  "How do I manage work stress?",
  "What are some grounding techniques?",
  "I need help with negative thoughts",
];

const CRISIS_RESOURCES = `If you're in crisis, please reach out:
• **988 Suicide & Crisis Lifeline** — call or text 988 (US)
• **Crisis Text Line** — text HOME to 741741
• **International Association for Suicide Prevention** — https://www.iasp.info/resources/Crisis_Centres/
• Or go to your nearest emergency room`;

export default function ChatPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [crisisDetected, setCrisisDetected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isLoading) return;
    setInput("");

    const userMsg: Message = { id: Date.now().toString(), role: "USER", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, sessionId }),
      });
      const res = await r.json();

      if (res.data) {
        setSessionId(res.data.sessionId);
        if (res.data.crisisDetected) setCrisisDetected(true);
        const aiMsg: Message = {
          id: res.data.message.id,
          role: "ASSISTANT",
          content: res.data.message.content,
          crisisDetected: res.data.crisisDetected,
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: "ASSISTANT",
        content: "I'm having trouble connecting right now. Please try again. If you need immediate support, text or call 988.",
      }]);
    }
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const userName = session?.user?.name?.split(" ")[0] || "there";

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b px-6 py-4 bg-card shrink-0">
        <h1 className="text-base font-semibold">AI Wellness Assistant</h1>
        <p className="text-xs text-muted-foreground">A supportive space to talk — not a substitute for professional care</p>
      </div>

      {/* Crisis banner */}
      {crisisDetected && (
        <div className="mx-4 mt-3 p-3.5 rounded-xl bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800 text-xs text-red-800 dark:text-red-300 shrink-0">
          <p className="font-semibold mb-1">⚠️ You may be going through something very difficult.</p>
          <p>Please consider reaching out to a crisis line: <strong>988</strong> (call or text) · Crisis Text Line: text HOME to <strong>741741</strong></p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-14 h-14 rounded-full bg-linear-to-br from-indigo-100 to-teal-100 flex items-center justify-center text-2xl mb-4">
              🌿
            </div>
            <h2 className="text-base font-semibold mb-1">Hi {userName}!</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs leading-relaxed">
              I&apos;m your MindEase companion. I&apos;m here to listen, support, and help you explore your feelings. What&apos;s on your mind today?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="text-left px-3.5 py-2.5 rounded-xl border text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:border-primary/30 transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-2.5", msg.role === "USER" ? "justify-end" : "justify-start")}>
            {msg.role === "ASSISTANT" && (
              <div className="w-7 h-7 rounded-full bg-linear-to-br from-indigo-100 to-teal-100 flex items-center justify-center text-sm shrink-0 mt-1">🌿</div>
            )}
            <div className={cn(
              "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
              msg.role === "USER"
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : "bg-card border rounded-tl-sm",
              msg.crisisDetected && msg.role === "ASSISTANT" && "border-amber-300 bg-amber-50 dark:bg-amber-950/20"
            )}>
              <MessageContent content={msg.content} />
            </div>
            {msg.role === "USER" && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0 mt-1">
                {session?.user?.name?.slice(0, 1).toUpperCase() || "U"}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-full bg-linear-to-br from-indigo-100 to-teal-100 flex items-center justify-center text-sm shrink-0 mt-1">🌿</div>
            <div className="bg-card border rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-[bounceDot_1.2s_infinite]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-[bounceDot_1.2s_0.2s_infinite]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-[bounceDot_1.2s_0.4s_infinite]"></span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-card px-4 py-3 shrink-0">
        <div className="flex gap-2.5 items-end max-w-3xl mx-auto">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share what's on your mind… (Shift+Enter for new line)"
            rows={1}
            className="flex-1 resize-none rounded-xl border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground max-h-32 overflow-y-auto"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <Button onClick={() => send()} disabled={!input.trim() || isLoading} size="icon" className="h-10 w-10 rounded-xl shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </Button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          MindEase is a wellness companion, not a therapist. For emergencies, call 988 or your local crisis line.
        </p>
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  // Simple markdown: **bold**, *italic*, line breaks
  const formatted = content
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
  return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
}
