import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry
} from 'three'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry'
import { Font } from 'three/examples/jsm/loaders/FontLoader'
import ThreeDNode from '../ThreeDNode'

// What a scrambled letter flickers through
const NOISE = '#$%&@!?<>/\\|{}[]=+*01ABCDEFGHIJKLMNOPQRSTUVWXYZ'
// Scrambled letters change this often, and a glitch jolts the word as often
const FLICKER_MS = 50
// Letters type in this far apart, scrambled, then lock in left to right
const TYPE_MS = 30
const DECODE_MS = 320
const LETTER_MS = 70
// Hovering decodes it again, quicker
const REDECODE_LETTER_MS = 40
const BLINK_MS = 530

// One geometry per character, size and font, shared by every hacked text
const glyphs = new WeakMap<Font, Map<string, TextGeometry>>()
const glyph = (font: Font, size: number, char: string) => {
  let cache = glyphs.get(font)
  if (!cache) glyphs.set(font, (cache = new Map()))
  const key = `${size}:${char}`
  let geometry = cache.get(key)
  if (!geometry) {
    geometry = new TextGeometry(char, {
      font,
      size,
      depth: 0.1,
      bevelEnabled: false
    })
    cache.set(key, geometry)
  }
  return geometry
}

const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)]

// Text like a broken-into terminal. It types in as scrambled characters that
// lock into place left to right, then an underscore cursor blinks after it.
// Every few seconds it glitches: a few letters scramble and the word jolts
// with a faint double behind it. Scrambled letters run brighter than white,
// which the bloom pass haloes. Meant for a monospaced font, so letters keep
// their cells as they change. Call reveal to start it and update every frame.
export const createHackedText = (
  font: Font,
  text: string,
  params?: { size?: number }
) => {
  const size = params?.size || 10
  const cell = (font.data.glyphs[text[0]].ha * size) / font.data.resolution
  const capGlyph = glyph(font, size, 'H')
  capGlyph.computeBoundingBox()
  const cap = capGlyph.boundingBox!.max.y
  // The letters, then the cursor
  const cells = text.length + 1
  const left = (-cells * cell) / 2

  const steady = new MeshBasicMaterial()
  const hot = new MeshBasicMaterial()
  hot.color.setScalar(2.5)
  const faint = new MeshBasicMaterial()
  faint.color.setScalar(0.3)

  // An invisible box over the whole word is what's hovered and clicked, and
  // it stays put while the word inside it jolts
  const box = new Mesh(
    new BoxGeometry(cells * cell, cap * 1.8, 2),
    new MeshBasicMaterial({ visible: false })
  )
  const word = new Group()
  box.add(word)

  const letters = [...text].map((char, i) => {
    const mesh = new Mesh(glyph(font, size, char), steady)
    mesh.position.set(left + i * cell, -cap / 2, 0)
    mesh.visible = false
    word.add(mesh)
    return mesh
  })
  const doubles = letters.map((letter) => {
    const mesh = new Mesh(letter.geometry, faint)
    mesh.position.set(letter.position.x + 1.8, letter.position.y + 0.4, -0.2)
    mesh.visible = false
    word.add(mesh)
    return mesh
  })
  // An underscore: the edge filter would hollow out a block into a box that
  // looks like a missing letter
  const cursor = new Mesh(new PlaneGeometry(cell * 0.8, cap * 0.14), steady)
  cursor.position.set(left + text.length * cell + cell / 2, -cap * 0.62, 0)
  cursor.visible = false
  word.add(cursor)

  const noise = [...NOISE].filter((char) => font.data.glyphs[char])

  let shownAt = Infinity
  let settleAt = letters.map(() => Infinity)
  let nextGlitch = Infinity
  let glitchUntil = 0
  let glitched = new Set<number>()
  let flicker = -1
  let wasHovered = false

  const reveal = (now: number) => {
    shownAt = now
    settleAt = letters.map((_, i) => now + DECODE_MS + i * LETTER_MS)
    nextGlitch = now + 2500 + Math.random() * 2000
  }

  const update = (now: number, hovered: boolean) => {
    if (hovered && !wasHovered && now >= shownAt) {
      settleAt = letters.map((_, i) => now + 80 + i * REDECODE_LETTER_MS)
      // The first glitch follows soon after, not on the resting schedule
      nextGlitch = Math.min(nextGlitch, now + 600 + Math.random() * 300)
    }
    wasHovered = hovered

    // Glitches come every few seconds, and far more often while hovered
    if (now >= nextGlitch) {
      glitchUntil = now + 120 + Math.random() * 160
      const count = 1 + Math.floor(Math.random() * 3)
      glitched = new Set(
        Array.from({ length: count }, () =>
          Math.floor(Math.random() * letters.length)
        )
      )
      nextGlitch =
        now +
        (hovered ? 400 + Math.random() * 600 : 2500 + Math.random() * 3000)
    }
    const glitching = now < glitchUntil

    const tick = Math.floor(now / FLICKER_MS)
    const reroll = tick !== flicker
    flicker = tick
    if (reroll) {
      word.position.set(
        glitching ? (Math.random() - 0.5) * 3 : 0,
        glitching ? (Math.random() - 0.5) * 0.8 : 0,
        0
      )
    }

    letters.forEach((letter, i) => {
      letter.visible = now >= shownAt + i * TYPE_MS
      const scrambled = now < settleAt[i] || (glitching && glitched.has(i))
      if (!scrambled) letter.geometry = glyph(font, size, text[i])
      else if (reroll) letter.geometry = glyph(font, size, pick(noise))
      letter.material = scrambled ? hot : steady
      doubles[i].geometry = letter.geometry
      doubles[i].visible = glitching && letter.visible
    })

    // Lit while it decodes, then blinking like a prompt
    const decoded = now >= settleAt[settleAt.length - 1]
    cursor.visible =
      now >= shownAt + text.length * TYPE_MS &&
      (!decoded || Math.floor(now / BLINK_MS) % 2 === 0)
  }

  return { node: new ThreeDNode(box), reveal, update }
}
