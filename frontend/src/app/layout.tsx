import type { Metadata } from "next";
import "./globals.css";

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
      <body className="bg-surface text-gray-900 antialiased">{children}</body>
    </html>
  );
}
