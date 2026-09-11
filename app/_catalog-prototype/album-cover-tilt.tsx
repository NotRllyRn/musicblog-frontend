"use client"

import { motion, useIsPresent, useSpring } from "motion/react"
import type { PointerEvent, ReactNode } from "react"
import { useEffect, useRef } from "react"

interface AlbumCoverTiltProps {
  children: ReactNode
  reduceMotion: boolean
}

const MAX_TILT = 12
const spring = { stiffness: 220, damping: 24, mass: 0.7 }

export function AlbumCoverTilt({
  children,
  reduceMotion,
}: AlbumCoverTiltProps) {
  const dragging = useRef(false)
  const isPresent = useIsPresent()
  const rotateX = useSpring(0, spring)
  const rotateY = useSpring(0, spring)

  const reset = () => {
    dragging.current = false
    rotateX.set(0)
    rotateY.set(0)
  }

  useEffect(() => {
    if (isPresent) return
    dragging.current = false
    rotateX.set(0)
    rotateY.set(0)
  }, [isPresent, rotateX, rotateY])

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!dragging.current) return
    const rect = event.currentTarget.parentElement?.getBoundingClientRect()
    if (!rect) return
    const x = Math.max(
      -1,
      Math.min(1, (2 * (event.clientX - rect.left)) / rect.width - 1)
    )
    const y = Math.max(
      -1,
      Math.min(1, (2 * (event.clientY - rect.top)) / rect.height - 1)
    )
    rotateX.set(-y * MAX_TILT)
    rotateY.set(x * MAX_TILT)
  }

  return (
    <motion.picture
      className="album-cover-tilt"
      onLostPointerCapture={reset}
      onPointerCancel={reset}
      onPointerDown={(event) => {
        if (
          !isPresent ||
          reduceMotion ||
          event.button !== 0 ||
          event.pointerType === "touch"
        )
          return
        dragging.current = true
        event.currentTarget.setPointerCapture(event.pointerId)
        onPointerMove(event)
      }}
      onPointerMove={onPointerMove}
      onPointerUp={reset}
      style={{ rotateX, rotateY }}
    >
      {children}
    </motion.picture>
  )
}
