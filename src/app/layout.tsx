import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { NavLinks } from "@/components/nav-links";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Lifelong Learner",
  description: "记录开发、日记、随笔、旅途与观点",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased bg-cream-25`}
      >
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-cream-200 bg-cream-25/90 backdrop-blur-md">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
            <Link href="/" className="group flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg bg-terra-600 flex items-center justify-center text-white font-bold text-xs shrink-0"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                LL
              </div>
              <span className="hidden sm:block font-semibold text-cream-900 tracking-tight group-hover:text-terra-600 transition-colors">
                Lifelong Learner
              </span>
            </Link>
            <NavLinks />
          </nav>
        </header>

        <main className="min-h-[calc(100vh-120px)]">{children}</main>

        {/* Footer */}
        <footer className="border-t border-cream-100 mt-20">
          <div className="mx-auto max-w-5xl px-6 py-8 flex items-center justify-between">
            <span className="text-sm text-cream-500">
              © {new Date().getFullYear()} Lifelong Learner
            </span>
            <span className="text-xs text-cream-400">用文字记录成长</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
