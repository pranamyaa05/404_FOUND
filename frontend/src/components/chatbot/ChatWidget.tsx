"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { chat, BobUserContext } from "@/lib/api";
import { useStudioStore } from "@/store/studioStore";
import BobAvatar from "@/components/chatbot/BobAvatar";
import RecommendationCard, {
  Recommendation,
} from "@/components/chatbot/RecommendationCard";
import clsx from "clsx";

// ─── Message types ────────────────────────────────────────────────────────────

type MessageRole = "user" | "bob";

interface TextMessage {
  id: string;
  role: MessageRole;
  type: "text";
  text: string;
  timestamp: Date;
}

interface RecommendMessage {
  id: string;
  role: "bob";
  type: "recommendations";
  intro: string;
  recommendations: Recommendation[];
  timestamp: Date;
}

interface QuickReplyMessage {
  id: string;
  role: "bob";
  type: "quick_replies";
  text: string;
  replies: string[];
  timestamp: Date;
}

type Message = TextMessage | RecommendMessage | QuickReplyMessage;

// ─── Quick reply sets BOB uses contextually ───────────────────────────────────

const INITIAL_QUICK_REPLIES = [
  "suggest me a style 🎨",
  "which fabric should I use? 🧵",
  "how does this app work? 🗺️",
  "I'm a tailor 📐",
];

const STEP_QUICK_REPLIES: Record<number, string[]> = {
  0: ["what style suits me?", "explain Ghagra", "explain Kurta"],
  1: ["tips for a good photo", "why enhance the image?"],
  2: ["how do I measure chest?", "what is ease allowance?"],
  3: ["what am I looking at?", "can I rotate the model?"],
  4: ["how to read die-lines?", "what is seam allowance?"],
};

// ─── ID generator ─────────────────────────────────────────────────────────────

let _msgId = 0;
const newId = () => `msg-${++_msgId}`;

// ─── BOB's opening message ────────────────────────────────────────────────────

