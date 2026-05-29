import { notFound } from "next/navigation";
import Link from "next/link";
import { getPostBySlug, getAllPosts } from "@/lib/posts";
import { MDXContent } from "@/components/mdx-content";
import { Comments } from "@/components/giscus";
import { ShareButtons } from "@/components/share";

type Params = { slug?: string[] | string };

export const dynamic = "force-static";

export function generateStaticParams() {
  const params: { slug: string[] }[] = [];
  for (const p of getAllPosts()) {
    const segs = p.slug.split("/");
    params.push({ slug: segs });
    params.push({ slug: segs.map((s) => encodeURIComponent(s)) });
  }
  const key = (x: { slug: string[] }) => x.slug.join("/");
  const map = new Map<string, { slug: string[] }>();
  for (const p of params) map.set(key(p), p);
  return Array.from(map.values());
}

const CATEGORY_LABELS: Record<string, string> = {
  dev: "开发", note: "笔记", diary: "日记",
  essays: "随笔", opinions: "观点", travel: "旅游",
};

export default async function PostPage(props: {
  params: Params | Promise<Params>;
}) {
  const params = await Promise.resolve(props.params);
  const segs = Array.isArray(params.slug)
    ? params.slug
    : typeof params.slug === "string"
    ? [params.slug]
    : [];
  const slugPath = segs
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    })
    .join("/");
  const post = getPostBySlug(slugPath);

  if (!post) return notFound();

  const categoryHref =
    post.category === "diary" ? "/diary" : `/category/${post.category}`;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-xs text-cream-400">
        <Link href="/blog" className="hover:text-terra-600 transition-colors">
          博客
        </Link>
        <span>/</span>
        <Link
          href={categoryHref}
          className="hover:text-terra-600 transition-colors"
        >
          {CATEGORY_LABELS[post.category] || post.category}
        </Link>
      </div>

      {/* Article header */}
      <header className="mb-8 pb-8 border-b border-cream-200">
        <h1
          className="text-3xl md:text-4xl font-bold text-cream-900 leading-tight"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          {post.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2.5 text-sm text-cream-400">
          <time>{post.date.slice(0, 10)}</time>
          <span>·</span>
          <span>{post.readingTime}</span>
          {post.tags.length > 0 && (
            <>
              <span>·</span>
              <div className="flex flex-wrap gap-1.5">
                {post.tags.map((t) => (
                  <Link
                    key={t}
                    href={`/tag/${t}`}
                    className="rounded-md bg-cream-100 px-2 py-0.5 text-xs text-cream-500 hover:bg-cream-200 transition-colors"
                  >
                    #{t}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
        {post.summary && (
          <p className="mt-4 text-cream-500 text-base leading-relaxed italic border-l-2 border-cream-200 pl-4">
            {post.summary}
          </p>
        )}
      </header>

      {/* Article body */}
      <article className="prose-article">
        <MDXContent source={post.content} />
      </article>

      <div className="mt-12 pt-8 border-t border-cream-200">
        <ShareButtons title={post.title} />
        <Comments />
      </div>
    </div>
  );
}
