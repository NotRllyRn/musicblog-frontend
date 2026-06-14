import type { ElementType } from "react"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

type PlaceholderSectionProps = {
  eyebrow: string
  title: string
  description: string
  icon: ElementType
}

export function PlaceholderSection({
  eyebrow,
  title,
  description,
  icon: Icon,
}: PlaceholderSectionProps) {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-medium tracking-[0.28em] text-cyan-200/80 uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight sm:text-6xl">
          {title}
        </h1>
      </div>
      <Empty className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_24px_100px_rgba(37,99,235,0.12)]">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-cyan-300/10 text-cyan-100">
            <Icon aria-hidden={true} />
          </EmptyMedia>
          <EmptyTitle>Ready for CMS content</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <p className="max-w-xl text-sm text-muted-foreground">
            The layout and visual components are rendered now. WordPress can
            provide the live content, cover art URLs, and metadata later.
          </p>
        </EmptyContent>
      </Empty>
    </main>
  )
}
