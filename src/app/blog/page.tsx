import Link from "next/link";
import { getAllPosts, getAllCategories, getAllTags } from "@/lib/posts";

export const dynamic = "force-static";

export default function BlogIndex() {
  const posts = getAllPosts();
  console.log('posts',posts)
  const categories = getAllCategories();
  const tags = getAllTags();
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold">博客</h1>
      <p className="text-zinc-600 mt-2">开发笔记、个人日记、生活随笔与观点</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {categories.map((c) => (
          <Link key={c} href={`/category/${c}`} className="rounded-full border px-3 py-1 text-sm hover:bg-zinc-100">
            {c}
          </Link>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {tags.map((t) => (
          <Link key={t} href={`/tag/${t}`} className="rounded-full bg-zinc-100 px-2 py-1 text-xs hover:bg-zinc-200">
            #{t}
          </Link>
        ))}
      </div>

      <ul className="mt-8 space-y-6">
        {posts.map((p) => (
          <li key={p.slug} className="border-b pb-6">
            <Link href={`/blog/${p.slug}`} className="text-xl font-semibold hover:underline">
              {p.title}
            </Link>
            <div className="mt-1 text-sm text-zinc-500">
              <span>{p.date}</span>
              <span className="mx-2">•</span>
              <span>{p.readingTime}</span>
              <span className="mx-2">•</span>
              <Link href={`/category/${p.category}`} className="hover:underline">
                {p.category}
              </Link>
            </div>
            {p.summary && <p className="mt-2 text-zinc-700">{p.summary}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {p.tags.map((t) => (
                <Link key={t} href={`/tag/${t}`} className="rounded bg-zinc-100 px-2 py-1 text-xs">
                  #{t}
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ul>

    </div>
  );
}

