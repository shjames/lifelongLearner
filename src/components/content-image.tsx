import fs from "fs";
import path from "path";

function encPath(parts: string[]) {
  return parts.map((s) => encodeURIComponent(s)).join("/");
}

export function ContentImg({
  dir,
  file,
  className,
}: {
  dir: string;
  file: string;
  className?: string;
}) {
  const segs = dir.split("/").filter(Boolean);
  const src = `/api/content/${encPath(segs)}/${encodeURIComponent(file)}`;
  return <img src={src} alt={file} className={className ?? "w-full h-auto"} />;
}

export function ImagesManual({
  dir,
  files,
  className,
  linkToDetail,
}: {
  dir: string;
  files: string;
  className?: string;
  linkToDetail?: boolean;
}) {
  const segs = dir.split("/").filter(Boolean);
  const list = files
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return (
    <div className={className ?? "grid grid-cols-1 gap-4"}>
      {list.map((n) => {
        const src = `/api/content/${encPath(segs)}/${encodeURIComponent(n)}`;

        const linksPath = path.join(
          process.cwd(),
          "public",
          "content",
          ...segs,
          "links.json",
        );
        let map: Record<string, string> = {};
        try {
          if (fs.existsSync(linksPath)) {
            const txt = fs.readFileSync(linksPath, "utf-8");
            map = JSON.parse(txt);
          }
        } catch {}
        const ext = map[n] || "";
        return (
          <a key={n} href={ext} target="_blank" rel="noopener noreferrer">
            <img src={src} alt={n} className="w-full h-auto" />
          </a>
        );
      })}
    </div>
  );
}

export function ContentImgPublic({
  dir,
  file,
  className,
}: {
  dir: string;
  file: string;
  className?: string;
}) {
  const segs = dir.split("/").filter(Boolean);
  const src = `/content/${encPath(segs)}/${encodeURIComponent(file)}`;
  return <img src={src} alt={file} className={className ?? "w-full h-auto"} />;
}

export function ImagesManualPublic({
  dir,
  files,
  className,
  linkToDetail,
}: {
  dir: string;
  files: string;
  className?: string;
  linkToDetail?: boolean;
}) {
  const segs = dir.split("/").filter(Boolean);
  const list = files
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return (
    <div className={className ?? "grid grid-cols-1 gap-4"}>
      {list.map((n) => {
        const src = `/content/${encPath(segs)}/${encodeURIComponent(n)}`;

        const linksPath = path.join(
          process.cwd(),
          "public",
          "content",
          ...segs,
          "links.json",
        );
        let map: Record<string, string> = {};
        try {
          if (fs.existsSync(linksPath)) {
            const txt = fs.readFileSync(linksPath, "utf-8");
            map = JSON.parse(txt);
          }
        } catch {}
        const ext = map[n] || "";
        return (
          <a key={n} href={ext} target="_blank" rel="noopener noreferrer">
            <img src={src} alt={n} className="w-full h-auto" />
          </a>
        );
      })}
    </div>
  );
}
