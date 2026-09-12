import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import ChatWidget from "@/components/chatbot/ChatWidget";

export const metadata: Metadata = {
  title: "StitchSmart — AI-Powered Tailoring Assistant",
  description:
    "Upload your dress design, set your measurements, and get a 3D preview with tailor-ready patterns.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-surface text-gray-900 antialiased">
        {/* Fixed navbar — 64px height, so all pages get pt-16 */}
        <Navbar />
        <div className="pt-16">
          {children}
        </div>
        {/* BOB floats globally on all pages */}
        <ChatWidget />
      </body>
    </html>
  );
}
