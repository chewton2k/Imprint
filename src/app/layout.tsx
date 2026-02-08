import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Imprint — Cryptographic Proof of Authorship",
  description:
    "Prove authorship and declare usage intent for your creative works with cryptographic signatures.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <nav className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="mx-auto max-w-4xl flex items-center justify-between px-6 py-4">
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight"
            >
              Imprint
            </Link>
            <div className="flex gap-6 text-sm">
              <Link
                href="/register"
                className="hover:underline underline-offset-4"
              >
                Register
              </Link>
              <Link
                href="/verify"
                className="hover:underline underline-offset-4"
              >
                Verify
              </Link>
              <Link
                href="/records"
                className="hover:underline underline-offset-4"
              >
                Records
              </Link>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-4xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
