import type { Metadata } from "next"

import "./layers.css"
import "./globals.css"
import "./_catalog-prototype/catalog-prototype.css"
import { AstryxProvider } from "./astryx-provider"

export const metadata: Metadata = {
  title: "Tim's Music Blog",
  description: "A tactile catalog of album reviews.",
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
