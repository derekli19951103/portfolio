import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Points,
  ShaderMaterial,
  Vector3
} from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry'

// One point per frame, so the trail is the last 0.6 s of the cursor's path
const LENGTH = 36
const SPARK_COUNT = 320
const BAR_COUNT = 24

const CYAN = new Color(0x00f0ff)
const MAGENTA = new Color(0xff2bd6)
const VIOLET = new Color(0x6a00ff)
const WHITE = new Color(0xffffff)

type Strand = {
  geometry: LineGeometry
  material: LineMaterial
  // Which way this strand pulls apart from the core when moving fast
  split: number
}

// Bright at the cursor and fading to black (which adds nothing) at the tail
const strand = (
  head: Color,
  tail: Color,
  linewidth: number,
  opacity: number,
  split: number
): Strand => {
  const colors: number[] = []
  const color = new Color()
  for (let i = 0; i < LENGTH; i++) {
    const t = i / (LENGTH - 1)
    color.lerpColors(head, tail, t).multiplyScalar(Math.pow(1 - t, 2))
    colors.push(color.r, color.g, color.b)
  }
  const geometry = new LineGeometry()
  geometry.setPositions(new Float32Array(LENGTH * 3))
  geometry.setColors(colors)
  const material = new LineMaterial({
    linewidth,
    vertexColors: true,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false
  })
  return { geometry, material, split }
}

