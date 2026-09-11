"use client";

import { useState, useRef, useEffect } from "react";
import { chat } from "@/lib/api";

interface Message {
  role: "user" | "bot";
  text: string;
}

/**
 * Floating AI chatbot widget.
 * Talks to Watson Assistant via /chat endpoint on the backend.
 *
 * Owner: Member 3 & 4 (AI / chatbot)
 * TODO: Plug in the Watson web chat SDK when the Assistant instance is ready.
 *       For now this uses a simple REST call to the backend proxy.
 */
export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Hi! I'm StitchBot 🧵 I can help you choose a dress style, suggest fabrics, or guide you through the app. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await chat(text);
      setMessages((prev) => [...prev, { role: "bot", text: response.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Sorry, I'm having trouble connecting. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-white text-2xl shadow-lg hover:bg-primary-dark transition-colors z-50 flex items-center justify-center"
        aria-label="Toggle chat"
      >
        {isOpen ? "✕" : "🧵"}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 sm:w-96 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-primary px-4 py-3">
            <h3 className="text-white font-semibold">StitchBot — AI Assistant</h3>
            <p className="text-primary-light text-xs">Powered by IBM Watson</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-80">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`px-3 py-2 rounded-xl text-sm max-w-[80%] ${
                    msg.role === "user"
                      ? "bg-primary text-white rounded-br-none"
                      : "bg-gray-700 text-gray-200 rounded-bl-none"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-700 text-gray-400 px-3 py-2 rounded-xl text-sm animate-pulse">
                  Typing...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-700 p-3 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask me anything..."
              className="flex-1 bg-gray-800 text-white text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-primary text-white px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-primary-dark transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
