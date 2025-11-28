"use client";
import Giscus from "@giscus/react";

export function Comments() {
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO;
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID;
  const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY;
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;
  function isOwnerRepo(x: string): x is `${string}/${string}` {
    const firstSlash = x.indexOf("/");
    return firstSlash > 0 && firstSlash < x.length - 1 && x.indexOf("/", firstSlash + 1) === -1;
  }
  if (!repo || !repoId || !category || !categoryId || !isOwnerRepo(repo)) return null;
  return (
    <div className="mt-10">
      <Giscus
        repo={repo}
        repoId={repoId}
        category={category}
        categoryId={categoryId}
        mapping="pathname"
        reactionsEnabled="1"
        emitMetadata="0"
        theme="light"
        lang="zh-CN"
      />
    </div>
  );
}
