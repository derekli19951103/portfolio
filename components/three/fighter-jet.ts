import { Easing, Tween } from '@tweenjs/tween.js'
import { PLANE_HEIGHT, PLANE_WIDTH } from 'constant'
import { loadFont } from 'engine/loaders/font-loader'
import { loadObj } from 'engine/loaders/OBJLoader'
import { createBreakingText } from 'engine/objects/BreakingText'
import { createStandardText } from 'engine/objects/StandardText'
import { TransparentBox } from 'engine/objects/TransparentBox'
import {
  BufferGeometry,
  CircleGeometry,
  ConeGeometry,
  ExtrudeGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  ShaderMaterial,
  Shape,
  Vector3
} from 'three'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry'
import { Font } from 'three/examples/jsm/loaders/FontLoader'
import Viewport from '../../engine/Viewport'
import { tools } from './tools-section'

const FONT = '/fonts/helvetiker_regular.typeface.json'

// Sizes are board units on a full-width screen. A narrower one scales the
// game down with it, though never below MIN_SCALE so it stays playable on a
// phone held upright, and words come less often there.
const FULL_WIDTH = 360
const MIN_SCALE = 0.6
// Share of the visible width the game plays in
const FIELD_FILL = 0.92

// The score and hearts sit under the tabs. Words fly in out of the distance
// just below them, fall, and sink into the water.
const HUD_Y = PLANE_HEIGHT - 6
const SPAWN_Y = PLANE_HEIGHT - 24
const SINK_Y = -26
const ARRIVE_Z = -260
const ARRIVE_S = 0.6

const WORDS = ['UofT', 'Yufeng', 'Fullstack', ...tools.map((t) => t.title)]
const WORD_SIZE = 9.5
const WORD_FALL_S = 8
// A word every 2s at first, speeding up to one every 0.3s a minute in
const WORD_EVERY_S = { from: 2, to: 0.3, over: 60 }

// The jet model's nose, tail and wingtip, in its own units (from jet.obj)
const JET_NOSE = 10.17
const JET_TAIL = 8.13
const JET_WINGTIP = 7.75
const JET_SCALE = 1.6
// How quickly the jet closes on where it's steered, per second
const JET_FOLLOW = 16
const JET_MIN_Y = 16
const JET_MAX_Y = SPAWN_Y - 20
// The jet rises out of the water to here as the game starts
const JET_START_Y = 34
const JET_RISE_S = 0.9

const BULLET_EVERY_S = 0.4
const BULLET_SPEED = 520
const MAX_SPREAD_DEG = 120

const LIVES = 3
const HIT_IMMUNE_S = 1.2
const SHIELD_S = 2

type Kind = 'gun' | 'shield' | 'life'
// How often each pickup drops, and how long it takes to fall, in seconds
const PICKUP_EVERY_S: Record<Kind, number> = { gun: 8, shield: 12, life: 15 }
const PICKUP_FALL_S = 9

// The score the last game ended on, for the game over screen
let lastScore = 0

const heartShape = () => {
  const shape = new Shape()
  shape.moveTo(0, 4)
  shape.bezierCurveTo(0, 6, -3, 8, -5, 8)
  shape.bezierCurveTo(-8, 8, -8, 5, -8, 4)
  shape.bezierCurveTo(-8, 1, -5, -2, 0, -5)
  shape.bezierCurveTo(5, -2, 8, 1, 8, 4)
  shape.bezierCurveTo(8, 5, 8, 8, 5, 8)
  shape.bezierCurveTo(3, 8, 0, 6, 0, 4)
  return shape
}

const starShape = () => {
  const shape = new Shape()
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? 6 : 3
    const angle = (i * Math.PI) / 5 - Math.PI / 2
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  return shape
}

const shieldShape = () => {
  const shape = new Shape()
  shape.moveTo(0, 6)
  shape.lineTo(-5, 3)
  shape.lineTo(-5, -2)
  shape.quadraticCurveTo(-5, -6, 0, -8)
  shape.quadraticCurveTo(5, -6, 5, -2)
  shape.lineTo(5, 3)
  shape.lineTo(0, 6)
  return shape
}

const extrude = (shape: Shape, depth: number) =>
  new ExtrudeGeometry(shape, { depth, bevelEnabled: false }).center()

// Built once and shared by every game: drawn often, never changed
let shapes:
  | {
      heart: ExtrudeGeometry
      star: ExtrudeGeometry
      shield: ExtrudeGeometry
      disc: CircleGeometry
      ring: RingGeometry
      hex: RingGeometry
      shard: PlaneGeometry
      tracer: PlaneGeometry
      flame: ConeGeometry
    }
  | undefined
