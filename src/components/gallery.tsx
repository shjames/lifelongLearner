import fs from "fs";
import path from "path";

export function Gallery({ dir, pattern }: { dir: string; pattern?: string }) {
  const segs = dir.split("/").filter(Boolean);
  const baseDir = path.join(process.cwd(), "content", ...segs);
  const names = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((n) => {
      const re = new RegExp(pattern ?? "^image(\\s\\d+)?\\.png$", "i");
      return re.test(n);
    })
    .sort((a, b) => {
      const na = Number((a.match(/image\s*(\d+)\.png/i) ?? [])[1] ?? -1);
      const nb = Number((b.match(/image\s*(\d+)\.png/i) ?? [])[1] ?? -1);
      return na - nb;
    });
console.log(5345345,names)
  return (
    <div className="grid grid-cols-1 gap-4">
      {names.map((n) => {
        const encodedDir = segs.map((s) => encodeURIComponent(s)).join("/");
        const src = `/content/${encodedDir}/${encodeURIComponent(n)}`;
        return <img key={n} src={src} alt={n} className="w-full h-auto" />;
      })}
    </div>
  );
}
