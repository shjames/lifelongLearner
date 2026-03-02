import Link from "next/link";
import { getPostsByCategory } from "@/lib/posts";

export const dynamic = "force-static";

export default function DiaryIndex() {
  const posts = getPostsByCategory("diary");
  
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold">日记</h1>
      <p className="text-zinc-600 mt-2">想到啥就记录啥、有啥想法就写写，没有逻辑要求、没有情节设计，就是普普通通的生活备忘录</p>
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