const geometries = () => {
  if (!shapes) {
    shapes = {
      heart: extrude(heartShape(), 1),
      star: extrude(starShape(), 2),
      shield: extrude(shieldShape(), 1.5),
      disc: new CircleGeometry(1, 24),
      ring: new RingGeometry(0.86, 1, 48),
      hex: new RingGeometry(0.9, 1, 6),
      shard: new PlaneGeometry(1, 1),
      tracer: new PlaneGeometry(1, 1),
      flame: new ConeGeometry(1, 1, 10)
    }
  }
  return shapes
}

let shaders: Promise<[string, string]> | undefined
const loadShaders = () => {
  if (!shaders) {
    shaders = Promise.all([
      fetch('/shaders/frag.glsl').then((r) => r.text()),
      fetch('/shaders/vert.glsl').then((r) => r.text())
    ])
  }
  return shaders
}

let jetModel: Promise<Group> | undefined
const loadJet = () => {
  if (!jetModel) jetModel = loadObj('/models/jet.obj')
  return jetModel
}

// Each word's shattering geometry is built once and shared by every copy of
// it that falls; each copy gets its own material to break up and flash
const wordShapes = new Map<string, Mesh>()
const wordMesh = (font: Font, frag: string, vert: string, text: string) => {
  let shape = wordShapes.get(text)
  if (!shape) {
    shape = createBreakingText(font, frag, vert, text, {
      size: WORD_SIZE,
      bevelEnabled: false
    }).object
    shape.geometry.computeBoundingBox()
    wordShapes.set(text, shape)
  }
  return new Mesh(shape.geometry, (shape.material as ShaderMaterial).clone())
}

// Brighter than white blooms; transparent ones can fade out
const glow = (brightness: number, transparent = false) => {
  const material = new MeshBasicMaterial({
    transparent,
    depthWrite: !transparent
  })
  material.color.setScalar(brightness)
  return material
}

const textGeometry = (font: Font, text: string, size: number) =>
  new TextGeometry(text, {
    font,
    size,
    depth: 0.1,
    bevelEnabled: false
  }).center()

const widthOf = (geometry: BufferGeometry) => {
  if (!geometry.boundingBox) geometry.computeBoundingBox()
  return geometry.boundingBox!.max.x - geometry.boundingBox!.min.x
}

// The width the game plays in, and how far its sizes scale down to suit it
const measureField = (viewport: Viewport) => {
  const visible = viewport.halfWidthAt(viewport.facingCameraPos.z)
  const half = Math.min(visible, PLANE_WIDTH / 2) * FIELD_FILL
  return {
    half,
    scale: MathUtils.clamp((2 * half) / FULL_WIDTH, MIN_SCALE, 1)
  }
}

// Seconds since the last frame, capped so a hidden tab pauses the game
// rather than skipping ahead
const createClock = () => {
  let last = performance.now()
  return () => {
    const now = performance.now()
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    return dt
  }
}

// Shakes everything on the board (not the sky and sea) for a moment
const createShaker = (viewport: Viewport) => {
  let left = 0
  let length = 1
  let strength = 0
  return {
    shake(by: number, seconds: number) {
      if (left > 0 && strength > by) return
      strength = by
      left = length = seconds
    },
    update(dt: number) {
      if (left <= 0) return
      left = Math.max(0, left - dt)
      const k = (left / length) * strength
      viewport.displayContent.position.set(
        MathUtils.randFloatSpread(2 * k),
        MathUtils.randFloatSpread(1.2 * k),
        0
      )
    }
  }
}

// A burst: a white-hot flash, a shockwave ring and shards flung outward, all
// fading, sized to what blew up. Small ones, for hits, skip the ring.
const burst = (
  viewport: Viewport,
  x: number,
  y: number,
  size: number,
  ring = true
) => {
  const { disc, ring: ringGeometry, shard } = geometries()
  const group = new Group()
  group.position.set(x, y, 3)
  const core = new Mesh(disc, glow(3, true))
  const wave = new Mesh(ringGeometry, glow(1.8, true))
  wave.visible = ring
  const shardMaterial = glow(2.2, true)
  const count = ring ? 9 : 5
  const shards = Array.from({ length: count }, (_, i) => {
    const mesh = new Mesh(shard, shardMaterial)
    mesh.userData = {
      angle: (i / count) * Math.PI * 2 + Math.random() * 0.6,
      reach: size * (0.9 + Math.random() * 0.9),
      length: size * (0.22 + Math.random() * 0.18),
      spin: MathUtils.randFloatSpread(4)
    }
    return mesh
  })
  group.add(core, wave, ...shards)
  viewport.displayContent.add(group)

  new Tween({ t: 0 }, viewport.tweenGroup)
    .to({ t: 1 }, ring ? 560 : 320)
    .onUpdate(({ t }) => {
      const out = Easing.Cubic.Out(t)
      core.scale.setScalar(size * 0.55 * (1 - t) ** 2 + 0.001)
      core.material.opacity = 1 - t
      wave.scale.setScalar(size * (0.25 + 0.95 * out))
      wave.material.opacity = (1 - t) ** 2
      shardMaterial.opacity = 1 - t
      shards.forEach((mesh) => {
        const { angle, reach, length, spin } = mesh.userData
        mesh.position.set(
          Math.cos(angle) * reach * out,
          Math.sin(angle) * reach * out,
          0
        )
        mesh.rotation.z = angle - Math.PI / 2 + spin * t
        mesh.scale.set(length * 0.3, length * (1 - t) + 0.001, 1)
      })
    })
    .onComplete(() => {
      viewport.displayContent.remove(group)
      core.material.dispose()
      wave.material.dispose()
      shardMaterial.dispose()
    })
    .start()
}

