import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, "content");
const PUBLIC_DIR = path.join(ROOT, "public");
const DEST_BASE = path.join(PUBLIC_DIR, "content-encoded");

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

function encSegment(s) {
  return encodeURIComponent(s);
}

function copyEncoded(srcFull) {
  const rel = path.relative(CONTENT_DIR, srcFull);
  const parts = rel.split(path.sep).filter(Boolean).map(encSegment);
  const destFull = path.join(DEST_BASE, ...parts);
  ensureDir(path.dirname(destFull));
  fs.copyFileSync(srcFull, destFull);
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full);
    } else {
      const ext = path.extname(full).toLowerCase();
      if (ALLOW_EXT.has(ext)) copyEncoded(full);
    }
  }
}

ensureDir(DEST_BASE);
walk(CONTENT_DIR);
console.log("[sync-content-encoded-to-public] copied assets to public/content-encoded/");

