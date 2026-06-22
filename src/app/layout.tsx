import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { PwaRegister } from "@/app/_components/pwa-register";
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
  themeColor: "#b85c38",
  // Full-screen launch feels native; keep content clear of notches.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${fraunces.variable} ${hanken.variable} ${geistMono.variable} h-full`}
      >
        {/* App shell: the viewport never scrolls — inner panels do. */}
        <body className="flex h-full flex-col overflow-hidden">
          {children}
          <PwaRegister />
        </body>
      </html>
    </ClerkProvider>
  );
}
