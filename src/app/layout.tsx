import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";

import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Indie catalog",
  description: "Internal dashboard and chat for a fictional indie game catalog.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-stone-300 pb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-900">
              Red Valley catalog
            </p>
            <nav aria-label="Primary" className="flex gap-4 text-sm font-medium">
              <Link href="/" className="underline-offset-4 hover:underline">
                Dashboard
              </Link>
              <Link href="/chat" className="underline-offset-4 hover:underline">
                Chat
              </Link>
            </nav>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
