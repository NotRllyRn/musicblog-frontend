"use client"

import { Switch } from "@astryxdesign/core/Switch"

import { useColorMode } from "@/app/astryx-provider"

export function ThemeToggle() {
  const { isDark, setDark } = useColorMode()

  return (
    <aside className="theme-toggle" aria-label="Color theme">
      <Switch label="Dark mode" value={isDark} onChange={setDark} />
    </aside>
  )
}
