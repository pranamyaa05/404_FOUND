"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import BobAvatar from "@/components/chatbot/BobAvatar";
import { fireBobMessage } from "@/hooks/useBobProactive";
import clsx from "clsx";

/**
 * Global Navbar — shown on all pages.
 * Contains links to Studio, Styles, and the /suggest page.
 * "Ask BOB" button opens the chat widget inline.
 */
export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/studio",  label: "Studio" },
    { href: "/styles",  label: "Style Guide" },
    { href: "/suggest", label: "Ask BOB ✨" },
  ];

  const handleAskBob = () => {
    fireBobMessage({
      text: "Hey! I'm BOB 🎨 What can I help you with today?",
      quickReplies: [
        "Suggest me a style",
        "Which fabric should I use?",
        "How does this app work?",
        "I'm a tailor",
      ],
    });
    // Also open the chat panel if it's closed
    window.dispatchEvent(new CustomEvent("bob:open"));
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-[#0D0A1A]/90 backdrop-blur-md border-b border-purple-900/30">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="text-2xl">🧵</span>
          <span className="text-white font-extrabold text-xl tracking-tight">
            Stitch<span className="text-primary-light">Smart</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                pathname === link.href
                  ? "bg-primary/20 text-primary-light"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Ask BOB button — desktop */}
        <button
          onClick={handleAskBob}
          className="hidden md:flex items-center gap-2 bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary-light text-sm font-semibold px-4 py-2 rounded-xl transition-all"
          aria-label="Open BOB AI assistant"
        >
          <BobAvatar size={22} />
          <span>Chat with BOB</span>
        </button>

        {/* Mobile: hamburger */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="md:hidden text-gray-400 hover:text-white p-2"
          aria-label="Toggle menu"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor">
            {menuOpen ? (
              <path d="M4 4l14 14M4 18L18 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            ) : (
              <>
                <rect y="4"  width="22" height="2" rx="1" />
                <rect y="10" width="22" height="2" rx="1" />
                <rect y="16" width="22" height="2" rx="1" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-purple-900/30 bg-[#0D0A1A] px-4 py-3 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={clsx(
                "px-4 py-3 rounded-xl text-sm font-medium transition-all",
                pathname === link.href
                  ? "bg-primary/20 text-primary-light"
                  : "text-gray-300 hover:text-white hover:bg-white/5"
              )}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => { handleAskBob(); setMenuOpen(false); }}
            className="flex items-center gap-2 mt-2 px-4 py-3 rounded-xl bg-primary/20 text-primary-light text-sm font-semibold"
          >
            <BobAvatar size={20} />
            Chat with BOB
          </button>
        </div>
      )}
    </nav>
  );
}
