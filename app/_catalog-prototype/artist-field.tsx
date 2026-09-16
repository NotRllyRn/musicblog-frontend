"use client"

import { Button } from "@astryxdesign/core/Button"
import { Spinner } from "@astryxdesign/core/Spinner"
import { Text } from "@astryxdesign/core/Text"
import { getImageProps } from "next/image"
import { useEffect, useRef, useState } from "react"

import {
  type ArtistNode,
  artistWorldRadius,
  createArtistNodes,
  findArtistNode,
  stepArtistPhysics,
} from "./artist-physics"
import type { ArtistProfile } from "./types"

interface ArtistFieldProps {
  artists: ArtistProfile[] | null
  hasError: boolean
  isLoading: boolean
  onRetry: () => void
}

interface Portrait {
  image?: HTMLImageElement
  lastUsed: number
  status: "failed" | "loading" | "queued" | "ready"
}

interface ArtistRuntime {
  activeId: number | null
  cameraX: number
  cameraY: number
  destroyed: boolean
  dpr: number
  dragging: boolean
  frame: number | null
  framesLeft: number
  height: number
  imageClock: number
  imageQueue: ArtistNode[]
  images: Map<number, Portrait>
  inFlight: number
  nodes: ArtistNode[]
  pointerId: number | null
  pointerStartX: number
  pointerStartY: number
  previousTime: number
  radius: number
  reducedMotion: boolean
  startCameraX: number
  startCameraY: number
  width: number
  worldRadius: number
}

const DESKTOP_RADIUS = 56
const MOBILE_RADIUS = 41
const NODE_GAP = 10
const IMAGE_CONCURRENCY = 4
const IMAGE_CACHE_SIZE = 160
const FIELD_HELP_ID = "artist-field-help"

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

function initials(name: string) {
  const words = name
    .trim()
    .split(/\s+/u)
    .map((word) => word.match(/[\p{Letter}\p{Number}]/gu)?.join("") ?? "")
    .filter(Boolean)
  return (
    words.length > 1
      ? `${words[0][0]}${words.at(-1)?.[0] ?? ""}`
      : (words[0]?.slice(0, 2) ?? "?")
  ).toLocaleUpperCase()
}

function canvasPoint(
  canvas: HTMLCanvasElement,
  runtime: ArtistRuntime,
  clientX: number,
  clientY: number
) {
  const bounds = canvas.getBoundingClientRect()
  return {
    x: clientX - bounds.left - runtime.width / 2 - runtime.cameraX,
    y: clientY - bounds.top - runtime.height / 2 - runtime.cameraY,
  }
}

function clampCamera(runtime: ArtistRuntime) {
  const horizontal = Math.max(0, runtime.worldRadius - runtime.width * 0.25)
  const vertical = Math.max(0, runtime.worldRadius - runtime.height * 0.25)
  runtime.cameraX = clamp(runtime.cameraX, -horizontal, horizontal)
  runtime.cameraY = clamp(runtime.cameraY, -vertical, vertical)
}

function drawLabel(
  context: CanvasRenderingContext2D,
  node: ArtistNode,
  x: number,
  y: number,
  width: number,
  height: number,
  ink: string,
  paper: string
) {
  const fontSize = 13
  context.font = `600 ${fontSize}px system-ui, sans-serif`
  let label = node.artist.name
  while (label.length > 12 && context.measureText(label).width > 210)
    label = `${label.slice(0, -2).trim()}…`
  const labelWidth = context.measureText(label).width + 20
  const labelHeight = 28
  const labelX = clamp(x - labelWidth / 2, 8, width - labelWidth - 8)
  const below = y + node.renderRadius + 10
  const labelY =
    below + labelHeight <= height - 8
      ? below
      : y - node.renderRadius - labelHeight - 10

  context.globalAlpha = 0.94
  context.fillStyle = paper
  context.beginPath()
  context.roundRect(labelX, labelY, labelWidth, labelHeight, 14)
  context.fill()
  context.globalAlpha = 1
  context.fillStyle = ink
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.fillText(label, labelX + labelWidth / 2, labelY + labelHeight / 2)
}

