import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/posts";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: new Date() },
    { url: `${base}/blog`, lastModified: new Date() },
    { url: `${base}/search`, lastModified: new Date() },
  ];
  const posts = getAllPosts();
  for (const p of posts) {
    pages.push({ url: `${base}/blog/${p.slug}`, lastModified: new Date(p.date) });
  }
  return pages;
}

