"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";

export function SiteHeader() {
  const path = usePathname();
  return (
    <header className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-x-3 gap-y-3 px-5 py-5 lg:px-10">
      <Link href="/" className="flex min-h-11 items-center gap-2.5">
        <BrandMark />
        <span>
          <span className="block text-[1.2rem] font-semibold tracking-tight sm:text-[1.35rem]">NotBuyChance</span>
          <span className="hidden text-xs text-muted sm:block">Thoughtful gifts. Deeper connections.</span>
        </span>
      </Link>
      <nav className="ml-auto flex items-center gap-1 text-sm sm:gap-2">
        {path === "/" ? (
          <a href="#how" className="hidden min-h-11 items-center px-3 text-muted sm:flex">
            How it works
          </a>
        ) : null}
        <Link href="/dashboard" className="inline-flex min-h-11 items-center px-3">
          Saved
        </Link>
        {path !== "/discover" ? (
          <Link href="/discover" className="btn-primary inline-flex min-h-11 items-center rounded-full px-4">
            <span className="sm:hidden">Start</span>
            <span className="hidden sm:inline">Find a gift</span>
          </Link>
        ) : null}
      </nav>
    </header>
  );
}
