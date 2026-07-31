"use client"

import { Text, VisuallyHidden, useMediaQuery } from "@astryxdesign/core"
import {
  motion,
  type MotionValue,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react"
import Image from "next/image"
import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type UIEvent,
  type WheelEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import { getRecordVisual, mechanicSettings } from "./mechanics"
import type { AlbumPost } from "./types"

interface RecordDeckProps {
  albums: AlbumPost[]
  index: number
  onNeedMore: () => void
  totalRecords: number
}

interface AnimatedRecordProps {
  album?: AlbumPost
  albumIndex: number
  isActive: boolean
  isHovered: boolean
  position: MotionValue<number>
  reduceMotion: boolean
  visualIndex: number
}

function AnimatedRecord({
  album,
  albumIndex,
  isActive,
  isHovered,
  position,
  reduceMotion,
  visualIndex,
}: AnimatedRecordProps) {
  const pullTarget = useMotionValue(0)
  const pullSpring = useSpring(pullTarget, {
    damping: 28,
    mass: 0.32,
    stiffness: 280,
  })
  const pull = reduceMotion ? pullTarget : pullSpring

  useEffect(() => {
    pullTarget.set(isHovered ? 1 : 0)
  }, [isHovered, pullTarget])

  const distance = () => visualIndex - position.get()
  const transform = useTransform(
    () =>
      getRecordVisual(distance(), albumIndex, reduceMotion, pull.get())
        .transform
  )
  const opacity = useTransform(
    () => getRecordVisual(distance(), albumIndex, reduceMotion).opacity
  )
  const dynamicStyle = { opacity, transform }

  return (
    <motion.li
      className="deck-record"
      data-active={isActive || undefined}
      data-album-index={albumIndex}
      data-hovered={isHovered || undefined}
      data-visual-index={visualIndex}
      style={dynamicStyle}
    >
      <figure
        className={`record-figure${album ? "" : " record-placeholder"}`}
        data-loading={album ? undefined : true}
      >
        {album && (
          <Image
            className="record-art"
            src={album.imageUrl}
            alt=""
            fill
            loading={isActive ? "eager" : "lazy"}
            sizes="(max-width: 47.99rem) 34vw, (max-width: 69.99rem) 21vw, 13.5rem"
          />
        )}
      </figure>
    </motion.li>
  )
}

export function RecordDeck({
  albums,
  index,
  onNeedMore,
  totalRecords,
}: RecordDeckProps) {
  const settings = mechanicSettings
  const radius = Math.floor(settings.window / 2)
  const initialIndex = Math.min(albums.length - 1, radius + 2 + (index % 3))
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const [hoveredVisualIndex, setHoveredVisualIndex] = useState<number | null>(
    null
  )
  const [showPreview, setShowPreview] = useState(false)
  const activeRef = useRef(initialIndex)
  const deck = useRef<HTMLElement>(null)
  const initialized = useRef(false)
  const scroll = useRef<HTMLOListElement>(null)
  const scrolling = useRef(false)
  const wheelTarget = useRef(initialIndex * settings.step)
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const isTouch = useMediaQuery("(hover: none), (pointer: coarse)")
  const reduceMotion = Boolean(useReducedMotion())
  const { scrollY } = useScroll({ container: scroll })
  const rawPosition = useTransform(scrollY, (value) => value / settings.step)
  const smoothPosition = useSpring(rawPosition, {
    damping: 34,
    mass: 0.42,
    stiffness: 300,
  })
  const position = reduceMotion ? rawPosition : smoothPosition
  const activeAlbum = albums[activeIndex]
  const previewVisualIndex = hoveredVisualIndex ?? activeIndex
  const previewAlbum = albums[previewVisualIndex]
  const previewPullTarget = useMotionValue(0)
  const previewPullSpring = useSpring(previewPullTarget, {
    damping: 28,
    mass: 0.32,
    stiffness: 280,
  })
  const previewPull = reduceMotion ? previewPullTarget : previewPullSpring
  const previewTransform = useTransform(
    () =>
      getRecordVisual(
        previewVisualIndex - position.get(),
        previewVisualIndex,
        reduceMotion,
        previewPull.get()
      ).transform
  )
  const previewStyle = { transform: previewTransform }

  useEffect(() => {
    previewPullTarget.set(hoveredVisualIndex === null ? 0 : 1)
  }, [hoveredVisualIndex, previewPullTarget])

  const setScroll = useCallback(
    (node: HTMLOListElement | null) => {
      scroll.current = node
      if (node && !initialized.current) {
        wheelTarget.current = initialIndex * settings.step
        node.scrollTop = wheelTarget.current
        initialized.current = true
      }
    },
    [initialIndex, settings.step]
  )

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current)
    },
    []
  )

  useEffect(() => {
    if (
      albums.length < totalRecords &&
      activeIndex + radius >= albums.length - 1
    )
      onNeedMore()
  }, [activeIndex, albums.length, onNeedMore, radius, totalRecords])

  useMotionValueEvent(position, "change", (value) => {
    const next = Math.max(0, Math.min(totalRecords - 1, Math.round(value)))
    if (next === activeRef.current) return
    activeRef.current = next
    setActiveIndex(next)
  })

  const visualIndexAt = (
    target: EventTarget | null,
    point?: { x: number; y: number }
  ) => {
    const elements = target instanceof Element ? [target] : []
    if (point) elements.push(...document.elementsFromPoint(point.x, point.y))

    for (const element of elements) {
      const record = element.closest<HTMLElement>("[data-visual-index]")
      if (record?.closest(".record-deck") !== deck.current) continue
      const next = Number(record.dataset.visualIndex)
      if (Number.isFinite(next)) return next
    }

    return null
  }

  const clearSelection = () => {
    setHoveredVisualIndex(null)
    setShowPreview(false)
  }

  const restartPreview = () => {
    previewPullTarget.set(0)
    previewPullSpring.jump(0)
  }

  const finishScrolling = () => {
    scrolling.current = false
    if (scroll.current) wheelTarget.current = scroll.current.scrollTop
  }

  const moveTo = (nextIndex: number) => {
    const next = Math.max(0, Math.min(totalRecords - 1, nextIndex))
    wheelTarget.current = next * settings.step
    clearSelection()
    scroll.current?.scrollTo({
      top: wheelTarget.current,
      behavior: reduceMotion ? "auto" : "smooth",
    })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const moves: Partial<Record<string, number>> = {
      ArrowDown: activeIndex + 1,
      ArrowUp: activeIndex - 1,
      End: totalRecords - 1,
      Home: 0,
    }

    if (event.key in moves) {
      event.preventDefault()
      moveTo(moves[event.key] ?? activeIndex)
    }

    if (event.key === "Enter" && activeAlbum) {
      window.location.assign(activeAlbum.href)
    }
  }

  const onClick = (event: MouseEvent<HTMLElement>) => {
    const visualIndex = visualIndexAt(event.target, {
      x: event.clientX,
      y: event.clientY,
    })
    if (visualIndex === null || !albums[visualIndex]) return

    if (isTouch && visualIndex !== hoveredVisualIndex) {
      restartPreview()
      setHoveredVisualIndex(visualIndex)
      setShowPreview(true)
      return
    }

    window.location.assign(albums[visualIndex].href)
  }

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (isTouch || scrolling.current) return
    const foundIndex = visualIndexAt(event.target)
    const visualIndex =
      foundIndex !== null && albums[foundIndex] ? foundIndex : null
    if (visualIndex !== null && visualIndex !== hoveredVisualIndex)
      restartPreview()
    setHoveredVisualIndex(visualIndex)
    setShowPreview(visualIndex !== null)
  }

  const onScroll = (event: UIEvent<HTMLOListElement>) => {
    if (!scrolling.current) wheelTarget.current = event.currentTarget.scrollTop
    clearSelection()
  }

  const onWheel = (event: WheelEvent<HTMLElement>) => {
    clearSelection()
    scrolling.current = true
    if (scroll.current) {
      const multiplier = event.deltaMode === 1 ? 16 : 1
      const sensitivity = 1.5
      const max = (totalRecords - 1) * settings.step
      wheelTarget.current = Math.max(
        0,
        Math.min(
          max,
          wheelTarget.current + event.deltaY * multiplier * sensitivity
        )
      )
      scroll.current.scrollTop = wheelTarget.current
    }
    if (settleTimer.current) clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(finishScrolling, 280)
  }

  const start = Math.max(0, activeIndex - radius)
  const end = Math.min(totalRecords, activeIndex + radius + 1)
  const windowed = Array.from({ length: end - start }, (_, offset) => {
    const visualIndex = start + offset
    return {
      album: albums[visualIndex],
      albumIndex: visualIndex,
      visualIndex,
    }
  })
  const hovered =
    hoveredVisualIndex !== null &&
    !windowed.some(({ visualIndex }) => visualIndex === hoveredVisualIndex)
      ? [
          {
            album: albums[hoveredVisualIndex],
            albumIndex: hoveredVisualIndex,
            visualIndex: hoveredVisualIndex,
          },
        ]
      : []
  const visible = [...windowed, ...hovered].sort(
    (first, second) =>
      Math.abs(second.visualIndex - activeIndex) -
      Math.abs(first.visualIndex - activeIndex)
  )

  return (
    <section
      className={`record-deck deck-${index + 1}`}
      aria-keyshortcuts="ArrowUp ArrowDown Home End Enter"
      aria-label={`Browse albums vertically. Selected: ${activeAlbum?.title ?? "album"}.`}
      onBlur={() => {
        if (!isTouch) clearSelection()
      }}
      onClick={onClick}
      onFocus={() => setShowPreview(true)}
      onKeyDown={onKeyDown}
      onPointerLeave={() => {
        if (!isTouch) clearSelection()
      }}
      onPointerMove={onPointerMove}
      onWheel={onWheel}
      ref={deck}
      role="link"
      tabIndex={0}
    >
      <ol className="record-stage" aria-hidden="true">
        {visible.map(({ album, albumIndex, visualIndex }) => (
          <AnimatedRecord
            album={album}
            albumIndex={albumIndex}
            isActive={visualIndex === activeIndex}
            isHovered={visualIndex === hoveredVisualIndex}
            key={album?.id ?? `placeholder-${visualIndex}`}
            position={position}
            reduceMotion={reduceMotion}
            visualIndex={visualIndex}
          />
        ))}
      </ol>

      {showPreview && previewAlbum && (
        <ol className="record-preview-stage" aria-hidden="true">
          <motion.li className="record-preview-positioner" style={previewStyle}>
            <aside className="record-preview">
              <Text type="label" color="inherit" maxLines={2}>
                {previewAlbum.title}
              </Text>
              <Text type="supporting" color="inherit" maxLines={1}>
                {previewAlbum.artist}
              </Text>
            </aside>
          </motion.li>
        </ol>
      )}

      <ol
        className={`record-scroll snap-${settings.snap}`}
        aria-hidden="true"
        onScroll={onScroll}
        ref={setScroll}
      >
        {Array.from({ length: totalRecords }, (_, recordIndex) => (
          <li className="record-stop" key={recordIndex} />
        ))}
        <li className="record-tail" />
      </ol>

      {showPreview && previewAlbum && (
        <VisuallyHidden as="div" aria-live="polite">
          {previewAlbum.title}, {previewAlbum.artist}
        </VisuallyHidden>
      )}
    </section>
  )
}
