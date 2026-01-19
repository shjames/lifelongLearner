import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, "content");
const PUBLIC_CONTENT_DIR = path.join(ROOT, "public", "content");

const ALLOW_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".bmp",
]);

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function walk(src, destBase) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const srcFull = path.join(src, e.name);
    const rel = path.relative(CONTENT_DIR, srcFull);
    const destFull = path.join(destBase, rel);
    if (e.isDirectory()) {
      ensureDir(destFull);
      walk(srcFull, destBase);
    } else {
      const ext = path.extname(srcFull).toLowerCase();
      if (ALLOW_EXT.has(ext)) {
        ensureDir(path.dirname(destFull));
        fs.copyFileSync(srcFull, destFull);
      }
    }
  }
}

ensureDir(PUBLIC_CONTENT_DIR);
walk(CONTENT_DIR, PUBLIC_CONTENT_DIR);
console.log("[sync-content-to-public] copied non-mdx assets from content/ to public/content/");

