export const mechanicSettings = {
  step: 72,
  window: 19,
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const mix = (from: number, to: number, amount: number) =>
  from + (to - from) * amount

const responsivePx = (value: number) => {
  if (value === 0) return "0px"
  const viewport = `${(value / 19.2).toFixed(3)}vw`
  return value > 0
    ? `clamp(${value.toFixed(2)}px, ${viewport}, ${(value * 2).toFixed(2)}px)`
    : `clamp(${(value * 2).toFixed(2)}px, ${viewport}, ${value.toFixed(2)}px)`
}

const responsiveTail = (amount: number) => {
  if (amount === 0) return "0px"

  const magnitude = Math.abs(amount)
  const direction = Math.sign(amount)
  const minimum =
    direction > 0
      ? responsivePx(magnitude * 16)
      : `max(${responsivePx(-magnitude * 100)}, ${(-magnitude * 4.2).toFixed(2)}dvh)`
  const maximum =
    direction > 0
      ? `min(${responsivePx(magnitude * 100)}, ${(magnitude * 4.2).toFixed(2)}dvh)`
      : responsivePx(-magnitude * 16)
  const mobileCompression = `clamp(0px, calc(${(magnitude * 2.352).toFixed(2)}rem - ${(magnitude * 4.9).toFixed(2)}vw), ${responsivePx(magnitude * 18.5)})`
  const preferred = `calc(${(amount * 8.33).toFixed(2)}dvh - ${(amount * 33.33).toFixed(2)}% + ${responsivePx(amount * 19)} ${direction > 0 ? "-" : "+"} ${mobileCompression})`

  return `clamp(${minimum}, ${preferred}, ${maximum})`
}

export function getRecordTransform(
  rawDistance: number,
  visualIndex: number,
  reduceMotion: boolean,
  pull = 0
) {
  const distance = reduceMotion ? Math.round(rawDistance) : rawDistance
  const magnitude = Math.abs(distance)
  const direction = Math.sign(distance) || 1
  const focus = clamp(magnitude, 0, 1)
  const tail = Math.max(0, magnitude - 1)
  const tilt = [-2.4, 1.4, -0.8, 2.1][visualIndex % 4]
  const stackedZ = direction < 0 ? -82 - tail * 9 : -138 + tail * 10
  const pullAmount = pull * focus
  const pullLift = direction < 0 ? 0 : 68
  const baseAmount = direction < 0 ? 1 - pullAmount : 1
  const x = 0
  const firstPercent = direction > 0 ? 46 * focus : 0
  const firstY = direction < 0 ? -124 * focus * baseAmount : 24 * focus
  const tailY = responsiveTail(direction * tail * baseAmount)
  const pulledY =
    direction < 0
      ? `clamp(${(-12.5 * pullAmount).toFixed(2)}dvh, calc(${responsivePx(125 * pullAmount)} - ${(25 * pullAmount).toFixed(2)}dvh), ${responsivePx(-24 * pullAmount)})`
      : "0px"
  const focusLift = `clamp(${responsivePx(52)}, calc(34dvh - ${responsivePx(190)}), ${responsivePx(104)})`
  const pullCompensation =
    direction < 0
      ? `clamp(${responsivePx(52 * pullAmount)}, calc(${(34 * pullAmount).toFixed(2)}dvh - ${responsivePx(190 * pullAmount)}), ${responsivePx(104 * pullAmount)})`
      : "0px"
  const z = mix(mix(-24, stackedZ, focus), mix(132, 180, focus), pull)
  const rotateX = mix(mix(-20, -40, focus), mix(-18, 0, focus), pull)
  const rotateZ = mix(mix(-0.6, tilt, focus), 0, pull)
  const scale = mix(0.92, mix(1.092, 1.05, focus), pull)
  const anchor = mix(-72, -50, focus)
  return [
    `translate3d(${responsivePx(x)}, calc(${anchor.toFixed(2)}% + ${firstPercent.toFixed(2)}% + ${responsivePx(firstY)} + ${tailY} + ${pulledY} + ${pullCompensation} - ${focusLift} - ${(pullAmount * pullLift).toFixed(2)}%), ${responsivePx(z)})`,
    `rotateX(${rotateX.toFixed(2)}deg)`,
    "rotateY(0deg)",
    `rotateZ(${rotateZ.toFixed(2)}deg)`,
    `scaleX(${scale.toFixed(3)})`,
    `scaleY(${scale.toFixed(3)})`,
  ].join(" ")
}
