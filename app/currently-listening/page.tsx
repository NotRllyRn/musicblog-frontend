import { RiHeadphoneLine } from "@remixicon/react"

import { PlaceholderSection } from "@/components/placeholder-section"

export default function CurrentlyListeningPage() {
  return (
    <PlaceholderSection
      eyebrow="Currently Listening"
      title="Live queue"
      description="This page is ready to render active listens, now-playing entries, and recent queue updates from WordPress."
      icon={RiHeadphoneLine}
    />
  )
}
