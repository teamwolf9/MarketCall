import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { PwaRegister } from "@/app/_components/pwa-register";
import { AgentActivity } from "@/app/_components/agent-activity";
import "./globals.css";

// Display: an optical serif with warmth — the wordmark + headings.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

// UI/body: a friendly, readable grotesque.
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MarketCall",
  description: "Chat-driven marketing operations for every brand you run.",
  applicationName: "MarketCall",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "MarketCall" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#262624",
  // Full-screen launch feels native; keep content clear of notches.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorBackground: "#30302e",
          colorForeground: "#ebe8df",
          colorMutedForeground: "#b7b5a9",
          colorPrimary: "#d97757",
          colorPrimaryForeground: "#ffffff",
          colorInput: "#1b1b19",
          colorInputForeground: "#ebe8df",
          colorNeutral: "#ffffff",
          colorDanger: "#ef6360",
          colorRing: "#d97757",
          borderRadius: "0.5rem",
          fontFamily: "var(--font-hanken)",
        },
      }}
    >
      <html
        lang="en"
        className={`dark ${fraunces.variable} ${hanken.variable} ${geistMono.variable} h-full`}
      >
        {/* App shell: the viewport never scrolls — inner panels do. */}
        <body className="flex h-full flex-col overflow-hidden">
          {children}
          <AgentActivity />
          <PwaRegister />
        </body>
      </html>
    </ClerkProvider>
  );
}
