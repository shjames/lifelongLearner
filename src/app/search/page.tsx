import { getAllPosts } from "@/lib/posts";
import { SearchClient } from "@/components/search-client";

export const dynamic = "force-static";

export default function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const all = getAllPosts();
  return <SearchClient all={all} initialQuery={searchParams.q} />;
}

