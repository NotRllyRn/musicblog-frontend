"use client"

import { Button } from "@astryxdesign/core/Button"
import { Spinner } from "@astryxdesign/core/Spinner"
import { Text } from "@astryxdesign/core/Text"
import { motion, useMotionValue, useReducedMotion } from "motion/react"
import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { ArtistBubble } from "./artist-bubble"
import { buildArtistLayout, calculateHoverDisplacements } from "./artist-layout"
import type { ArtistProfile } from "./types"

interface ArtistFieldProps {
  artists: ArtistProfile[] | null
  hasError: boolean
  isLoading: boolean
  onRetry: () => void
}

const DESKTOP_DIAMETER = 112
const MOBILE_DIAMETER = 82
const BUBBLE_GAP = 10
const ACTIVE_SCALE = 1.45

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export function ArtistField({
  artists,
  hasError,
  isLoading,
  onRetry,
}: ArtistFieldProps) {
  const viewport = useRef<HTMLElement>(null)
  const initialized = useRef(false)
  const [dimensions, setDimensions] = useState({ height: 0, width: 0 })
  const [activeArtistId, setActiveArtistId] = useState<number | null>(null)
  const reduceMotion = Boolean(useReducedMotion())
  const panX = useMotionValue(0)
  const panY = useMotionValue(0)

  useEffect(() => {
    if (!viewport.current) return
    const observer = new ResizeObserver(([entry]) => {
      const { height, width } = entry.contentRect
      setDimensions((current) =>
        current.height === height && current.width === width
          ? current
          : { height, width }
      )
    })
    observer.observe(viewport.current)
    return () => observer.disconnect()
  }, [artists])

  const compact = dimensions.width > 0 && dimensions.width <= 768
  const diameter = compact ? MOBILE_DIAMETER : DESKTOP_DIAMETER
  const layout = useMemo(
    () =>
      buildArtistLayout(artists ?? [], {
        columns: compact ? 14 : 28,
        diameter,
        gap: BUBBLE_GAP,
      }),
    [artists, compact, diameter]
  )
  const offsets = useMemo(
    () =>
      calculateHoverDisplacements(layout.items, activeArtistId, {
        activeScale: ACTIVE_SCALE,
        diameter,
        gap: BUBBLE_GAP,
        influenceRadiusMultiplier: 2.35,
        softPush: 10,
      }),
    [activeArtistId, diameter, layout.items]
  )
  const constraints = useMemo(() => {
    const left = Math.min(0, dimensions.width - layout.width)
    const top = Math.min(0, dimensions.height - layout.height)
    return { bottom: 0, left, right: 0, top }
  }, [dimensions, layout.height, layout.width])

  useLayoutEffect(() => {
    const nextX = initialized.current
      ? clamp(panX.get(), constraints.left, constraints.right)
      : (constraints.left + constraints.right) / 2
    const nextY = initialized.current
      ? clamp(panY.get(), constraints.top, constraints.bottom)
      : (constraints.top + constraints.bottom) / 2
    panX.set(nextX)
    panY.set(nextY)
    initialized.current = true
  }, [constraints, panX, panY])

  const deactivate = (id: number) =>
    setActiveArtistId((current) => (current === id ? null : current))
  const clearFromEmptySpace = (event: PointerEvent<HTMLElement>) => {
    if (!(event.target as Element).closest(".artist-face"))
      setActiveArtistId(null)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") setActiveArtistId(null)
  }

  if (!artists)
    return (
      <section className="artist-status" aria-live="polite">
        {hasError ? (
          <>
            <Text color="inherit">Artists could not load.</Text>
            <Button label="Try again" onClick={onRetry} size="sm" />
          </>
        ) : (
          <Spinner label="Preparing artists" shade="inherit" size="md" />
        )}
      </section>
    )

  return (
    <section
      aria-busy={isLoading}
      aria-label={`Browse ${artists.length} artists. Drag to explore.`}
      className="artist-viewport"
      onKeyDown={onKeyDown}
      onPointerDown={clearFromEmptySpace}
      ref={viewport}
    >
      {dimensions.width > 0 && (
        <motion.section
          className="artist-world"
          drag
          dragConstraints={constraints}
          dragElastic={reduceMotion ? 0 : 0.06}
          dragMomentum={!reduceMotion}
          onDragStart={() => setActiveArtistId(null)}
          style={{
            height: layout.height,
            width: layout.width,
            x: panX,
            y: panY,
          }}
        >
          {layout.items.map(({ artist, x, y }) => {
            const push = offsets.get(artist.id) ?? { x: 0, y: 0 }
            return (
              <ArtistBubble
                active={activeArtistId === artist.id}
                artist={artist}
                diameter={diameter}
                key={artist.id}
                onActivate={setActiveArtistId}
                onDeactivate={deactivate}
                pushX={push.x}
                pushY={push.y}
                x={x}
                y={y}
              />
            )
          })}
        </motion.section>
      )}
    </section>
  )
}
