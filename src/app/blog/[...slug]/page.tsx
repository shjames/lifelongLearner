import { notFound } from "next/navigation";
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
  // 去重
  const key = (x: { slug: string[] }) => x.slug.join("/");
  const map = new Map<string, { slug: string[] }>();
  for (const p of params) map.set(key(p), p);
  return Array.from(map.values());
}

export default async function PostPage(props: { params: Params | Promise<Params> }) {
  const params = await Promise.resolve(props.params);

  const segs = Array.isArray(params.slug)
    ? params.slug
    : typeof params.slug === "string"
    ? [params.slug]
    : [];
  const slugPath = segs.map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  }).join("/");
  const post = getPostBySlug(slugPath);

  if (!post) return notFound();
  return (
    <article className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold">{post.title}</h1>
      <div className="mt-2 text-sm text-zinc-500">
        <span>{post.date}</span>
        <span className="mx-2">•</span>
        <span>{post.readingTime}</span>
      </div>
      <div className="mt-6 space-y-4 leading-7">
        <MDXContent source={post.content} />
      </div>
      <ShareButtons title={post.title} />
      <Comments />
    </article>
  );
}
