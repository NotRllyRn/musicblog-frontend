import assert from "node:assert/strict"
import test from "node:test"

import { genreColorIndex, genreRadius } from "./genre-bubbles.ts"

test("genre radius strongly distinguishes usage counts", () => {
  assert.equal(genreRadius(1, 10, 20, 50), 20)
  assert.equal(genreRadius(10, 10, 20, 50), 50)
  assert.ok(genreRadius(5, 10, 20, 50) > 39)
  assert.ok(
    genreRadius(13, 110, 42, 180) > genreRadius(1, 110, 42, 180) * 2
  )
})

test("genre colors are stable and bounded", () => {
  assert.equal(genreColorIndex("jazz", 9), genreColorIndex("jazz", 9))
  assert.ok(genreColorIndex("ambient", 9) < 9)
})
