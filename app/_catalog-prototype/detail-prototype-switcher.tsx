"use client"

import { Icon } from "@astryxdesign/core/Icon"
import { IconButton } from "@astryxdesign/core/IconButton"
import { Text } from "@astryxdesign/core/Text"
import { usePathname, useSearchParams } from "next/navigation"
import { type ReactNode, useCallback, useEffect } from "react"

import type { DetailVariant } from "./album-detail-layouts"

const definitions: { key: DetailVariant; name: string }[] = [
  { key: "A", name: "Editorial stack" },
  { key: "B", name: "Score rail" },
  { key: "C", name: "Constellation" },
  { key: "D", name: "Liner notes" },
  { key: "E", name: "Review timeline" },
]

interface DetailPrototypeSwitcherProps {
  children: (variant: DetailVariant) => ReactNode
}

export function DetailPrototypeSwitcher({
  children,
}: DetailPrototypeSwitcherProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const requested = searchParams.get("detail")
  const current = definitions.some(({ key }) => key === requested)
    ? (requested as DetailVariant)
    : "A"
  const currentIndex = definitions.findIndex(({ key }) => key === current)

  const select = useCallback(
    (offset: number) => {
      const next =
        definitions[
          (currentIndex + offset + definitions.length) % definitions.length
        ]
      const params = new URLSearchParams(searchParams.toString())
      params.set("detail", next.key)
      window.history.replaceState(null, "", `${pathname}?${params.toString()}`)
    },
    [currentIndex, pathname, searchParams]
  )

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (
        !["ArrowLeft", "ArrowRight"].includes(event.key) ||
        (event.target instanceof Element &&
          event.target.matches("input, textarea, [contenteditable]"))
      )
        return

      event.preventDefault()
      select(event.key === "ArrowLeft" ? -1 : 1)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [select])

  const definition = definitions[currentIndex]

  return (
    <>
      {children(current)}
      {process.env.NODE_ENV !== "production" && (
        <nav
          aria-label="Album detail layout prototypes"
          className="detail-prototype-switcher"
          data-detail-content
        >
          <IconButton
            icon={<Icon icon="chevronLeft" />}
            label="Previous detail layout"
            onClick={() => select(-1)}
            size="sm"
            tooltip="Previous layout"
            variant="ghost"
          />
          <Text type="label" color="inherit">
            {definition.key} — {definition.name}
          </Text>
          <IconButton
            icon={<Icon icon="chevronRight" />}
            label="Next detail layout"
            onClick={() => select(1)}
            size="sm"
            tooltip="Next layout"
            variant="ghost"
          />
        </nav>
      )}
    </>
  )
}
