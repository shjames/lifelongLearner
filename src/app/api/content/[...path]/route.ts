import fs from "fs";
import path from "path";

export async function GET(
  _req: Request,
  { params }: { params: { path?: string[] } }
) {
  const rawParts = Array.isArray(params.path) ? params.path.filter(Boolean) : [];
  if (rawParts.length === 0) return new Response("Not Found", { status: 404 });
  const decParts = rawParts.map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });

  const CONTENT_DIR = path.join(process.cwd(), "content");
  const candidates = [
    path.resolve(path.join(CONTENT_DIR, ...decParts)),
    path.resolve(path.join(CONTENT_DIR, ...rawParts)),
  ];
  const base = path.resolve(CONTENT_DIR);

  try {
    let resolved = "";
    for (const c of candidates) {
      if (c === base || c.startsWith(base + path.sep)) {
        if (fs.existsSync(c) && fs.statSync(c).isFile()) {
          resolved = c;
          break;
        }
      }
    }

    if (!resolved) return new Response("Not Found", { status: 404 });

    const ext = path.extname(resolved).toLowerCase();
    const mime =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".gif"
        ? "image/gif"
        : ext === ".svg"
        ? "image/svg+xml"
        : ext === ".webp"
        ? "image/webp"
        : ext === ".ico"
        ? "image/x-icon"
        : ext === ".bmp"
        ? "image/bmp"
        : "application/octet-stream";

    const buf = fs.readFileSync(resolved);
    return new Response(buf, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Server Error", { status: 500 });
  }
}
