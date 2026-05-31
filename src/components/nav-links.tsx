"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/blog", label: "博客", exact: true },
  { href: "/category/dev", label: "开发" },
  { href: "/category/note", label: "笔记" },
  { href: "/diary", label: "日记" },
  { href: "/category/essays", label: "随笔" },
  { href: "/category/opinions", label: "观点" },
  { href: "/category/travel", label: "旅游" },
  { href: "/search", label: "搜索", exact: true },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-0">
      {NAV.map(({ href, label, exact }) => {
        const active = exact
          ? pathname === href
          : pathname === href ||
            pathname.startsWith(href + "/") ||
            (href === "/diary" && pathname.startsWith("/blog/diary"));

        return (
          <Link
            key={href}
            href={href}
            className={`shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              active
                ? "text-terra-600 bg-terra-50"
                : "text-cream-600 hover:text-cream-900 hover:bg-cream-50"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
