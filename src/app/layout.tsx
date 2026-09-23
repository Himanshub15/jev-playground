import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jev Playground — a text box that becomes what you mean",
  description:
    "One text box that morphs into the right UI as you type: events, checklists, timers, colors, bill splits and more. Every keystroke is classified by TypeSafe's Jev model via OpenRouter.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "Jev Playground",
    description: "A text box that becomes what you mean. Powered by Jev.",
    type: "website",
    images: [{ url: "og.png", width: 1200, height: 630, alt: "Jev Playground: a text box morphing into an event card as you type" }],
  },
  twitter: { card: "summary_large_image", title: "Jev Playground", description: "A text box that becomes what you mean. Powered by Jev.", images: ["og.png"] },
};

// viewport-fit=cover lets fixed chrome (HUD, toasts) pad itself away from the home indicator.
export const viewport: Viewport = { themeColor: "#fafaf9", colorScheme: "light dark", viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        {/* Light by default; reuse the theme saved by the main site (same origin). */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem("theme")==="dark")document.documentElement.dataset.theme="dark"}catch{}` }} />
      </head>
      <body className="min-h-full bg-background font-sans text-foreground">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
