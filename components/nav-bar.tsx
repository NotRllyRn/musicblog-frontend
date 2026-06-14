"use client"

import { Suspense } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { RiMenuLine, RiPlanetLine } from "@remixicon/react"

import { SearchForm } from "@/components/search-form"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

function SearchFallback() {
  return (
    <div
      aria-hidden="true"
      className="h-10 w-full max-w-xs rounded-lg border border-white/10 bg-white/5"
    />
  )
}

const navItems = [
  { href: "/", label: "Home" },
  { href: "/albums", label: "Albums" },
  { href: "/currently-listening", label: "Currently Listening" },
  { href: "/stats", label: "Stats" },
  { href: "/about", label: "About" },
]

export function NavBar() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/82 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-16 w-full max-w-[1800px] items-center gap-4 px-4 sm:px-6 lg:px-8"
      >
        <Link
          href="/"
          className="group flex min-w-fit items-center gap-2 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="flex size-9 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.18)] transition-transform group-hover:scale-105">
            <RiPlanetLine aria-hidden="true" />
          </span>
          <span className="font-heading text-base font-semibold tracking-tight text-foreground sm:text-lg">
            Orbit Notes
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)

            return (
              <Button key={item.href} variant="ghost" size="sm" asChild>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "text-muted-foreground",
                    active && "bg-muted text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              </Button>
            )
          })}
        </div>

        <div className="ml-auto hidden w-full justify-end md:flex">
          <Suspense fallback={<SearchFallback />}>
            <SearchForm />
          </Suspense>
        </div>

        <div className="ml-auto md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-lg" aria-label="Open menu">
                <RiMenuLine data-icon="inline-start" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent className="border-white/10 bg-background/95 backdrop-blur-xl">
              <SheetHeader>
                <SheetTitle>Orbit Notes</SheetTitle>
                <SheetDescription>
                  Search and browse the album journal.
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4">
                <Suspense fallback={<SearchFallback />}>
                  <SearchForm compact />
                </Suspense>
                <div className="flex flex-col gap-1">
                  {navItems.map((item) => (
                    <SheetClose key={item.href} asChild>
                      <Button variant="ghost" className="justify-start" asChild>
                        <Link href={item.href}>{item.label}</Link>
                      </Button>
                    </SheetClose>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  )
}
