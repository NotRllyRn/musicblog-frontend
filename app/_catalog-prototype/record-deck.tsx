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
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import { getRecordVisual, mechanicSettings } from "./mechanics"
import type { AlbumPost } from "./types"

interface RecordDeckProps {
  albums: AlbumPost[]
  detailVisible: boolean
  index: number
  openedAlbumId: number | null
  onEndChange: (index: number, ended: boolean) => void
  onNeedMore: () => void
  onOpenAlbum: (album: AlbumPost, invoker: HTMLElement) => void
  onSelectionChange: (visualIndex: number | null) => void
  selectionActive: boolean
  selectedVisualIndex: number | null
  totalRecords: number
}

interface AnimatedRecordProps {
  album?: AlbumPost
  albumIndex: number
  detailVisible: boolean
  isActive: boolean
  isDetailSource: boolean
  isHovered: boolean
  position: MotionValue<number>
  reduceMotion: boolean
  trackLayout: boolean
  visualIndex: number
}

const AnimatedRecord = memo(function AnimatedRecord({
  album,
  albumIndex,
  detailVisible,
  isActive,
  isDetailSource,
  isHovered,
  position,
  reduceMotion,
  trackLayout,
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
      {!(album && isDetailSource && detailVisible) && (
        <motion.figure
          className={`record-figure${album ? "" : " record-placeholder"}`}
          data-album-id={album?.id}
          data-loading={album ? undefined : true}
          layoutId={
            album && trackLayout ? `album-cover-${album.id}` : undefined
          }
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
        </motion.figure>
      )}
    </motion.li>
  )
})

interface RecordHitZoneProps {
  albumIndex: number
  position: MotionValue<number>
  reduceMotion: boolean
  visualIndex: number
}

const RecordHitZone = memo(function RecordHitZone({
  albumIndex,
  position,
  reduceMotion,
  visualIndex,
}: RecordHitZoneProps) {
  const transform = useTransform(
    () =>
      getRecordVisual(visualIndex - position.get(), albumIndex, reduceMotion)
        .transform
  )
  const hitStyle = { transform }

  return (
    <motion.li
      className="record-hit-zone"
      data-visual-index={visualIndex}
      style={hitStyle}
    />
  )
})