const WELCOME_MESSAGE: QuickReplyMessage = {
  id: "welcome",
  role: "bob",
  type: "quick_replies",
  text: "hey, I'm BOB 👋 powered by Gemini, your fashion AI — I know Indian ethnic wear pretty well. styles, fabrics, cuts, what works for your body type, the whole thing.\n\nwhat do you need?",
  replies: INITIAL_QUICK_REPLIES,
  timestamp: new Date(),
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimised, setIsMinimised] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [hasUnread, setHasUnread] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getBobContext = useStudioStore((s) => s.getBobContext);

  // ── Scroll to bottom whenever messages change ─────────────────────
  useEffect(() => {
    if (isOpen && !isMinimised) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimised]);

  // ── Focus input when panel opens ──────────────────────────────────
  useEffect(() => {
    if (isOpen && !isMinimised) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimised]);

  // ── Build user context from studioStore ───────────────────────────
  const buildContext = useCallback((): BobUserContext => {
    const ctx = getBobContext();
    return {
      skin_tone_label: ctx.skinTone?.label,
      skin_tone_display: ctx.skinTone?.displayName,
      height_cm: ctx.measurements?.height,
      chest_cm: ctx.measurements?.chest,
      waist_cm: ctx.measurements?.waist,
      hip_cm: ctx.measurements?.hip,
      selected_style: ctx.selectedStyle ?? undefined,
      occasion: ctx.occasion ?? undefined,
      current_step: ctx.currentStep,
    };
  }, [getBobContext]);

  // ── Core send function ────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping) return;

      // Add user bubble
      const userMsg: TextMessage = {
        id: newId(),
        role: "user",
        type: "text",
        text: trimmed,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsTyping(true);

      try {
        const context = buildContext();
        const response = await chat(trimmed, sessionId, context);

        if (response.session_id) setSessionId(response.session_id);

        // If backend returned inline recommendations, show cards
        if (response.recommendations && response.recommendations.length > 0) {
          const recMsg: RecommendMessage = {
            id: newId(),
            role: "bob",
            type: "recommendations",
            intro: response.reply,
            recommendations: response.recommendations,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, recMsg]);
        } else {
          // Plain text reply with contextual quick replies
          const step = getBobContext().currentStep;
          const quickReplies = STEP_QUICK_REPLIES[step] ?? [];

          if (quickReplies.length > 0) {
            const qrMsg: QuickReplyMessage = {
              id: newId(),
              role: "bob",
              type: "quick_replies",
              text: response.reply,
              replies: quickReplies,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, qrMsg]);
          } else {
            const botMsg: TextMessage = {
              id: newId(),
              role: "bob",
              type: "text",
              text: response.reply,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, botMsg]);
          }
        }

        // Mark unread if panel is closed
        if (!isOpen) setHasUnread(true);
      } catch {
        const errMsg: TextMessage = {
          id: newId(),
          role: "bob",
          type: "text",
          text: "lost connection for a sec 😅 try again in a moment.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsTyping(false);
      }
    },
    [isTyping, sessionId, buildContext, getBobContext, isOpen]
  );

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimised(false);
    setHasUnread(false);
  };

  const handleClose = () => setIsOpen(false);
  const handleMinimise = () => setIsMinimised((m) => !m);

  // ── Inject a proactive message from outside (used by studio page) ──
  // Exposed via a custom event so studio steps can nudge BOB without prop drilling
  useEffect(() => {
    const msgHandler = (e: CustomEvent<{ text: string; quickReplies?: string[] }>) => {
      const { text, quickReplies } = e.detail;
      const msg: QuickReplyMessage | TextMessage =
        quickReplies && quickReplies.length > 0
          ? { id: newId(), role: "bob", type: "quick_replies", text, replies: quickReplies, timestamp: new Date() }
          : { id: newId(), role: "bob", type: "text", text, timestamp: new Date() };
      setMessages((prev) => [...prev, msg]);
      setHasUnread(true);
    };

    // Open the chat panel programmatically (e.g. from Navbar "Chat with BOB" button)
    const openHandler = () => {
      setIsOpen(true);
      setIsMinimised(false);
      setHasUnread(false);
    };

    window.addEventListener("bob:proactive", msgHandler as EventListener);
    window.addEventListener("bob:open", openHandler);
    return () => {
      window.removeEventListener("bob:proactive", msgHandler as EventListener);
      window.removeEventListener("bob:open", openHandler);
    };
  }, []);

  return (
    <>
      {/* ── Floating toggle button ─────────────────────────────────── */}
      <button
        onClick={isOpen ? handleClose : handleOpen}
        className={clsx(
          "fixed bottom-6 right-6 z-50 rounded-full shadow-2xl transition-all duration-300",
          "hover:scale-110 active:scale-95",
          isOpen
            ? "w-10 h-10 bg-gray-800 border border-gray-600 flex items-center justify-center"
            : "w-16 h-16 bg-transparent p-0.5"
        )}
        aria-label={isOpen ? "Close BOB" : "Open BOB — AI Fashion Designer"}
      >
        {isOpen ? (
          <span className="text-gray-300 text-lg">✕</span>
        ) : (
          <div className="relative">
            <BobAvatar size={64} animated />
            {/* Unread badge */}
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-gray-900 animate-bounce" />
            )}
            {/* Pulsing ring */}
            <span className="absolute inset-0 rounded-full ring-2 ring-primary/50 animate-ping opacity-30 pointer-events-none" />
          </div>
        )}
      </button>

      {/* ── Chat panel ────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className={clsx(
            "fixed bottom-24 right-6 z-50",
            "w-[340px] sm:w-[400px]",
            "bg-[#0D0A1A] border border-purple-900/50 rounded-2xl shadow-[0_8px_60px_rgba(108,63,197,0.35)]",
            "flex flex-col overflow-hidden",
            "transition-all duration-300",
            isMinimised ? "h-[64px]" : "h-[580px]"
          )}
        >
          {/* ── Header ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#1A1025] to-[#2D1B69] border-b border-purple-900/40 shrink-0">
            <div className="relative shrink-0">
              <BobAvatar size={36} />
              {/* Online dot */}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#0D0A1A]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm">BOB</span>
                <span className="text-[10px] bg-primary/30 text-primary-light px-1.5 py-0.5 rounded-full font-medium">
                  AI Fashion Designer
                </span>
              </div>
              <p className="text-gray-400 text-[10px] truncate">
                Powered by Google Gemini
              </p>
            </div>
            {/* Minimise / maximise */}
            <button
              onClick={handleMinimise}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              aria-label={isMinimised ? "Expand chat" : "Minimise chat"}
            >
              {isMinimised ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M7 3L2 8h10L7 3z" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M2 5h10L7 10 2 5z" />
                </svg>
              )}
            </button>
          </div>

          {/* ── Context ribbon — shows what BOB already knows ─────── */}
          {!isMinimised && <ContextRibbon />}

          {/* ── Message list ───────────────────────────────────────── */}
          {!isMinimised && (
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin scrollbar-thumb-purple-900/40">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onQuickReply={sendMessage}
                />
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-end gap-2">
                  <BobAvatar size={24} />
                  <div className="bg-[#1A1025] border border-purple-900/30 px-3 py-2 rounded-2xl rounded-bl-none">
                    <div className="flex gap-1 items-center h-4">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 bg-primary-light rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {/* ── Input bar ──────────────────────────────────────────── */}
          {!isMinimised && (
            <div className="border-t border-purple-900/30 px-3 py-3 bg-[#0D0A1A] shrink-0">
              <div className="flex gap-2 items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                  placeholder="Ask BOB anything about fashion..."
                  className={clsx(
                    "flex-1 bg-[#1A1025] text-white text-sm rounded-xl px-3 py-2.5",
                    "placeholder:text-gray-600 border border-purple-900/30",
                    "outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30",
                    "transition-all"
                  )}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isTyping}
                  className={clsx(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all",
                    "bg-primary hover:bg-primary-light active:scale-90",
                    "disabled:opacity-30 disabled:cursor-not-allowed"
                  )}
                  aria-label="Send message"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M14 8L2 2l2 6-2 6 12-6z" fill="white" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── Context Ribbon ───────────────────────────────────────────────────────────
// Shows what BOB already knows so user feels understood, not interrogated.

function ContextRibbon() {
  const { skinTone, measurements, selectedStyle } = useStudioStore();
  const items: { icon: string; label: string }[] = [];

  if (skinTone)
    items.push({ icon: "🎨", label: skinTone.displayName });
  if (measurements?.height)
    items.push({ icon: "📏", label: `${measurements.height} cm` });
  if (selectedStyle)
    items.push({ icon: "👗", label: selectedStyle.replace("_", " ") });

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-950/40 border-b border-purple-900/20 overflow-x-auto shrink-0">
      <span className="text-[10px] text-gray-500 shrink-0">BOB knows:</span>
      {items.map((item) => (
        <span
          key={item.label}
          className="text-[10px] bg-primary/15 text-primary-light px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1"
        >
          {item.icon} {item.label}
        </span>
      ))}
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

interface BubbleProps {
  message: Message;
  onQuickReply: (text: string) => void;
}

function MessageBubble({ message, onQuickReply }: BubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={clsx("flex items-end gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* BOB avatar on left */}
      {!isUser && <BobAvatar size={24} />}

      <div className={clsx("max-w-[82%]", isUser ? "items-end" : "items-start", "flex flex-col gap-1")}>
        {/* Text or intro */}
        {(message.type === "text" || message.type === "quick_replies" || message.type === "recommendations") && (
          <div
            className={clsx(
              "px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
              isUser
                ? "bg-primary text-white rounded-br-none"
                : "bg-[#1A1025] border border-purple-900/30 text-gray-100 rounded-bl-none"
            )}
          >
            {message.type === "text"
              ? message.text
              : message.type === "quick_replies"
              ? message.text
              : message.intro}
          </div>
        )}

        {/* Recommendation cards */}
        {message.type === "recommendations" && (
          <RecommendationCard recommendations={message.recommendations} />
        )}

        {/* Quick reply chips */}
        {message.type === "quick_replies" && message.replies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {message.replies.map((r) => (
              <button
                key={r}
                onClick={() => onQuickReply(r)}
                className={clsx(
                  "text-[11px] px-3 py-1 rounded-full border transition-all",
                  "border-primary/40 text-primary-light bg-primary/10",
                  "hover:bg-primary hover:text-white hover:border-primary",
                  "active:scale-95"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[9px] text-gray-600 px-1">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