// A word that floats up from where something happened, then fades
const floatLabel = (
  viewport: Viewport,
  font: Font,
  text: string,
  x: number,
  y: number,
  size: number
) => {
  const material = glow(1.5, true)
  const mesh = new Mesh(textGeometry(font, text, size), material)
  mesh.position.set(x, y, 4)
  viewport.displayContent.add(mesh)
  new Tween({ t: 0 }, viewport.tweenGroup)
    .to({ t: 1 }, 950)
    .onUpdate(({ t }) => {
      mesh.position.y = y + size * 2.6 * Easing.Cubic.Out(t)
      mesh.scale.setScalar(Math.min(1, 0.6 + t * 4))
      material.opacity = t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45
    })
    .onComplete(() => {
      viewport.displayContent.remove(mesh)
      mesh.geometry.dispose()
      material.dispose()
    })
    .start()
}

// The jet, lit from the upper left like the falling words so the edge filter
// draws its panels. The flash lights it past white when it's hit.
const jetMaterial = () =>
  new ShaderMaterial({
    uniforms: { flash: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float flash;
      varying vec3 vNormal;

      void main() {
        vec3 light = normalize(vec3(-0.4, 0.6, 1.0));
        float lit = max(dot(normalize(vNormal), light), 0.0);
        gl_FragColor = vec4(vec3(0.35 + 0.8 * lit + flash), 1.0);
      }
    `
  })

// 3, 2, 1, GO!: each punches in out of a glow and falls away, with a line on
// how to fly above them. The game starts as GO! clears.
export const addGameCountdown = async (viewport: Viewport) => {
  const version = viewport.contentVersion
  const font = await loadFont(FONT)
  if (viewport.contentVersion !== version) return
  const { half, scale: s } = measureField(viewport)
  const y = PLANE_HEIGHT / 2

  ;['3', '2', '1', 'GO!'].forEach((text, i) => {
    const go = text === 'GO!'
    const geometry = textGeometry(font, text, 10)
    const size =
      (go ? 4.4 : 4) * Math.min(1, (half * 1.6) / (widthOf(geometry) * 4.4))
    const material = glow(1.1, true)
    const mesh = new Mesh(geometry, material)
    mesh.position.set(0, y, 0)
    mesh.visible = false
    viewport.displayContent.add(mesh)

    // In over the first part, held, then out: digits shrink away, GO! swells
    const enter = go ? 0.25 : 0.38
    const leave = go ? 0.6 : 0.7
    const timeout = window.setTimeout(
      () => {
        mesh.visible = true
        if (go) burst(viewport, 0, y, 34 * s)
        new Tween({ t: 0 }, viewport.tweenGroup)
          .to({ t: 1 }, go ? 1000 : 750)
          .onUpdate(({ t }) => {
            let scale = 1
            let opacity = 1
            if (t < enter) {
              const k = t / enter
              scale = 1.8 - 0.8 * Easing.Back.Out(k)
              opacity = Math.min(1, k * 2)
            } else if (t > leave) {
              const k = (t - leave) / (1 - leave)
              scale = go ? 1 + 0.5 * k : 1 - 0.35 * k * k
              opacity = 1 - k
            }
            mesh.scale.setScalar(size * scale)
            material.opacity = opacity
            material.color.setScalar(1.1 + 1.6 * Math.max(0, 1 - t / enter))
          })
          .start()
      },
      250 + i * 750
    )
    viewport.addToActiveTimeouts(timeout)
  })

  const howToFly = matchMedia('(pointer: coarse)').matches
    ? 'DRAG ANYWHERE TO FLY'
    : 'MOVE THE MOUSE TO FLY'
  const hintGeometry = textGeometry(font, howToFly, 5)
  const hintMaterial = glow(1, true)
  const hint = new Mesh(hintGeometry, hintMaterial)
  hint.scale.setScalar(Math.min(1, (half * 1.7) / widthOf(hintGeometry)))
  hint.position.set(0, y + 36, 0)
  hintMaterial.opacity = 0
  viewport.displayContent.add(hint)
  new Tween(hintMaterial, viewport.tweenGroup)
    .to({ opacity: 1 }, 400)
    .delay(150)
    .chain(
      new Tween(hintMaterial, viewport.tweenGroup)
        .to({ opacity: 0 }, 400)
        .delay(2000)
    )
    .start()
}

type Word = {
  mesh: Mesh
  uniforms: ShaderMaterial['uniforms']
  // Half its width and height, unscaled
  halfX: number
  halfY: number
  baseX: number
  y: number
  sway: number
  swayRate: number
  phase: number
  age: number
  hits: number
  armor: number
  kick: number
  punch: number
  flash: number
  sank: boolean
}

type Bullet = { mesh: Mesh; vx: number; vy: number }

type Pickup = {
  mesh: Mesh<BufferGeometry, MeshBasicMaterial>
  kind: Kind
  baseX: number
  y: number
  age: number
  sank: boolean
}

export const addFighterJetGame = async (viewport: Viewport) => {
  const version = viewport.contentVersion
  const [font, [frag, vert], model] = await Promise.all([
    loadFont(FONT),
    loadShaders(),
    loadJet()
  ])
  if (viewport.contentVersion !== version) return

  const field = measureField(viewport)
  const s = field.scale
  const content = viewport.displayContent
  const shaker = createShaker(viewport)
  const clock = createClock()
  const { heart, star, shield, disc, hex, tracer, flame } = geometries()
  // Depth makes arriving words smaller; this undoes the drift towards the
  // middle that comes with it, so they grow in place
  const cameraZ = viewport.facingCameraPos.z
  const centreY = viewport.facingCameraPos.y
  const atDepth = (z: number) => (cameraZ - z) / cameraZ

  // The jet, with a flame flickering at its tail, a flash at its nose when
  // it fires, and a hexagon around it while shielded
  const jet = new Group()
  const body = model.clone()
  body.rotation.x = Math.PI / 2
  body.scale.setScalar(JET_SCALE * s)
  const bodyMaterial = jetMaterial()
  body.traverse((child) => {
    if (child instanceof Mesh) child.material = bodyMaterial
  })
  const noseY = JET_NOSE * JET_SCALE * s
  const tailY = -JET_TAIL * JET_SCALE * s
  const exhaust = new Mesh(flame, glow(2.4))
  exhaust.rotation.z = Math.PI
  const muzzle = new Mesh(disc, glow(2.6, true))
  muzzle.position.set(0, noseY + 2 * s, 1)
  const aura = new Mesh(hex, glow(1.6, true))
  aura.material.opacity = 0.6
  aura.visible = false
  jet.add(body, exhaust, muzzle, aura)
  jet.position.set(0, SINK_Y, 0)
  content.add(jet)
  // Forgiving: a little inside the wings and the nose
  const hitX = JET_WINGTIP * JET_SCALE * s * 0.55
  const hitY = ((JET_NOSE + JET_TAIL) / 2) * JET_SCALE * s * 0.6
  const hitCentre = ((JET_NOSE - JET_TAIL) / 2) * JET_SCALE * s
  const tracerMaterial = glow(2.4)

  // Hearts top left, the score top right, both under the tabs
  const heartScale = 0.7 * s
  const hearts = Array.from({ length: LIVES }, (_, i) => {
    const mesh = new Mesh(heart, glow(1.25))
    mesh.position.set(-field.half + 6 * s + i * 14 * s, HUD_Y, 0)
    mesh.scale.setScalar(0.001)
    mesh.userData = { alive: false }
    content.add(mesh)
    return mesh
  })
  const scoreMaterial = glow(1.1)
  const score = new Mesh(
    textGeometry(font, 'Defeated: 0', 6.5 * s),
    scoreMaterial
  )
  const placeScore = () =>
    score.position.set(field.half - widthOf(score.geometry) / 2, HUD_Y, 0)
  placeScore()
  content.add(score)

  // A lost heart swells white and collapses; a regained one pops back
  const showLives = (count: number, stagger = 0) => {
    hearts.forEach((mesh, i) => {
      const alive = i < count
      if (mesh.userData.alive === alive) return
      mesh.userData.alive = alive
      mesh.userData.tween?.stop()
      const material = mesh.material as MeshBasicMaterial
      mesh.userData.tween = new Tween({ t: 0 }, viewport.tweenGroup)
        .to({ t: 1 }, alive ? 420 : 380)
        .delay(i * stagger)
        .onUpdate(({ t }) => {
          if (alive) {
            mesh.scale.setScalar(heartScale * Easing.Back.Out(t) + 0.001)
            material.color.setScalar(1.25 + 1.5 * (1 - t))
          } else {
            const swell = Math.min(t / 0.25, 1)
            const fall = Easing.Back.In(Math.max(0, (t - 0.25) / 0.75))
            mesh.scale.setScalar(
              heartScale * (1 + 0.4 * swell) * (1 - fall) + 0.001
            )
            material.color.setScalar(1.25 + 2 * swell * (1 - fall))
          }
        })
        .start()
    })
  }
  showLives(LIVES, 90)

  let lives = LIVES
  let guns = 1
  let kills = 0
  let alive = true
  let time = 0
  let nextWord = WORD_EVERY_S.from
  let nextShot = JET_RISE_S
  const nextPickup: Record<Kind, number> = { ...PICKUP_EVERY_S }
  let shieldLeft = 0
  let immuneLeft = 0
  let flash = 0
  let kick = 0
  let bank = 0
  let muzzleAge = 1
  let auraPop = 0
  let scoreBump = 0
  let splashed = false
  const words: Word[] = []
  const bullets: Bullet[] = []
  const pickups: Pickup[] = []
  const position = { x: 0, y: SINK_Y }
  const target = { x: 0, y: JET_START_Y }

  // A mouse flies the jet directly. A finger drags it from wherever it
  // touches down, so the finger never covers it.
  const canvas = viewport.renderer.domElement
  const board = viewport.toBoard(0, 0)
  let drag:
    | {
        pointer: number
        fromX: number
        fromY: number
        jetX: number
        jetY: number
      }
    | undefined
  const edge = field.half - JET_WINGTIP * JET_SCALE * s * 0.8
  const steerTo = (x: number, y: number) => {
    target.x = MathUtils.clamp(x, -edge, edge)
    target.y = MathUtils.clamp(y, JET_MIN_Y, JET_MAX_Y)
  }
  const onMove = (e: PointerEvent) => {
    viewport.toBoard(e.clientX, e.clientY, board)
    if (e.pointerType === 'mouse') {
      steerTo(board.x, board.y)
    } else if (drag && drag.pointer === e.pointerId) {
      steerTo(
        drag.jetX + board.x - drag.fromX,
        drag.jetY + board.y - drag.fromY
      )
      // Held against an edge, the drag picks up from there when it turns back
      drag.fromX = board.x - (target.x - drag.jetX)
      drag.fromY = board.y - (target.y - drag.jetY)
    }
  }
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return
    viewport.toBoard(e.clientX, e.clientY, board)
    drag = {
      pointer: e.pointerId,
      fromX: board.x,
      fromY: board.y,
      jetX: target.x,
      jetY: target.y
    }
  }
  const onUp = (e: PointerEvent) => {
    if (drag && drag.pointer === e.pointerId) drag = undefined
  }
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)
  viewport.idleCursor = 'none'
  viewport.addContentCleanup(() => {
    canvas.removeEventListener('pointermove', onMove)
    canvas.removeEventListener('pointerdown', onDown)
    canvas.removeEventListener('pointerup', onUp)
    canvas.removeEventListener('pointercancel', onUp)
    viewport.idleCursor = ''
    words.forEach((w) => (w.mesh.material as ShaderMaterial).dispose())
    pickups.forEach((p) => p.mesh.material.dispose())
  })

  const splash = (x: number, spread: number) => {
    for (let k = -1; k <= 1; k++) {
      viewport.spawnRipple(x + k * spread * 0.6, 5 + Math.random() * 5)
    }
  }

  const updateScore = () => {
    score.geometry.dispose()
    score.geometry = textGeometry(font, `Defeated: ${kills}`, 6.5 * s)
    placeScore()
    scoreBump = 1
  }

  const spawnWord = () => {
    const text = WORDS[Math.floor(Math.random() * WORDS.length)]
    const mesh = wordMesh(font, frag, vert, text)
    const box = mesh.geometry.boundingBox!
    const halfX = (box.max.x - box.min.x) / 2
    const halfY = (box.max.y - box.min.y) / 2
    const halfWidth = halfX * s
    // Some sway side to side, never off the edge
    const sway =
      Math.random() < 0.4
        ? Math.min(
            field.half * (0.1 + Math.random() * 0.1),
            Math.max(0, field.half - halfWidth)
          )
        : 0
    const room = Math.max(0, field.half - halfWidth - sway)
    mesh.scale.setScalar(s)
    content.add(mesh)
    words.push({
      mesh,
      uniforms: (mesh.material as ShaderMaterial).uniforms,
      halfX,
      halfY,
      baseX: MathUtils.randFloatSpread(2 * room),
      y: SPAWN_Y,
      sway,
      swayRate: 1.2 + Math.random(),
      phase: Math.random() * Math.PI * 2,
      age: 0,
      hits: 0,
      armor: text.length - 1,
      kick: 0,
      punch: 0,
      flash: 0,
      sank: false
    })
  }

  const spawnPickup = (kind: Kind) => {
    const geometry = { gun: star, shield, life: heart }[kind]
    const mesh = new Mesh(geometry, glow(1.6, true))
    mesh.scale.setScalar((kind === 'life' ? 0.8 : 1.05) * s)
    content.add(mesh)
    pickups.push({
      mesh,
      kind,
      baseX: MathUtils.randFloatSpread(2 * (field.half - 10 * s)),
      y: SPAWN_Y,
      age: 0,
      sank: false
    })
  }

  // Shattered: its pieces fly apart in a white flash as it shrinks away
  const destroy = (w: Word, counts: boolean) => {
    words.splice(words.indexOf(w), 1)
    if (counts) {
      kills++
      updateScore()
    }
    const { x, y } = w.mesh.position
    // Sized to the word, within reason: a long one would fill the screen
    burst(
      viewport,
      x,
      y,
      MathUtils.clamp(w.halfX * w.mesh.scale.x, 12 * s, 24 * s)
    )
    const from = w.mesh.scale.x
    new Tween({ t: 0 }, viewport.tweenGroup)
      .to({ t: 1 }, 380)
      .onUpdate(({ t }) => {
        w.uniforms.amplitude.value = 1 + 5 * t
        w.uniforms.flash.value = 2.4 * (1 - t)
        w.mesh.scale.setScalar(from * (1 + 0.3 * t) * (1 - t * t) + 0.001)
      })
      .onComplete(() => {
        content.remove(w.mesh)
        ;(w.mesh.material as ShaderMaterial).dispose()
      })
      .start()
  }

  // Pops, and says what it gave
  const collect = (p: Pickup) => {
    pickups.splice(pickups.indexOf(p), 1)
    let label = ''
    if (p.kind === 'gun') {
      guns++
      label = '+1 GUN'
    } else if (p.kind === 'shield') {
      shieldLeft = SHIELD_S
      auraPop = 1
      label = 'SHIELD'
    } else if (lives < LIVES) {
      lives++
      showLives(lives)
      label = '+1 LIFE'
    } else {
      label = 'LIFE FULL'
    }
    const { x, y } = p.mesh.position
    floatLabel(viewport, font, label, x, y + 8 * s, 5.5 * s)
    burst(viewport, x, y, 12 * s)
    const from = p.mesh.scale.x
    new Tween({ t: 0 }, viewport.tweenGroup)
      .to({ t: 1 }, 280)
      .onUpdate(({ t }) => {
        p.mesh.scale.setScalar(from * (1 + 0.9 * Easing.Cubic.Out(t)))
        p.mesh.material.opacity = 1 - t
      })
      .onComplete(() => {
        content.remove(p.mesh)
        p.mesh.material.dispose()
      })
      .start()
  }

  // Knocked back, flashing, then blinking while it can't be hit again
  const hurt = () => {
    lives--
    showLives(lives)
    burst(viewport, position.x, position.y, 16 * s)
    flash = 1.8
    kick = -7 * s
    immuneLeft = HIT_IMMUNE_S
    shaker.shake(3, 0.3)
    if (lives > 0) return

    // Out of lives: the jet goes up in a chain of bursts, the words still
    // falling, then the game over screen
    alive = false
    lastScore = kills
    const { x, y } = position
    ;[0, 150, 320].forEach((ms, k) => {
      const timeout = window.setTimeout(() => {
        burst(viewport, x + (k - 1) * 8 * s, y + (k % 2) * 6 * s, 26 * s)
      }, ms)
      viewport.addToActiveTimeouts(timeout)
    })
    shaker.shake(6, 0.6)
    const end = window.setTimeout(() => {
      viewport.clearContentGroup()
      viewport.switchContent('lose')
    }, 1400)
    viewport.addToActiveTimeouts(end)
  }

  viewport.addContentFrame(() => {
    const dt = clock()
    time += dt

    // The jet rises out of the water, then closes on where it's steered,
    // banking into its turns
    const lastX = position.x
    if (time < JET_RISE_S) {
      position.y = MathUtils.lerp(
        SINK_Y,
        JET_START_Y,
        Easing.Back.Out(time / JET_RISE_S)
      )
      if (!splashed && position.y > 0) {
        splashed = true
        splash(position.x, 10 * s)
      }
    } else if (alive) {
      const follow = 1 - Math.exp(-JET_FOLLOW * dt)
      position.x += (target.x - position.x) * follow
      position.y += (target.y - position.y) * follow
    }
    const vx = (position.x - lastX) / Math.max(dt, 0.001)
    bank +=
      (MathUtils.clamp(vx * 0.01, -0.8, 0.8) - bank) * (1 - Math.exp(-10 * dt))
    kick *= Math.exp(-8 * dt)
    flash *= Math.exp(-10 * dt)
    immuneLeft = Math.max(0, immuneLeft - dt)
    shieldLeft = Math.max(0, shieldLeft - dt)
    jet.position.set(position.x, position.y + kick, 0)
    jet.rotation.set(0, bank, -bank * 0.18)
    jet.visible =
      alive && (immuneLeft === 0 || Math.floor(immuneLeft * 14) % 2 === 0)
    bodyMaterial.uniforms.flash.value = flash
    const flameLength = (4.5 + Math.random() * 2.5) * s
    exhaust.scale.set(1.5 * s, flameLength, 1.5 * s)
    exhaust.position.set(0, tailY - flameLength / 2, 0)
    muzzleAge += dt
    muzzle.visible = muzzleAge < 0.09
    muzzle.scale.setScalar(2.6 * s * (0.6 + muzzleAge / 0.09))
    muzzle.material.opacity = 1 - muzzleAge / 0.09
    // The shield's hexagon pops on, turns, and blinks in its last half second
    auraPop *= Math.exp(-7 * dt)
    aura.visible =
      shieldLeft > 0 &&
      (shieldLeft > 0.5 || Math.floor(shieldLeft * 12) % 2 === 0)
    aura.scale.setScalar(
      20 * s * (1 + 0.35 * auraPop + 0.04 * Math.sin(time * 10))
    )
    aura.rotation.z += dt * 1.2

    scoreBump *= Math.exp(-7 * dt)
    score.scale.setScalar(Math.min(1, time / 0.3) * (1 + 0.3 * scoreBump))
    scoreMaterial.color.setScalar(1.1 + 1.4 * scoreBump)

    if (alive && time >= nextShot) {
      nextShot = time + BULLET_EVERY_S
      muzzleAge = 0
      const spread = Math.min(MAX_SPREAD_DEG, (guns - 1) * 15)
      for (let b = 0; b < guns; b++) {
        const angle = MathUtils.degToRad(
          guns > 1 ? -spread / 2 + (spread / (guns - 1)) * b : 0
        )
        const mesh = new Mesh(tracer, tracerMaterial)
        mesh.scale.set(1.1 * s, 7 * s, 1)
        mesh.rotation.z = -angle
        mesh.position.set(position.x, position.y + kick + noseY, 0.5)
        content.add(mesh)
        bullets.push({
          mesh,
          vx: Math.sin(angle) * BULLET_SPEED,
          vy: Math.cos(angle) * BULLET_SPEED
        })
      }
    }

    if (alive && time >= nextWord) {
      spawnWord()
      const ramp = Math.min(time / WORD_EVERY_S.over, 1)
      nextWord =
        time + MathUtils.lerp(WORD_EVERY_S.from, WORD_EVERY_S.to, ramp) / s
    }
    if (alive) {
      for (const kind of Object.keys(nextPickup) as Kind[]) {
        if (time < nextPickup[kind]) continue
        spawnPickup(kind)
        nextPickup[kind] = time + PICKUP_EVERY_S[kind]
      }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const { mesh, vx: bx, vy: by } = bullets[i]
      mesh.position.x += bx * dt
      mesh.position.y += by * dt
      if (
        mesh.position.y > HUD_Y - 6 ||
        Math.abs(mesh.position.x) > field.half + 10
      ) {
        content.remove(mesh)
        bullets.splice(i, 1)
      }
    }

    // Words fly in out of the distance glowing, sway as they fall, jolt
    // when hit, and splash into the water
    const fall = ((SPAWN_Y - SINK_Y) / WORD_FALL_S) * dt
    for (let i = words.length - 1; i >= 0; i--) {
      const w = words[i]
      w.age += dt
      w.y -= fall
      w.kick *= Math.exp(-9 * dt)
      w.punch *= Math.exp(-11 * dt)
      w.flash *= Math.exp(-9 * dt)
      const arrived = Easing.Cubic.Out(Math.min(w.age / ARRIVE_S, 1))
      const z = ARRIVE_Z * (1 - arrived)
      const x = w.baseX + Math.sin(w.phase + w.age * w.swayRate) * w.sway
      const y = w.y + w.kick
      w.mesh.position.set(
        x * atDepth(z),
        centreY + (y - centreY) * atDepth(z),
        z
      )
      w.mesh.scale.setScalar(s * (1 + 0.22 * w.punch))
      w.uniforms.flash.value = Math.max(w.flash, 0.9 * (1 - arrived))
      if (!w.sank && w.y < 2) {
        w.sank = true
        splash(x, w.halfX * s)
      }
      if (w.y < SINK_Y) {
        content.remove(w.mesh)
        ;(w.mesh.material as ShaderMaterial).dispose()
        words.splice(i, 1)
      }
    }

    // Pickups spin and pulse as they drift down
    const drift = ((SPAWN_Y - SINK_Y) / PICKUP_FALL_S) * dt
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i]
      p.age += dt
      p.y -= drift
      const arrived = Easing.Cubic.Out(Math.min(p.age / ARRIVE_S, 1))
      const z = ARRIVE_Z * (1 - arrived)
      const x = p.baseX + Math.sin(p.age * 2) * 3 * s
      p.mesh.position.set(
        x * atDepth(z),
        centreY + (p.y - centreY) * atDepth(z),
        z
      )
      p.mesh.rotation.y = p.age * 2.6
      p.mesh.material.color.setScalar(
        1.3 + 0.7 * (0.5 + 0.5 * Math.sin(p.age * 7))
      )
      if (!p.sank && p.y < 2) {
        p.sank = true
        splash(x, 6 * s)
      }
      if (p.y < SINK_Y) {
        content.remove(p.mesh)
        p.mesh.material.dispose()
        pickups.splice(i, 1)
      }
    }

    if (alive) {
      // A word takes a hit per letter after the first, then shatters
      for (let i = bullets.length - 1; i >= 0; i--) {
        const { mesh } = bullets[i]
        const tipX = mesh.position.x
        const tipY = mesh.position.y + 3.5 * s
        const w = words.find(
          ({ mesh: word, age, halfX, halfY }) =>
            age > ARRIVE_S * 0.7 &&
            Math.abs(tipX - word.position.x) < halfX * word.scale.x + s &&
            Math.abs(tipY - word.position.y) < halfY * word.scale.y + s
        )
        if (!w) continue
        content.remove(mesh)
        bullets.splice(i, 1)
        if (w.hits < w.armor) {
          w.hits++
          w.uniforms.amplitude.value = w.hits / w.armor
          w.flash = 1.1
          w.kick = Math.min(w.kick + 2.4 * s, 7 * s)
          w.punch = 1
          burst(viewport, tipX, tipY, 5 * s, false)
        } else {
          destroy(w, true)
        }
      }

      const jx = position.x
      const jy = position.y + kick + hitCentre
      for (const w of [...words]) {
        if (w.age < ARRIVE_S * 0.7) continue
        if (Math.abs(w.mesh.position.x - jx) > w.halfX * w.mesh.scale.x + hitX)
          continue
        if (Math.abs(w.mesh.position.y - jy) > w.halfY * w.mesh.scale.y + hitY)
          continue
        if (shieldLeft > 0) {
          destroy(w, true)
        } else if (immuneLeft === 0) {
          destroy(w, false)
          hurt()
          if (!alive) break
        }
      }

      for (const p of [...pickups]) {
        if (!alive) break
        if (p.age < ARRIVE_S * 0.7) continue
        const reach = 8 * s
        if (Math.abs(p.mesh.position.x - jx) > hitX + reach) continue
        if (Math.abs(p.mesh.position.y - jy) > hitY + reach) continue
        collect(p)
      }
    }

    shaker.update(dt)
  })
}

// "Game Over" slams down and shakes the board, the score settles in under
// it, then a Restart button pops up
export const addGameOver = async (viewport: Viewport) => {
  const version = viewport.contentVersion
  const font = await loadFont(FONT)
  if (viewport.contentVersion !== version) return
  const { half, scale: s } = measureField(viewport)
  const content = viewport.displayContent
  const shaker = createShaker(viewport)
  const clock = createClock()
  viewport.addContentFrame(() => shaker.update(clock()))
  // The title above the horizon with the score just over it, and Restart
  // out over the water
  const titleY = PLANE_HEIGHT / 2 + 42
  const scoreY = PLANE_HEIGHT / 2 + 10

  const titleGeometry = textGeometry(font, 'Game Over', 10)
  const title = new Mesh(titleGeometry, glow(1.15))
  title.scale.setScalar(Math.min(4.5, (half * 1.8) / widthOf(titleGeometry)))
  title.position.set(0, PLANE_HEIGHT + 60, 0)
  content.add(title)
  new Tween(title.position, viewport.tweenGroup)
    .to({ y: titleY }, 700)
    .easing(Easing.Bounce.Out)
    .start()
  // Bounce.Out first lands about a third of the way in
  const impact = window.setTimeout(() => {
    burst(viewport, 0, titleY, 36 * s)
    shaker.shake(5, 0.4)
  }, 250)
  viewport.addToActiveTimeouts(impact)

  const scoreMaterial = glow(1.2, true)
  const scoreLine = new Mesh(
    textGeometry(font, `Defeated ${lastScore}`, 8 * s),
    scoreMaterial
  )
  scoreLine.position.set(0, scoreY - 6, 0)
  scoreMaterial.opacity = 0
  content.add(scoreLine)
  new Tween({ t: 0 }, viewport.tweenGroup)
    .to({ t: 1 }, 500)
    .delay(650)
    .onUpdate(({ t }) => {
      scoreLine.position.y = scoreY - 6 + 6 * Easing.Cubic.Out(t)
      scoreMaterial.opacity = t
    })
    .start()

  const restartTimeout = window.setTimeout(() => {
    const restart = createStandardText(font, 'Restart', { size: 18 * s })
    restart.calculateWireframe(new Vector3(4, 4, 1))
    // A solid box to hover and click, not just the letters' strokes
    restart.object.add(TransparentBox(restart))
    restart.object.userData = { isLink: true }
    restart.object.position.set(0, PLANE_HEIGHT / 4, 0)
    restart.object.scale.setScalar(0.001)
    restart.onRayCasted = (rayCasted) => {
      restart.wire!.visible = rayCasted
    }
    restart.onSelected = () => {
      viewport.restartJetGame()
    }
    viewport.addToContentGroup(restart)
    new Tween(restart.object.scale, viewport.tweenGroup)
      .to({ x: 1, y: 1, z: 1 }, 420)
      .easing(Easing.Back.Out)
      .start()
  }, 1100)
  viewport.addToActiveTimeouts(restartTimeout)
}