export function RecordDeck({
  albums,
  detailVisible,
  index,
  openedAlbumId,
  onEndChange,
  onNeedMore,
  onOpenAlbum,
  onSelectionChange,
  selectionActive,
  selectedVisualIndex,
  totalRecords,
}: RecordDeckProps) {
  const settings = mechanicSettings
  const radius = Math.floor(settings.window / 2)
  const recordsAbove = radius - 4
  const recordsBelow = radius
  const initialIndex = Math.min(albums.length - 1, radius + 2 + (index % 3))
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const [hoveredVisualIndex, setHoveredVisualIndex] = useState<number | null>(
    null
  )
  const [showPreview, setShowPreview] = useState(false)
  const activeRef = useRef(initialIndex)
  const deck = useRef<HTMLElement>(null)
  const initialized = useRef(false)
  const openFrame = useRef<number | null>(null)
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
  const openedVisualIndex = albums.findIndex(
    (album) => album.id === openedAlbumId
  )
  const detailVisualIndex = openedVisualIndex < 0 ? null : openedVisualIndex
  const interactionVisualIndex = isTouch
    ? selectedVisualIndex
    : hoveredVisualIndex
  const detailReturning = detailVisualIndex !== null && !detailVisible
  const activeAlbum = albums[activeIndex]
  const previewVisualIndex = detailReturning
    ? detailVisualIndex
    : (interactionVisualIndex ?? activeIndex)
  const previewAlbum = albums[previewVisualIndex]
  const previewVisible =
    detailReturning ||
    (detailVisualIndex === null &&
      (isTouch ? selectedVisualIndex !== null : showPreview))
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
    previewPullTarget.set(interactionVisualIndex === null ? 0 : 1)
  }, [interactionVisualIndex, previewPullTarget])

  const setScroll = useCallback(
    (node: HTMLOListElement | null) => {
      scroll.current = node
      if (node && !initialized.current) {
        wheelTarget.current = initialIndex * settings.step
        node.scrollTop = wheelTarget.current
        smoothPosition.jump(initialIndex)
        initialized.current = true
      }
    },
    [initialIndex, settings.step, smoothPosition]
  )

  useEffect(
    () => () => {
      if (openFrame.current !== null) cancelAnimationFrame(openFrame.current)
      if (settleTimer.current) clearTimeout(settleTimer.current)
    },
    []
  )

  useEffect(() => {
    if (
      albums.length < totalRecords &&
      activeIndex + recordsBelow >= albums.length - 1
    )
      onNeedMore()
  }, [activeIndex, albums.length, onNeedMore, recordsBelow, totalRecords])

  useEffect(() => {
    onEndChange(index, activeIndex === totalRecords - 1 && Boolean(activeAlbum))
  }, [activeAlbum, activeIndex, index, onEndChange, totalRecords])

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
    if (isTouch) onSelectionChange(null)
  }

  const openDesktopAlbum = (album: AlbumPost) => {
    if (!deck.current) return
    const invoker = deck.current
    if (openFrame.current !== null) cancelAnimationFrame(openFrame.current)
    openFrame.current = requestAnimationFrame(() => {
      openFrame.current = requestAnimationFrame(() => {
        openFrame.current = null
        clearSelection()
        onOpenAlbum(album, invoker)
      })
    })
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

    const activates = event.key === "Enter" || (!isTouch && event.key === " ")
    if (activates && activeAlbum && deck.current) {
      event.preventDefault()
      if (isTouch) window.location.assign(activeAlbum.href)
      else openDesktopAlbum(activeAlbum)
    }
  }

  const onClick = (event: MouseEvent<HTMLElement>) => {
    const foundIndex = visualIndexAt(event.target, {
      x: event.clientX,
      y: event.clientY,
    })
    const visualIndex =
      foundIndex !== null && albums[foundIndex] ? foundIndex : null

    if (isTouch) {
      if (selectionActive) {
        if (visualIndex === selectedVisualIndex && visualIndex !== null)
          window.location.assign(albums[visualIndex].href)
        else onSelectionChange(null)
        return
      }

      if (visualIndex !== null) {
        restartPreview()
        onSelectionChange(visualIndex)
      }
      return
    }

    if (visualIndex !== null) openDesktopAlbum(albums[visualIndex])
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

  const start = Math.max(0, activeIndex - recordsAbove)
  const end = Math.min(totalRecords, activeIndex + recordsBelow + 1)
  const windowed = Array.from({ length: end - start }, (_, offset) => {
    const visualIndex = start + offset
    return {
      album: albums[visualIndex],
      albumIndex: visualIndex,
      visualIndex,
    }
  })
  const hovered =
    interactionVisualIndex !== null &&
    !windowed.some(({ visualIndex }) => visualIndex === interactionVisualIndex)
      ? [
          {
            album: albums[interactionVisualIndex],
            albumIndex: interactionVisualIndex,
            visualIndex: interactionVisualIndex,
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
      aria-haspopup={isTouch ? undefined : "dialog"}
      aria-keyshortcuts={`ArrowUp ArrowDown Home End Enter${isTouch ? "" : " Space"}`}
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
      role={isTouch ? "link" : "button"}
      tabIndex={0}
    >
      <ol className="record-stage" aria-hidden="true">
        {visible.map(({ album, albumIndex, visualIndex }) => (
          <AnimatedRecord
            album={album}
            albumIndex={albumIndex}
            detailVisible={detailVisible}
            isActive={visualIndex === activeIndex}
            isDetailSource={album?.id === openedAlbumId}
            isHovered={visualIndex === interactionVisualIndex}
            key={album?.id ?? `placeholder-${visualIndex}`}
            position={position}
            reduceMotion={reduceMotion}
            trackLayout={!detailVisible || album?.id === openedAlbumId}
            visualIndex={visualIndex}
          />
        ))}
      </ol>

      <ol className="record-hit-stage" aria-hidden="true">
        {visible.map(
          ({ album, albumIndex, visualIndex }) =>
            album && (
              <RecordHitZone
                albumIndex={albumIndex}
                key={album.id}
                position={position}
                reduceMotion={reduceMotion}
                visualIndex={visualIndex}
              />
            )
        )}
      </ol>

      {previewVisible && previewAlbum && (
        <ol className="record-preview-stage" aria-hidden="true">
          <motion.li className="record-preview-positioner" style={previewStyle}>
            <motion.aside
              className="record-preview"
              data-album-id={previewAlbum.id}
              data-returning={detailReturning || undefined}
              layoutId={`album-label-${previewAlbum.id}`}
            >
              <Text type="label" color="inherit" maxLines={2}>
                {previewAlbum.title}
              </Text>
              <Text type="supporting" color="inherit" maxLines={1}>
                {previewAlbum.artist}
              </Text>
            </motion.aside>
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

      {previewVisible && previewAlbum && (
        <VisuallyHidden as="div" aria-live="polite">
          {previewAlbum.title}, {previewAlbum.artist}
        </VisuallyHidden>
      )}
    </section>
  )
}
