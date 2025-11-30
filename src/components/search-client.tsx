"use client";
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Post } from "@/lib/posts";

export function SearchClient({ all, initialQuery }: { all: Post[]; initialQuery?: string }) {
  const params = useSearchParams();
  const q = (params.get("q") ?? initialQuery ?? "").trim().toLowerCase();
  const results = q
    ? all.filter((p) => {
        return (
          p.title.toLowerCase().includes(q) ||
          p.summary.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
    : [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold">搜索</h1>
      <form className="mt-4" action="/search" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="输入关键词，例如：Next.js、日记、随笔"
          className="w-full rounded border px-3 py-2"
        />
        <button type="submit" className="mt-3 rounded bg-black px-4 py-2 text-white">搜索</button>
      </form>

      {q && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold">关键词：{q}</h2>
          <ul className="mt-4 space-y-4">
            {results.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="font-medium hover:underline">
                  {p.title}
                </Link>
                <div className="text-sm text-zinc-500">{p.date} • {p.readingTime}</div>
                {p.summary && <p className="text-zinc-700 mt-1">{p.summary}</p>}
              </li>
            ))}
            {results.length === 0 && <p className="text-zinc-500">未找到匹配内容</p>}
          </ul>
        </div>
      )}
    </div>
  );
}