function drawArtistField(
  canvas: HTMLCanvasElement,
  runtime: ArtistRuntime,
  queuePortrait: (node: ArtistNode) => void
) {
  const context = canvas.getContext("2d")
  if (!context || !runtime.width || !runtime.height) return

  context.setTransform(runtime.dpr, 0, 0, runtime.dpr, 0, 0)
  context.clearRect(0, 0, runtime.width, runtime.height)
  const style = getComputedStyle(canvas)
  const ink = style.color
  const paper = style.borderTopColor
  const active = runtime.nodes.find(
    ({ artist }) => artist.id === runtime.activeId
  )
  const nodes = active
    ? [...runtime.nodes.filter((node) => node !== active), active]
    : runtime.nodes
  const visible = new Set<number>()

  for (const node of nodes) {
    const x = runtime.width / 2 + runtime.cameraX + node.x
    const y = runtime.height / 2 + runtime.cameraY + node.y
    const radius = node.renderRadius
    if (
      x + radius < -radius ||
      x - radius > runtime.width + radius ||
      y + radius < -radius ||
      y - radius > runtime.height + radius
    )
      continue

    visible.add(node.artist.id)
    queuePortrait(node)
    context.save()
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fillStyle = paper
    context.globalAlpha = 0.88
    context.fill()
    context.clip()
    const portrait = runtime.images.get(node.artist.id)
    if (portrait?.status === "ready" && portrait.image) {
      portrait.lastUsed = ++runtime.imageClock
      context.globalAlpha = 1
      context.drawImage(
        portrait.image,
        x - radius,
        y - radius,
        radius * 2,
        radius * 2
      )
    } else {
      context.globalAlpha = 1
      context.fillStyle = ink
      context.font = `700 ${Math.round(radius * 0.52)}px system-ui, sans-serif`
      context.textAlign = "center"
      context.textBaseline = "middle"
      context.fillText(initials(node.artist.name), x, y + 1)
    }
    context.restore()

    context.save()
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.strokeStyle = ink
    context.globalAlpha = node === active ? 0.8 : 0.24
    context.lineWidth = node === active ? 3 : 1.5
    context.stroke()
    context.restore()
  }

  if (active) {
    const x = runtime.width / 2 + runtime.cameraX + active.x
    const y = runtime.height / 2 + runtime.cameraY + active.y
    drawLabel(context, active, x, y, runtime.width, runtime.height, ink, paper)
  }

  if (runtime.images.size > IMAGE_CACHE_SIZE)
    for (const [id] of [...runtime.images.entries()]
      .filter(
        ([id, portrait]) =>
          !visible.has(id) &&
          portrait.status !== "loading" &&
          portrait.status !== "queued"
      )
      .sort((left, right) => left[1].lastUsed - right[1].lastUsed)
      .slice(0, runtime.images.size - IMAGE_CACHE_SIZE))
      runtime.images.delete(id)
}

