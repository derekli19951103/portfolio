import { Easing } from '@tweenjs/tween.js'
import { PLANE_HEIGHT } from 'constant'
import { Box3, Group, MathUtils, Mesh, ShaderMaterial, Vector3 } from 'three'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry'
import { Font } from 'three/examples/jsm/loaders/FontLoader'
import { loadFont } from '../../engine/loaders/font-loader'
import { NOISE } from '../../engine/objects/HackedText'
import ThreeDNode from '../../engine/ThreeDNode'
import Viewport from '../../engine/Viewport'

const SIZE = 20
const LINES = [
  { text: 'Fullstack', y: PLANE_HEIGHT / 2 + 20 },
  { text: 'Developer', y: PLANE_HEIGHT / 4 + 20 }
]

// Each letter glides in from wide apart, a little low and in front of the
// board, fading up as it settles. They go left to right, the second line
// just behind the first, and ease out slowly so nothing lands with a jolt.
const LETTER_MS = 2000
const STAGGER_MS = 60
const LINE_DELAY_MS = 350
const SPREAD = 1.7
const FROM_Y = -10
const FROM_Z = 70
// As the last letters settle, a slanted band of light glints across both
// lines once, brighter than white so the bloom haloes it
const GLINT_MS = 1400
const GLINT_BAND = 12
const GLINT_SLANT = 0.35
const GLINT_PEAK = 2.6
// Then, after a pause and every few seconds after, it twitches like the
// links do when hacked: a few letters scramble through noise, running hot,
// and the lines jolt with a faint double behind them. Now and then a second
// twitch follows straight after.
const TWITCH_WAIT_MS = 1500
const TWITCH_EVERY_MS = 3000
const TWITCH_MS = 120
const TWITCH_AGAIN = 0.35
const FLICKER_MS = 50
const JOLT = { x: 4, y: 1 }
const HOT = 2.5
const DOUBLE = { light: 0.3, offset: new Vector3(3, 0.7, -0.3) }

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')

const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)]

// Each character's geometry, centred on itself, and where that centre sat
// from the pen. Shared by both lines, the noise and every visit to the tab.
const glyphs = new WeakMap<
  Font,
  Map<string, { geometry: TextGeometry; centre: Vector3 }>
>()
const glyph = (font: Font, char: string) => {
  let cache = glyphs.get(font)
  if (!cache) glyphs.set(font, (cache = new Map()))
  let entry = cache.get(char)
  if (!entry) {
    const geometry = new TextGeometry(char, {
      font,
      size: SIZE,
      depth: 0.1,
      bevelEnabled: false
    })
    geometry.computeBoundingBox()
    const centre = geometry.boundingBox!.getCenter(new Vector3())
    geometry.translate(-centre.x, -centre.y, -centre.z)
    entry = { geometry, centre }
    cache.set(char, entry)
  }
  return entry
}

// Lights itself: its own fade, and the glint where the band crosses it. The
// band leans, so it's placed by its x at the lines' middle height.
const letterMaterial = (middle: number) =>
  new ShaderMaterial({
    uniforms: {
      fade: { value: 0 },
      glint: { value: 0 },
      middle: { value: middle },
      band: { value: GLINT_BAND },
      slant: { value: GLINT_SLANT },
      peak: { value: GLINT_PEAK }
    },
    vertexShader: /* glsl */ `
      varying vec2 vWorld;

      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xy;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float fade;
      uniform float glint;
      uniform float middle;
      uniform float band;
      uniform float slant;
      uniform float peak;
      varying vec2 vWorld;

      void main() {
        float d = (vWorld.x - glint + (vWorld.y - middle) * slant) / band;
        float light = fade * (1.0 + (peak - 1.0) * exp(-d * d));
        gl_FragColor = vec4(vec3(light), 1.0);
      }
    `
  })

// A line of separate letters, spaced as the font sets them and centred like
// the whole word would be. The letters sit in a group that jolts when the
// text twitches, each with its faint double hidden behind it.
const letterLine = (
  font: Font,
  text: string,
  middle: number,
  doubleMaterial: ShaderMaterial
) => {
  const scale = SIZE / font.data.resolution
  const bounds = new Box3()
  const word = new Group()
  let pen = 0
  const letters = [...text].map((char) => {
    const { geometry, centre } = glyph(font, char)
    const at = centre.clone().add(new Vector3(pen, 0, 0))
    bounds.union(geometry.boundingBox!.clone().translate(at))
    pen += (font.data.glyphs[char]?.ha ?? 0) * scale
    const material = letterMaterial(middle)
    const mesh = new Mesh(geometry, material)
    const double = new Mesh(geometry, doubleMaterial)
    double.visible = false
    word.add(double, mesh)
    return { geometry, mesh, material, double, at }
  })
  const lineCentre = bounds.getCenter(new Vector3())
  letters.forEach(({ double, at }) => {
    at.sub(lineCentre)
    double.position.copy(at).add(DOUBLE.offset)
  })
  return { word, letters, halfWidth: (bounds.max.x - bounds.min.x) / 2 }
}

