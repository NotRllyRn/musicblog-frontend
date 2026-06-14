"use client"

import { FormEvent, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { RiSearchLine } from "@remixicon/react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

type SearchFormProps = {
  className?: string
  compact?: boolean
}

export function SearchForm({ className, compact = false }: SearchFormProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const currentQuery = searchParams.get("q") ?? ""

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const params = new URLSearchParams(searchParams.toString())
    const trimmed = String(formData.get("q") ?? "").trim()

    if (trimmed) {
      params.set("q", trimmed)
    } else {
      params.delete("q")
    }

    startTransition(() => {
      router.push(`/${params.toString() ? `?${params.toString()}` : ""}`)
    })
  }

  return (
    <form
      role="search"
      aria-label="Search albums, artists, and posts"
      onSubmit={onSubmit}
      className={cn("w-full", compact ? "max-w-none" : "max-w-xs", className)}
    >
      <InputGroup
        className={cn(
          "h-10 border-white/10 bg-white/5 shadow-[0_0_30px_rgba(37,99,235,0.08)] backdrop-blur-md transition-colors focus-within:bg-white/[0.08]",
          isPending && "opacity-80"
        )}
      >
        <InputGroupAddon>
          <RiSearchLine aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          key={currentQuery}
          name="q"
          type="search"
          defaultValue={currentQuery}
          placeholder="Search albums..."
          aria-label="Search albums, artists, and posts"
          disabled={isPending && pathname === "/"}
        />
      </InputGroup>
    </form>
  )
}
