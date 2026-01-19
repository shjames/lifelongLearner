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
}: {
  dir: string;
  files: string;
  className?: string;
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
        return <img key={n} src={src} alt={n} className="w-full h-auto" />;
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
}: {
  dir: string;
  files: string;
  className?: string;
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
        return <img key={n} src={src} alt={n} className="w-full h-auto" />;
      })}
    </div>
  );
}
