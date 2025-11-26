import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/posts";
import { MDXContent } from "@/components/mdx-content";
import { Comments } from "@/components/giscus";
import { ShareButtons } from "@/components/share";

type Params = { slug?: string[] | string };

export const dynamic = "force-static";

export function generateStaticParams() {
  // Let the app router discover files at runtime. Static params can be added if needed.
  return [] as { slug: string[] }[];
}

export default async function PostPage(props: { params: Params | Promise<Params> }) {
  const params = await Promise.resolve(props.params);

  const segs = Array.isArray(params.slug)
    ? params.slug
    : typeof params.slug === "string"
    ? [params.slug]
    : [];
  const slugPath = segs.join("/");
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
