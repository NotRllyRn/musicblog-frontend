import type { Metadata } from "next"

import "./layers.css"
import "./globals.css"
import { AstryxProvider } from "./astryx-provider"

export const metadata: Metadata = {
  title: "Music Journal",
  description: "A small Astryx component test for a music blog.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <AstryxProvider>{children}</AstryxProvider>
      </body>
    </html>
  )
}