const sparkMaterial = (pixelRatio: number) =>
  new ShaderMaterial({
    uniforms: { pixelRatio: { value: pixelRatio } },
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aAlpha;
      attribute float aSize;
      uniform float pixelRatio;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vColor = aColor;
        vAlpha = aAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * pixelRatio;
      }
    `,
    // Square on purpose: pixels, not round sparks
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        gl_FragColor = vec4(vColor * vAlpha, 1.0);
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false
  })

// A neon cursor trail, meant to be drawn after the scene's grayscale and edge
// filters so it keeps its colour: a magenta haze, a white-hot core, cyan and
// magenta ghosts that split from it as the cursor speeds up, runs of points
// that glitch sideways, flashing horizontal glitch bars, and a spray of
// square pixel sparks. All of it scales with speed, so a still cursor stays
// quiet.
export class CyberTrail {
  object = new Group()

  private history = new Float32Array(LENGTH * 3)
  private drawn = new Float32Array(LENGTH * 3)
  private strands: Strand[]
  private lastHead = new Vector3()
  private speed = 0

  private sparkGeometry = new BufferGeometry()
  private sparkPosition = new Float32Array(SPARK_COUNT * 3)
  private sparkColor = new Float32Array(SPARK_COUNT * 3)
  private sparkAlpha = new Float32Array(SPARK_COUNT)
  private sparkSize = new Float32Array(SPARK_COUNT)
  private sparkVelocity = new Float32Array(SPARK_COUNT * 2)
  private sparkLife = new Float32Array(SPARK_COUNT)
  private sparkMaxLife = new Float32Array(SPARK_COUNT)
  private nextSpark = 0

  // Glitch bars: where each one sits, how wide, and how many frames are left
  private barGeometry = new LineSegmentsGeometry()
  private barMaterial: LineMaterial
  private bar = new Float32Array(BAR_COUNT * 4)
  private barLife = new Float32Array(BAR_COUNT)
  private barTint = new Float32Array(BAR_COUNT * 3)
  private barPositions = new Float32Array(BAR_COUNT * 6)
  private barColors = new Float32Array(BAR_COUNT * 6)
  private nextBar = 0

  constructor(width: number, height: number, pixelRatio: number) {
    this.strands = [
      strand(MAGENTA, VIOLET, 12, 0.14, 0),
      strand(MAGENTA, MAGENTA, 1.5, 0.55, 1),
      strand(CYAN, CYAN, 1.5, 0.55, -1),
      strand(WHITE, CYAN, 2.5, 0.85, 0)
    ]
    // Out of sight until the cursor first moves
    for (let i = 0; i < LENGTH; i++) this.history[i * 3 + 1] = -9999
    this.strands.forEach((s, i) => {
      s.geometry.setPositions(this.history)
      const line = new Line2(s.geometry, s.material)
      // The positions change every frame, so its bounds would go stale
      line.frustumCulled = false
      line.renderOrder = i
      this.object.add(line)
    })

    this.sparkGeometry.setAttribute(
      'position',
      new BufferAttribute(this.sparkPosition, 3)
    )
    this.sparkGeometry.setAttribute(
      'aColor',
      new BufferAttribute(this.sparkColor, 3)
    )
    this.sparkGeometry.setAttribute(
      'aAlpha',
      new BufferAttribute(this.sparkAlpha, 1)
    )
    this.sparkGeometry.setAttribute(
      'aSize',
      new BufferAttribute(this.sparkSize, 1)
    )
    const sparks = new Points(this.sparkGeometry, sparkMaterial(pixelRatio))
    sparks.frustumCulled = false
    sparks.renderOrder = this.strands.length
    this.object.add(sparks)

    this.barMaterial = new LineMaterial({
      linewidth: 2,
      vertexColors: true,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false
    })
    this.barPositions.fill(-9999)
    this.barGeometry.setPositions(this.barPositions)
    this.barGeometry.setColors(this.barColors)
    const bars = new LineSegments2(this.barGeometry, this.barMaterial)
    bars.frustumCulled = false
    bars.renderOrder = this.strands.length + 1
    this.object.add(bars)

    this.setResolution(width, height)
  }

  setResolution(width: number, height: number) {
    this.strands.forEach((s) => s.material.resolution.set(width, height))
    this.barMaterial.resolution.set(width, height)
  }

  // Starts the whole trail at the cursor, so it doesn't sweep in from the
  // origin the first time the cursor appears
  reset(head: Vector3) {
    for (let i = 0; i < LENGTH; i++) {
      this.history[i * 3] = head.x
      this.history[i * 3 + 1] = head.y
      this.history[i * 3 + 2] = head.z
    }
    this.lastHead.copy(head)
  }

  update(head: Vector3) {
    // Each frame the history moves back one point and the cursor goes in front
    this.history.copyWithin(3, 0, (LENGTH - 1) * 3)
    this.history[0] = head.x
    this.history[1] = head.y
    this.history[2] = head.z
    this.speed += (head.distanceTo(this.lastHead) - this.speed) * 0.25
    this.lastHead.copy(head)

    // On fast moves, now and then a short run of the trail jumps sideways
    // for a single frame
    const glitching = Math.random() < Math.min(0.2, this.speed * 0.04)
    const from = 2 + Math.floor(Math.random() * (LENGTH - 12))
    const to = from + 2 + Math.floor(Math.random() * 6)
    const jump = (Math.random() - 0.5) * (3 + this.speed)
    const apart = Math.min(2, this.speed * 0.45)

    for (const s of this.strands) {
      for (let i = 0; i < LENGTH; i++) {
        const glitch = glitching && i >= from && i < to ? jump : 0
        this.drawn[i * 3] = this.history[i * 3] + s.split * apart + glitch
        this.drawn[i * 3 + 1] = this.history[i * 3 + 1]
        this.drawn[i * 3 + 2] = this.history[i * 3 + 2]
      }
      s.geometry.setPositions(this.drawn)
    }

    this.updateSparks(head)
    this.updateBars()
  }

  // Thin horizontal bars that flash for a few frames beside the trail on
  // fast moves, like a screen glitching
  private updateBars() {
    if (this.speed > 3 && Math.random() < Math.min(0.15, this.speed * 0.02)) {
      const i = this.nextBar
      this.nextBar = (this.nextBar + 1) % BAR_COUNT
      // Somewhere along the newest part of the trail
      const at = Math.floor(Math.random() * 20) * 3
      this.bar[i * 4] = this.history[at] + (Math.random() - 0.5) * 20
      this.bar[i * 4 + 1] = this.history[at + 1] + (Math.random() - 0.5) * 12
      this.bar[i * 4 + 2] = this.history[at + 2]
      this.bar[i * 4 + 3] = 2 + Math.random() * 6
      this.barLife[i] = 2 + Math.floor(Math.random() * 4)
      const tint = [CYAN, MAGENTA, WHITE][Math.floor(Math.random() * 3)]
      this.barTint[i * 3] = tint.r
      this.barTint[i * 3 + 1] = tint.g
      this.barTint[i * 3 + 2] = tint.b
    }

    for (let i = 0; i < BAR_COUNT; i++) {
      const alive = this.barLife[i] > 0
      if (alive) this.barLife[i] -= 1
      const [x, y, z, half] = this.bar.subarray(i * 4, i * 4 + 4)
      const p = this.barPositions
      p[i * 6] = x - half
      p[i * 6 + 3] = x + half
      p[i * 6 + 1] = p[i * 6 + 4] = alive ? y : -9999
      p[i * 6 + 2] = p[i * 6 + 5] = z
      for (let k = 0; k < 6; k++)
        this.barColors[i * 6 + k] = this.barTint[i * 3 + (k % 3)]
    }
    this.barGeometry.setPositions(this.barPositions)
    this.barGeometry.setColors(this.barColors)
  }

  private updateSparks(head: Vector3) {
    // More sparks the faster the cursor moves; none when it's still
    const spawn = Math.min(3, Math.floor(this.speed * 0.4 + Math.random()))
    for (let n = 0; n < spawn && this.speed > 0.05; n++) {
      const i = this.nextSpark
      this.nextSpark = (this.nextSpark + 1) % SPARK_COUNT
      const angle = Math.random() * Math.PI * 2
      const force = 0.1 + Math.random() * 0.35
      this.sparkPosition[i * 3] = head.x + (Math.random() - 0.5)
      this.sparkPosition[i * 3 + 1] = head.y + (Math.random() - 0.5)
      this.sparkPosition[i * 3 + 2] = head.z
      this.sparkVelocity[i * 2] = Math.cos(angle) * force
      this.sparkVelocity[i * 2 + 1] = Math.sin(angle) * force
      const color = Math.random() < 0.65 ? CYAN : MAGENTA
      this.sparkColor[i * 3] = color.r
      this.sparkColor[i * 3 + 1] = color.g
      this.sparkColor[i * 3 + 2] = color.b
      this.sparkSize[i] = 2 + Math.random() * 2
      this.sparkMaxLife[i] = this.sparkLife[i] = 20 + Math.random() * 20
    }

    for (let i = 0; i < SPARK_COUNT; i++) {
      if (this.sparkLife[i] <= 0) {
        this.sparkAlpha[i] = 0
        continue
      }
      this.sparkLife[i] -= 1
      this.sparkPosition[i * 3] += this.sparkVelocity[i * 2]
      this.sparkPosition[i * 3 + 1] += this.sparkVelocity[i * 2 + 1]
      this.sparkVelocity[i * 2] *= 0.92
      this.sparkVelocity[i * 2 + 1] *= 0.92
      // Fades out, with the odd dropped frame so it flickers like a bad signal
      const flicker = Math.random() < 0.12 ? 0.25 : 1
      this.sparkAlpha[i] = (this.sparkLife[i] / this.sparkMaxLife[i]) * flicker
    }

    const { attributes } = this.sparkGeometry
    attributes.position.needsUpdate = true
    attributes.aColor.needsUpdate = true
    attributes.aAlpha.needsUpdate = true
    attributes.aSize.needsUpdate = true
  }
}
