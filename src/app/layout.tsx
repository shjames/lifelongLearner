import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "个人博客",
  description: "记录开发、日记、随笔与观点",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}> 
        <header className="border-b bg-white/60 backdrop-blur">
          <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-semibold">Lifelong Learner</Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/blog" className="hover:underline">博客</Link>
              <Link href="/category/dev" className="hover:underline">开发</Link>
              <Link href="/category/diary" className="hover:underline">日记</Link>
              <Link href="/category/essays" className="hover:underline">随笔</Link>
              <Link href="/category/opinions" className="hover:underline">观点</Link>
              <Link href="/search" className="hover:underline">搜索</Link>
            </div>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="border-t mt-16">
          <div className="mx-auto max-w-4xl px-6 py-6 text-sm text-zinc-500">© {new Date().getFullYear()} Lifelong Learner</div>
        </footer>
      </body>
    </html>
  );
}
