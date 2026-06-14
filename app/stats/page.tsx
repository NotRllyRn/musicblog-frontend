import { RiBarChartBoxLine } from "@remixicon/react"

import { PlaceholderSection } from "@/components/placeholder-section"

export default function StatsPage() {
  return (
    <PlaceholderSection
      eyebrow="Stats"
      title="Listening analytics"
      description="This page is ready for album counts, ratings distribution, genre trends, and listening history visualizations from the CMS."
      icon={RiBarChartBoxLine}
    />
  )
}
