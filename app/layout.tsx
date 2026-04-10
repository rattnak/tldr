import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TL;DR — Too Long, Didn't Learn",
  description:
    "An agentic AI that transforms any article into a micro-lesson, Socratic questions, and a 60-second brief.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
