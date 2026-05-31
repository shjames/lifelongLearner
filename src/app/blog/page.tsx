import Link from "next/link";
import { getAllPosts, getAllCategories, getAllTags } from "@/lib/posts";

export const dynamic = "force-static";

const CATEGORY_LABELS: Record<string, string> = {
  dev: "开发", note: "笔记", diary: "日记",
  essays: "随笔", opinions: "观点", travel: "旅游",
};

export default function BlogIndex() {
  const posts = getAllPosts();
  const categories = getAllCategories();
  const tags = getAllTags();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* Header */}
      <div className="mb-8 pb-8 border-b border-cream-200">
        <h1
          className="text-4xl font-bold text-cream-900"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          所有文章
        </h1>
        <p className="text-cream-400 mt-2 text-sm">共 {posts.length} 篇</p>

        {/* Category filters */}
        <div className="mt-5 flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link
              key={c}
              href={c === "diary" ? "/diary" : `/category/${c}`}
              className="rounded-full border border-cream-200 px-3.5 py-1.5 text-sm text-cream-600 hover:border-terra-300 hover:text-terra-600 hover:bg-terra-50 transition-all"
            >
              {CATEGORY_LABELS[c] || c}
            </Link>
          ))}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Link
                key={t}
                href={`/tag/${t}`}
                className="rounded-md bg-cream-100 px-2.5 py-1 text-xs text-cream-500 hover:bg-cream-200 hover:text-cream-700 transition-colors"
              >
                #{t}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Post list */}
      <ul className="space-y-0.5">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/blog/${p.slug}`}
              className="group flex flex-col sm:flex-row sm:items-start sm:gap-4 rounded-xl px-4 py-3 hover:bg-cream-50 transition-colors"
            >
              <span className="text-xs text-cream-400 tabular-nums mb-0.5 sm:mb-0 sm:flex-none sm:w-28 sm:pt-0.5">
                {p.date.slice(0, 10)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-cream-800 group-hover:text-terra-600 transition-colors">
                  {p.title}
                </div>
                {p.summary && (
                  <p className="text-sm text-cream-400 mt-0.5 line-clamp-1">
                    {p.summary}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 sm:mt-0 sm:flex-none">
                <span className="text-xs text-cream-400 hidden sm:block">
                  {p.readingTime}
                </span>
                <span className="text-xs text-terra-600 bg-terra-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {CATEGORY_LABELS[p.category] || p.category}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
