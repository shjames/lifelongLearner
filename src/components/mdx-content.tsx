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
import Image from "@/components/Image";
function ScrollableTable({ children, ...props }: React.ComponentPropsWithoutRef<"table">) {
  return (
    <div className="overflow-x-auto rounded-lg [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-cream-300">
      <table {...props}>{children}</table>
    </div>
  );
}

const components = {
  Gallery,
  ContentImg,
  ImagesManual,
  ContentImgPublic,
  ImagesManualPublic,
  Image,
  table: ScrollableTable,
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
