import Link from "next/link";
import { getPostsByCategory } from "@/lib/posts";

export const dynamic = "force-static";

export default function CategoryPage({ params }: { params: { name: string } }) {
  const posts = getPostsByCategory(params.name as any);
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold">分类：{params.name}</h1>
      <ul className="mt-6 space-y-6">
        {posts.map((p) => (
          <li key={p.slug} className="border-b pb-6">
            <Link href={`/blog/${p.slug}`} className="text-xl font-semibold hover:underline">
              {p.title}
            </Link>
            <div className="mt-1 text-sm text-zinc-500">
              <span>{p.date}</span>
              <span className="mx-2">•</span>
              <span>{p.readingTime}</span>
            </div>
            {p.summary && <p className="mt-2 text-zinc-700">{p.summary}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

