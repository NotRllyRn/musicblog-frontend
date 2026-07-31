interface RecordVisual {
  opacity: number
  transform: string
}

export const mechanicSettings = {
  snap: "mandatory" as const,
  step: 72,
  window: 19,
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const mix = (from: number, to: number, amount: number) =>
  from + (to - from) * amount

const responsiveTail = (amount: number) => {
  if (amount === 0) return "0px"
  const minimum = amount > 0 ? amount * 38 : amount * 100
  const maximum = amount > 0 ? amount * 100 : amount * 38
  return `clamp(${minimum.toFixed(2)}px, ${(amount * 4.2).toFixed(2)}dvh, ${maximum.toFixed(2)}px)`
}

export function getRecordVisual(
  rawDistance: number,
  index: number,
  reduceMotion: boolean,
  pull = 0
): RecordVisual {
  const distance = reduceMotion ? Math.round(rawDistance) : rawDistance
  const magnitude = Math.abs(distance)
  const direction = Math.sign(distance) || 1
  const focus = clamp(magnitude, 0, 1)
  const tail = Math.max(0, magnitude - 1)
  const tilt = [-2.4, 1.4, -0.8, 2.1][index % 4]
  const stackedZ = direction < 0 ? -82 - tail * 9 : -138 + tail * 10
  const pullAmount = pull * focus
  const pullLift = direction < 0 ? 0 : 68
  const baseAmount = direction < 0 ? 1 - pullAmount : 1
  const x = 0
  const firstY = direction * mix(0, 124, focus) * baseAmount
  const tailY = responsiveTail(direction * tail * baseAmount)
  const pulledY =
    direction < 0
      ? `clamp(${(-12.5 * pullAmount).toFixed(2)}dvh, calc(${(125 * pullAmount).toFixed(2)}px - ${(25 * pullAmount).toFixed(2)}dvh), ${(-24 * pullAmount).toFixed(2)}px)`
      : "0px"
  const z = mix(mix(-24, stackedZ, focus), mix(132, 180, focus), pull)
  const rotateX = mix(mix(-20, -40, focus), mix(-18, 0, focus), pull)
  const rotateZ = mix(mix(-0.6, tilt, focus), 0, pull)
  const scale = mix(0.92, mix(1.092, 1.05, focus), pull)
  const anchor = mix(-72, -50, focus)
  const transform = [
    `translate3d(${x.toFixed(2)}px, calc(${anchor.toFixed(2)}% + ${firstY.toFixed(2)}px + ${tailY} + ${pulledY} - ${(pullAmount * pullLift).toFixed(2)}%), ${z.toFixed(2)}px)`,
    `rotateX(${rotateX.toFixed(2)}deg)`,
    "rotateY(0deg)",
    `rotateZ(${rotateZ.toFixed(2)}deg)`,
    `scaleX(${scale.toFixed(3)})`,
    `scaleY(${scale.toFixed(3)})`,
  ].join(" ")

  return { opacity: 1, transform }
}