export const addProfileText = async (viewport: Viewport) => {
  const version = viewport.contentVersion
  const font = await loadFont('/fonts/helvetiker_regular.typeface.json')
  if (viewport.contentVersion !== version) return

  const middle = (LINES[0].y + LINES[1].y) / 2
  // Faint and never glinted: the band stays far off to its side
  const doubleMaterial = letterMaterial(middle)
  doubleMaterial.uniforms.fade.value = DOUBLE.light
  doubleMaterial.uniforms.glint.value = -1e5
  const lines = LINES.map(({ text, y }) => {
    const line = letterLine(font, text, middle, doubleMaterial)
    const node = new ThreeDNode(new Mesh())
    node.object.position.set(0, y, 0)
    node.object.add(line.word)
    return { ...line, node }
  })

  // The glint starts as the last letter is most of the way in, and crosses
  // from clear of the left end to clear of the right. It ends the entrance.
  const longest = Math.max(...lines.map((line) => line.letters.length))
  const glintAt =
    (lines.length - 1) * LINE_DELAY_MS +
    (longest - 1) * STAGGER_MS +
    LETTER_MS * 0.7
  const entered = glintAt + GLINT_MS
  const reach =
    Math.max(...lines.map((line) => line.halfWidth)) +
    3 * GLINT_BAND +
    (Math.abs(LINES[0].y - LINES[1].y) / 2 + SIZE) * GLINT_SLANT

  const enter = (elapsed: number) => {
    const g = MathUtils.clamp((elapsed - glintAt) / GLINT_MS, 0, 1)
    const glint = -reach + 2 * reach * g * g * (3 - 2 * g)
    lines.forEach((line, l) =>
      line.letters.forEach(({ mesh, material, at }, i) => {
        const begin = l * LINE_DELAY_MS + i * STAGGER_MS
        const t = MathUtils.clamp((elapsed - begin) / LETTER_MS, 0, 1)
        const eased = Easing.Cubic.Out(t)
        mesh.position.set(
          at.x * MathUtils.lerp(SPREAD, 1, eased),
          at.y + FROM_Y * (1 - eased),
          FROM_Z * (1 - eased)
        )
        // The edge filter shows anything over about 0.3 in full, so the
        // letter comes up to that gently while it glides, then on to white
        material.uniforms.fade.value =
          0.3 * MathUtils.smoothstep(t, 0, 0.4) +
          0.7 * MathUtils.smoothstep(t, 0.4, 1)
        material.uniforms.glint.value = glint
      })
    )
  }

  const noise = [...NOISE].filter((char) => font.data.glyphs[char])
  const everyLetter = lines.flatMap((line) => line.letters)
  let nextTwitch = entered + TWITCH_WAIT_MS + Math.random() * 1000
  let twitchUntil = 0
  let followUp = false
  let scrambled = new Set<(typeof everyLetter)[number]>()
  let flicker = -1
  let wasTwitching = false

  const twitch = (elapsed: number) => {
    if (elapsed >= nextTwitch) {
      twitchUntil = elapsed + TWITCH_MS + Math.random() * 180
      scrambled = new Set(
        Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () =>
          pick(everyLetter)
        )
      )
      followUp = !followUp && Math.random() < TWITCH_AGAIN
      nextTwitch = followUp
        ? twitchUntil + 60 + Math.random() * 120
        : elapsed + TWITCH_EVERY_MS + Math.random() * 2500
    }
    const twitching = elapsed < twitchUntil

    // Scrambled letters and the jolt change together, every flicker, and
    // the moment a twitch starts or ends
    const tick = Math.floor(elapsed / FLICKER_MS)
    const reroll = tick !== flicker || twitching !== wasTwitching
    flicker = tick
    wasTwitching = twitching
    lines.forEach(({ word, letters }) => {
      if (reroll) {
        word.position.set(
          twitching ? (Math.random() - 0.5) * JOLT.x : 0,
          twitching ? (Math.random() - 0.5) * JOLT.y : 0,
          0
        )
      }
      letters.forEach((letter) => {
        const hot = twitching && scrambled.has(letter)
        if (!hot) letter.mesh.geometry = letter.geometry
        else if (reroll)
          letter.mesh.geometry = glyph(font, pick(noise)).geometry
        letter.material.uniforms.fade.value = hot ? HOT : 1
        letter.double.geometry = letter.mesh.geometry
        letter.double.visible = twitching
      })
    })
  }

  // Reduced motion skips straight to the text at rest, and it never twitches
  const start = performance.now()
  let settled = false
  const frame = () => {
    const elapsed = reducedMotion.matches ? Infinity : performance.now() - start
    if (!settled) {
      enter(elapsed)
      settled = elapsed >= entered
    } else if (!reducedMotion.matches) {
      twitch(elapsed)
    }
  }
  frame()
  viewport.addContentFrame(frame)

  viewport.addToContentGroup(...lines.map((line) => line.node))
}
