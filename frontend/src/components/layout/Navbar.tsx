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
    { href: "/suggest", label: "Ask BOB " },
  ];

  const handleAskBob = () => {
    fireBobMessage({
      text: "Hey! I'm BOB  What can I help you with today?",
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
    <nav className="fixed top-0 left-0 right-0 z-40 bg-surface/60 backdrop-blur-xl border-b border-white/40 shadow-sm supports-[backdrop-filter]:bg-surface/40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group hover:opacity-80 transition-opacity">
          <img src="/garmentforge.png" alt="GarmentForge Logo" className="w-8 h-8 object-contain" />
          <span className="text-surface-dark font-serif font-semibold text-2xl tracking-tight">
            Garment<span className="text-primary font-normal italic">Forge</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "px-4 py-2 rounded-full text-sm font-medium transition-all font-sans border shadow-sm",
                pathname === link.href
                  ? "bg-primary text-white border-primary"
                  : "bg-white/50 border-surface-dark/10 text-surface-dark hover:bg-surface-dark hover:text-white"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Ask BOB button — desktop */}
        <button
          onClick={handleAskBob}
          className="hidden md:flex items-center gap-2 bg-white/50 hover:bg-surface-dark border border-surface-dark/20 hover:border-surface-dark text-surface-dark hover:text-white text-sm font-semibold px-4 py-2 rounded-full shadow-sm transition-all"
          aria-label="Open BOB AI assistant"
        >
          <BobAvatar size={22} />
          <span className="font-serif italic">Chat with BOB</span>
        </button>

        {/* Mobile: hamburger */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="md:hidden text-surface-dark p-2"
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
        <div className="md:hidden border-t border-surface-dark/10 bg-surface px-4 py-3 flex flex-col gap-1 shadow-md">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={clsx(
                "px-4 py-3 rounded-xl text-sm font-medium transition-all font-sans",
                pathname === link.href
                  ? "bg-primary/10 text-primary-dark"
                  : "text-surface-dark/80 hover:text-surface-dark hover:bg-surface-dark/5"
              )}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => { handleAskBob(); setMenuOpen(false); }}
            className="flex items-center gap-2 mt-2 px-4 py-3 rounded-xl bg-primary/10 text-primary-dark text-sm font-semibold font-sans"
          >
            <BobAvatar size={20} />
            Chat with BOB
          </button>
        </div>
      )}
    </nav>
  );
}
