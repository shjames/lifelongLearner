"use client";
import * as React from "react";

export function ShareButtons({ title }: { title: string }) {
  const [url, setUrl] = React.useState<string>("");
  React.useEffect(() => {
    setUrl(window.location.href);
  }, []);

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {}
    }
  };

  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(title);
  return (
    <div className="mt-6 flex items-center gap-3">
      <button onClick={share} className="rounded bg-zinc-900 px-3 py-1 text-white">系统分享</button>
      <a
        href={`https://twitter.com/intent/tweet?url=${encoded}&text=${text}`}
        target="_blank"
        className="rounded border px-3 py-1"
      >Twitter</a>
    </div>
  );
}

