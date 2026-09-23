export function genreRadius(
  count: number,
  maximumCount: number,
  minimumRadius: number,
  maximumRadius: number
) {
  if (maximumCount <= 1) return minimumRadius
  const usage = (count - 1) / (maximumCount - 1)
  return minimumRadius + Math.sqrt(usage) * (maximumRadius - minimumRadius)
}

export function genreColorIndex(id: string, colorCount: number) {
  let hash = 0
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) | 0
  return Math.abs(hash) % colorCount
}
