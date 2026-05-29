import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

const CATEGORIES = [
  { href: "/category/dev", label: "开发", desc: "技术笔记与代码思考", icon: "⌨️" },
  { href: "/category/note", label: "笔记", desc: "读书摘要与知识整理", icon: "📖" },
  { href: "/diary", label: "日记", desc: "每日记录与成长片段", icon: "🌿" },
  { href: "/category/essays", label: "随笔", desc: "生活感悟与随想", icon: "✍️" },
  { href: "/category/opinions", label: "观点", desc: "思考与见解分享", icon: "💡" },
  { href: "/category/travel", label: "旅游", desc: "旅途记录与美食探索", icon: "🗺️" },
];

const CATEGORY_LABELS: Record<string, string> = {
  dev: "开发", note: "笔记", diary: "日记",
  essays: "随笔", opinions: "观点", travel: "旅游",
};

export default function Home() {
  const recentPosts = getAllPosts().slice(0, 6);

  return (
    <div>
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden border-b border-cream-100">
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
          <p className="text-xs text-cream-400 tracking-[0.2em] uppercase font-medium mb-5">
            Personal Blog
          </p>
          <h1
            className="text-5xl md:text-7xl font-bold text-cream-900 leading-none tracking-tight"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Lifelong
            <br />
            <em className="text-terra-600 not-italic">Learner</em>
          </h1>
          <p className="mt-6 text-base text-cream-600 max-w-sm leading-relaxed">
            记录开发笔记、个人日记、
            <br />
            生活随笔与旅途见闻。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 rounded-full bg-terra-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-terra-700 transition-colors"
            >
              进入博客 →
            </Link>
            <Link
              href="/category/travel"
              className="inline-flex items-center gap-1.5 rounded-full border border-cream-300 text-cream-700 px-5 py-2.5 text-sm hover:bg-cream-50 hover:border-terra-300 transition-colors"
            >
              🗺️ 旅游
            </Link>
          </div>
        </div>
        {/* Decorative rings */}
        <div className="pointer-events-none absolute -top-16 -right-16 w-72 h-72 rounded-full border border-cream-200 opacity-70" />
        <div className="pointer-events-none absolute top-4 -right-4 w-44 h-44 rounded-full border border-cream-200 opacity-50" />
        <div className="pointer-events-none absolute top-1/3 -right-28 w-56 h-56 rounded-full border border-terra-100 opacity-40" />
      </section>

      {/* ─── Categories ─── */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-xs font-semibold text-cream-400 tracking-[0.18em] uppercase mb-6">
          分类浏览
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group rounded-xl border border-cream-200 bg-cream-25 p-4 hover:border-terra-300 hover:bg-cream-50 hover:shadow-sm transition-all"
            >
              <div className="text-2xl mb-3">{c.icon}</div>
              <div className="font-semibold text-cream-900 text-sm mb-0.5">
                {c.label}
              </div>
              <div className="text-xs text-cream-400">{c.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      <div className="border-t border-cream-100" />

      {/* ─── Recent Posts ─── */}
      <section className="mx-auto max-w-5xl px-6 py-12 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-semibold text-cream-400 tracking-[0.18em] uppercase">
            最近文章
          </h2>
          <Link href="/blog" className="text-xs text-terra-600 hover:underline">
            全部 →
          </Link>
        </div>
        <ul className="space-y-0.5">
          {recentPosts.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/blog/${p.slug}`}
                className="group flex items-start gap-4 rounded-xl px-4 py-3 hover:bg-cream-50 transition-colors"
              >
                <span className="flex-none w-24 text-xs text-cream-400 pt-0.5 tabular-nums">
                  {p.date.slice(0, 10)}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-cream-800 group-hover:text-terra-600 transition-colors">
                    {p.title}
                  </span>
                  {p.summary && (
                    <p className="text-xs text-cream-400 mt-0.5 line-clamp-1">
                      {p.summary}
                    </p>
                  )}
                </div>
                <span className="flex-none text-xs text-terra-600 bg-terra-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {CATEGORY_LABELS[p.category] || p.category}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
