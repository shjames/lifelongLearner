import Link from "next/link";
import { getPostsByCategory, getAllCategories } from "@/lib/posts";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getAllCategories().map((c) => ({ name: c }));
}

const CATEGORY_META: Record<string, { label: string; desc: string; icon: string }> = {
  dev:      { label: "开发",   desc: "技术笔记与代码思考", icon: "⌨️" },
  note:     { label: "笔记",   desc: "读书摘要与知识整理", icon: "📖" },
  diary:    { label: "日记",   desc: "每日记录与成长片段", icon: "🌿" },
  essays:   { label: "随笔",   desc: "生活感悟与随想",     icon: "✍️" },
  opinions: { label: "观点",   desc: "思考与见解分享",     icon: "💡" },
  travel:   { label: "旅游",   desc: "旅途记录与美食探索", icon: "🗺️" },
};

type CategoryParams = { name: string };

export default async function CategoryPage({
  params,
}: {
  params: CategoryParams | Promise<CategoryParams>;
}) {
  const result = await Promise.resolve(params);
  const posts = getPostsByCategory(result?.name as any);
  const meta = CATEGORY_META[result?.name] ?? {
    label: result?.name,
    desc: "",
    icon: "📁",
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* Header */}
      <div className="mb-8 pb-8 border-b border-cream-200">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{meta.icon}</span>
          <div>
            <p className="text-xs text-cream-400 tracking-widest uppercase mb-0.5">
              分类
            </p>
            <h1
              className="text-3xl font-bold text-cream-900"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {meta.label}
            </h1>
          </div>
        </div>
        {meta.desc && (
          <p className="text-cream-500 text-sm mt-2">{meta.desc}</p>
        )}
        <p className="text-xs text-cream-400 mt-1.5">{posts.length} 篇文章</p>
      </div>

      {/* Post list */}
      {posts.length === 0 ? (
        <div className="text-center py-20 text-cream-400">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-sm">暂无文章</p>
        </div>
      ) : (
        <ul className="space-y-0.5">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/blog/${p.slug}`}
                className="group flex items-start gap-4 rounded-xl px-4 py-3.5 hover:bg-cream-50 transition-colors"
              >
                <span className="flex-none w-28 text-xs text-cream-400 pt-0.5 tabular-nums">
                  {p.date.slice(0, 10)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-cream-800 group-hover:text-terra-600 transition-colors">
                    {p.title}
                  </div>
                  {p.summary && (
                    <p className="text-sm text-cream-400 mt-0.5 line-clamp-2">
                      {p.summary}
                    </p>
                  )}
                  {p.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.tags.map((t) => (
                        <span
                          key={t}
                          className="text-xs text-cream-400 bg-cream-100 px-1.5 py-0.5 rounded"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="flex-none text-xs text-cream-400 pt-0.5">
                  {p.readingTime}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
