"use client"

import { useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@astryxdesign/core/Button"
import { HStack } from "@astryxdesign/core/HStack"
import { Text } from "@astryxdesign/core/Text"

import type { VariantKey } from "./types"

const variants: { key: VariantKey; name: string }[] = [
  { key: "A", name: "Record shop" },
  { key: "B", name: "Cover flow" },
  { key: "C", name: "Archive index" },
  { key: "D", name: "Pirate radio" },
  { key: "E", name: "Listening gallery" },
]

interface PrototypeSwitcherProps {
  current: VariantKey
  onChange: (variant: VariantKey) => void
}

export function PrototypeSwitcher({
  current,
  onChange,
}: PrototypeSwitcherProps) {
  const router = useRouter()
  const isProduction = process.env.NODE_ENV === "production"
  const currentIndex = variants.findIndex(({ key }) => key === current)

  const select = useCallback(
    (offset: number) => {
      const next =
        variants[(currentIndex + offset + variants.length) % variants.length]
      onChange(next.key)
      router.replace(`/?variant=${next.key}`, { scroll: false })
    },
    [currentIndex, onChange, router]
  )

  useEffect(() => {
    if (isProduction) return

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        target.matches("input, textarea, [contenteditable='true']")
      ) {
        return
      }

      if (event.key === "ArrowLeft") select(-1)
      if (event.key === "ArrowRight") select(1)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isProduction, select])

  if (isProduction) return null

  const active = variants[currentIndex]

  return (
    <aside className="prototype-switcher" aria-label="Prototype variants">
      <HStack gap={3} vAlign="center">
        <Button label="Prev" variant="secondary" onClick={() => select(-1)} />
        <Text type="code" color="inherit" hasTabularNumbers>
          {active.key} · {active.name}
        </Text>
        <Button label="Next" variant="secondary" onClick={() => select(1)} />
      </HStack>
    </aside>
  )
}
