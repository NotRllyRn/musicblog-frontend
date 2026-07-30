"use client"

import { Theme, useTheme } from "@astryxdesign/core/theme"
import { neutralTheme } from "@astryxdesign/theme-neutral/built"
import { createContext, useContext, useState } from "react"

type ColorMode = "system" | "light" | "dark"

const ColorModeContext = createContext<(mode: ColorMode) => void>(() => {})

export function useColorMode() {
  const setMode = useContext(ColorModeContext)
  const { mode } = useTheme()

  return {
    isDark: mode === "dark",
    setDark: (isDark: boolean) => setMode(isDark ? "dark" : "light"),
  }
}

export function AstryxProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ColorMode>("system")

  return (
    <ColorModeContext value={setMode}>
      <Theme theme={neutralTheme} mode={mode}>
        {children}
      </Theme>
    </ColorModeContext>
  )
}
