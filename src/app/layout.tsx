import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: { default: "MindEase — AI Wellness Companion", template: "%s | MindEase" },
  description: "Track your mood, journal your thoughts, and get AI-powered wellness insights.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