export function ArtistField({
  artists,
  hasError,
  isLoading,
  onRetry,
}: ArtistFieldProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const runtime = useRef<ArtistRuntime | null>(null)
  const [activeArtist, setActiveArtist] = useState<ArtistProfile | null>(null)

  useEffect(() => {
    if (!artists || !canvas.current) return
    const element = canvas.current
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    )
    const state: ArtistRuntime = {
      activeId: null,
      cameraX: 0,
      cameraY: 0,
      destroyed: false,
      dpr: 1,
      dragging: false,
      frame: null,
      framesLeft: 0,
      height: 0,
      imageClock: 0,
      imageQueue: [],
      images: new Map(),
      inFlight: 0,
      nodes: [],
      pointerId: null,
      pointerStartX: 0,
      pointerStartY: 0,
      previousTime: 0,
      radius: 0,
      reducedMotion: motionPreference.matches,
      startCameraX: 0,
      startCameraY: 0,
      width: 0,
      worldRadius: 0,
    }
    runtime.current = state

    const requestFrame = (frames = 1) => {
      state.framesLeft = Math.max(state.framesLeft, frames)
      if (state.frame === null)
        state.frame = requestAnimationFrame((time) => animate(time))
    }

    const pumpImages = () => {
      while (state.inFlight < IMAGE_CONCURRENCY && state.imageQueue.length) {
        const node = state.imageQueue.shift()
        if (!node?.artist.imageUrl) continue
        const portrait = state.images.get(node.artist.id)
        if (!portrait || portrait.status !== "queued") continue
        portrait.status = "loading"
        state.inFlight += 1
        const image = new window.Image()
        const finish = async (status: "failed" | "ready") => {
          if (status === "ready") await image.decode().catch(() => undefined)
          portrait.status = status
          portrait.image = status === "ready" ? image : undefined
          state.inFlight -= 1
          requestFrame()
          pumpImages()
        }
        image.onload = () => void finish("ready")
        image.onerror = () => void finish("failed")
        try {
          image.src = getImageProps({
            alt: "",
            height: 256,
            src: node.artist.imageUrl,
            width: 256,
          }).props.src
        } catch {
          void finish("failed")
        }
      }
    }

    const queuePortrait = (node: ArtistNode) => {
      if (!node.artist.imageUrl || state.images.has(node.artist.id)) return
      state.images.set(node.artist.id, {
        lastUsed: ++state.imageClock,
        status: "queued",
      })
      state.imageQueue.push(node)
      pumpImages()
    }

    const animate = (time: number) => {
      state.frame = null
      if (state.destroyed) return
      const elapsed = state.previousTime
        ? (time - state.previousTime) / 1_000
        : 1 / 60
      state.previousTime = time
      if (!state.reducedMotion && state.framesLeft > 0)
        stepArtistPhysics(state.nodes, elapsed, {
          activeId: state.activeId,
          gap: NODE_GAP,
        })
      state.framesLeft = Math.max(0, state.framesLeft - 1)
      drawArtistField(element, state, queuePortrait)
      if (state.framesLeft > 0) requestFrame()
      else state.previousTime = 0
    }

    const setActive = (node: ArtistNode | null) => {
      const id = node?.artist.id ?? null
      if (state.activeId === id) return
      state.activeId = id
      setActiveArtist(node?.artist ?? null)
      if (state.reducedMotion)
        for (const candidate of state.nodes)
          candidate.renderRadius =
            candidate.radius * (candidate.artist.id === id ? 1.35 : 1)
      requestFrame(state.reducedMotion ? 1 : 28)
    }

    const hitTest = (clientX: number, clientY: number) => {
      const point = canvasPoint(element, state, clientX, clientY)
      return findArtistNode(state.nodes, point.x, point.y, state.activeId)
    }

    const onPointerDown = (event: PointerEvent) => {
      state.pointerId = event.pointerId
      state.pointerStartX = event.clientX
      state.pointerStartY = event.clientY
      state.startCameraX = state.cameraX
      state.startCameraY = state.cameraY
      state.dragging = false
      element.setPointerCapture(event.pointerId)
    }
    const onPointerMove = (event: PointerEvent) => {
      if (state.pointerId === event.pointerId) {
        const dx = event.clientX - state.pointerStartX
        const dy = event.clientY - state.pointerStartY
        if (state.dragging || Math.hypot(dx, dy) > 4) {
          state.dragging = true
          state.cameraX = state.startCameraX + dx
          state.cameraY = state.startCameraY + dy
          clampCamera(state)
          element.dataset.dragging = "true"
          setActive(null)
          requestFrame()
          return
        }
      }
      const node = hitTest(event.clientX, event.clientY)
      element.toggleAttribute("data-hovered", Boolean(node))
      setActive(node)
    }
    const onPointerUp = (event: PointerEvent) => {
      if (state.pointerId !== event.pointerId) return
      if (!state.dragging) setActive(hitTest(event.clientX, event.clientY))
      state.pointerId = null
      state.dragging = false
      delete element.dataset.dragging
      element.releasePointerCapture(event.pointerId)
    }
    const onPointerLeave = () => {
      if (state.pointerId === null) {
        element.removeAttribute("data-hovered")
        setActive(null)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !["ArrowLeft", "ArrowRight", "Home", "End", "Escape"].includes(
          event.key
        )
      )
        return
      event.preventDefault()
      if (event.key === "Escape") return setActive(null)
      const current = state.nodes.findIndex(
        ({ artist }) => artist.id === state.activeId
      )
      const index =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? state.nodes.length - 1
            : event.key === "ArrowLeft"
              ? (current - 1 + state.nodes.length) % state.nodes.length
              : (current + 1) % state.nodes.length
      const node = state.nodes[index]
      if (!node) return
      state.cameraX = -node.x
      state.cameraY = -node.y
      clampCamera(state)
      setActive(node)
    }
    const onMotionChange = () => {
      state.reducedMotion = motionPreference.matches
      requestFrame(state.reducedMotion ? 1 : 120)
    }
    const resize = new ResizeObserver(([entry]) => {
      const { height, width } = entry.contentRect
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const radius = width <= 768 ? MOBILE_RADIUS : DESKTOP_RADIUS
      state.width = width
      state.height = height
      state.dpr = dpr
      element.width = Math.round(width * dpr)
      element.height = Math.round(height * dpr)
      if (radius !== state.radius) {
        state.radius = radius
        state.nodes = createArtistNodes(artists, radius, NODE_GAP)
        state.worldRadius = artistWorldRadius(state.nodes, radius * 2)
        state.cameraX = 0
        state.cameraY = 0
        state.images.clear()
        state.imageQueue = []
      }
      requestFrame(state.reducedMotion ? 1 : 240)
    })
    const theme = new MutationObserver(() => requestFrame())

    element.addEventListener("keydown", onKeyDown)
    element.addEventListener("pointerdown", onPointerDown)
    element.addEventListener("pointerleave", onPointerLeave)
    element.addEventListener("pointermove", onPointerMove)
    element.addEventListener("pointerup", onPointerUp)
    motionPreference.addEventListener("change", onMotionChange)
    resize.observe(element)
    theme.observe(document.documentElement, {
      attributeFilter: ["class", "data-theme", "style"],
      attributes: true,
    })

    return () => {
      state.destroyed = true
      if (state.frame !== null) cancelAnimationFrame(state.frame)
      element.removeEventListener("keydown", onKeyDown)
      element.removeEventListener("pointerdown", onPointerDown)
      element.removeEventListener("pointerleave", onPointerLeave)
      element.removeEventListener("pointermove", onPointerMove)
      element.removeEventListener("pointerup", onPointerUp)
      motionPreference.removeEventListener("change", onMotionChange)
      resize.disconnect()
      theme.disconnect()
      runtime.current = null
    }
  }, [artists])

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
      aria-label={`Browse ${artists.length} artists`}
      className="artist-viewport"
    >
      <canvas
        aria-describedby={FIELD_HELP_ID}
        aria-label={
          activeArtist
            ? `Selected artist: ${activeArtist.name}`
            : `${artists.length} artist portraits`
        }
        className="artist-canvas"
        ref={canvas}
        tabIndex={0}
      >
        Browse {artists.length} artists.
      </canvas>
      <Text
        as="p"
        className="artist-field-help"
        color="inherit"
        id={FIELD_HELP_ID}
      >
        Drag to explore. Hover, tap, or use the arrow keys to inspect an artist.
      </Text>
      <Text aria-live="polite" as="span" className="artist-announcement">
        {activeArtist?.name ?? ""}
      </Text>
    </section>
  )
}
