import * as React from "react";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { Gallery } from "@/components/gallery";
import {
  ContentImg,
  ImagesManual,
  ContentImgPublic,
  ImagesManualPublic,
} from "@/components/content-image";

const components = {
  Gallery,
  ContentImg,
  ImagesManual,
  ContentImgPublic,
  ImagesManualPublic,
};

export function MDXContent({ source }: { source: string }) {
  return (
    <MDXRemote
      source={source}
      options={{
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
        },
      }}
      components={components}
    />
  );
}
