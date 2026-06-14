import Link from "next/link"
import { RiGithubLine, RiInstagramLine, RiRssLine } from "@remixicon/react"

import { Separator } from "@/components/ui/separator"

export function Footer() {
  return (
    <footer className="mt-24 border-t border-white/10 bg-background/80">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div className="max-w-md">
            <p className="font-heading text-sm font-semibold tracking-wide text-foreground">
              Orbit Notes
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              A dark, space-inspired listening journal for albums, notes,
              ratings, and future WordPress-powered music writing.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <Link
              href="/about"
              className="transition-colors hover:text-foreground"
            >
              About
            </Link>
            <Link
              href="/about#contact"
              className="transition-colors hover:text-foreground"
            >
              Contact
            </Link>
            <Link
              href="/albums"
              className="transition-colors hover:text-foreground"
            >
              Albums
            </Link>
            <a
              href="#"
              aria-label="RSS feed"
              className="transition-colors hover:text-foreground"
            >
              <RiRssLine aria-hidden="true" />
            </a>
            <a
              href="#"
              aria-label="Instagram"
              className="transition-colors hover:text-foreground"
            >
              <RiInstagramLine aria-hidden="true" />
            </a>
            <a
              href="#"
              aria-label="GitHub"
              className="transition-colors hover:text-foreground"
            >
              <RiGithubLine aria-hidden="true" />
            </a>
          </div>
        </div>
        <Separator />
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Orbit Notes. Built for fast album
          discovery.
        </p>
      </div>
    </footer>
  )
}
