import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";

export type PostMeta = {
  title: string;
  date: string; // ISO date string
  tags: string[];
  summary: string;
  category: "dev" | "diary" | "essays" | "opinions";
  slug: string;
  readingTime: string;
};

export type Post = PostMeta & {
  content: string;
};

const CONTENT_DIR = path.join(process.cwd(), "content");

function walkDir(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkDir(full);
    return full.endsWith(".mdx") ? [full] : [];
  });
  return files;
}

function fileToPost(filePath: string): Post {
  const source = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(source);

  const rel = path.relative(CONTENT_DIR, filePath);
  const slug = rel.replace(/\\/g, "/").replace(/\.mdx$/, "");

  const meta: PostMeta = {
    title: String(data.title ?? "未命名文章"),
    date: String(data.date ?? new Date().toISOString().slice(0, 10)),
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    summary: String(data.summary ?? ""),
    category: (data.category ?? "dev") as PostMeta["category"],
    slug,
    readingTime: readingTime(content).text,
  };

  return { ...meta, content };
}

export function getAllPosts(): Post[] {
  const files = walkDir(CONTENT_DIR);
  const posts = files.map(fileToPost);
  posts.sort((a, b) => (a.date < b.date ? 1 : -1));
  return posts;
}

export function getPostBySlug(slug: string): Post | null {
  console.log(4444)
  const segs = slug.split("/").filter(Boolean);
  

  console.log('segs',segs,555,slug)
  const full = path.join(CONTENT_DIR, ...segs) + ".mdx";
  if (!fs.existsSync(full)) return null;
  return fileToPost(full);
}

export function getPostsByCategory(category: PostMeta["category"]): Post[] {
  return getAllPosts().filter((p) => p.category === category);
}

export function getPostsByTag(tag: string): Post[] {
  const t = String(tag ?? "").toLowerCase();
  if (!t) return [];
  return getAllPosts().filter((p) => p.tags.filter(Boolean).map((x) => String(x).toLowerCase()).includes(t));
}

export function getAllTags(): string[] {
  const set = new Set<string>();
  for (const p of getAllPosts()) p.tags.forEach((t) => set.add(String(t)));
  const tags = Array.from(set)
    .filter((t) => !!t && typeof t === "string")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  return tags.sort((a, b) => a.localeCompare(b));
}

export function getAllCategories(): PostMeta["category"][] {
  return ["dev", "diary", "essays", "opinions"];
}

export function searchPosts(query: string): Post[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return getAllPosts().filter((p) => {
    return (
      p.title.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q) ||
      p.tags.filter(Boolean).some((t) => String(t).toLowerCase().includes(q))
    );
  });
}
