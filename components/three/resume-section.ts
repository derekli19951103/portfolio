import { Easing, Tween } from '@tweenjs/tween.js'
import { PLANE_HEIGHT } from 'constant'
import ThreeDNode from 'engine/ThreeDNode'
import {
  BoxGeometry,
  Mesh,
  ShaderMaterial,
  Texture,
  TextureLoader,
  Vector2
} from 'three'
import Viewport from '../../engine/Viewport'

const BoxDim = 60
// Heights the cube's centre passes as its top, then its bottom, clears the water
const SPLASH_HEIGHTS = [-BoxDim / 4, BoxDim / 2]

// Where "RESUME" sits in resume.png, measured from the image in uv: the rows
// it spans, where its first letter starts, and where each letter ends
const TEXT_ROWS = new Vector2(0.4294, 0.5629)
const TEXT_START = 0.1352
const LETTER_ENDS = [0.2412, 0.3311, 0.4328, 0.5595, 0.734, 0.8409]

// The letters type in as the cube surfaces, then a scan line passes down the
// faces every few seconds
const TYPE_AT_MS = 800
const LETTER_MS = 110
const SCAN_EVERY_MS = 3600
const SCAN_MS = 1300

// A ring of ripples around the cube where it breaks the surface
const splash = (viewport: Viewport) => {
  const radius = BoxDim / 2 + 6
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    viewport.spawnRipple(Math.cos(angle) * radius, Math.sin(angle) * radius)
  }
}

// The faces show "RESUME" like a terminal: typed in behind a blinking block
// cursor, lit by a passing scan line, and glitching now and then. The faces
// light themselves, brightest where they face the camera.
const faceMaterial = (map: Texture) =>
  new ShaderMaterial({
    uniforms: {
      map: { value: map },
      // 0 until the image has loaded, so a blank cube never shows
      ready: { value: 0 },
      time: { value: 0 },
      // How many letters are typed, and whether the cursor is lit
      typed: { value: 0 },
      cursor: { value: 0 },
      // The scan line's height on the face in uv; off the face when idle
      scan: { value: -1 },
      // Glitch strength, and the hover glow, each 0 to 1
      glitch: { value: 0 },
      glow: { value: 0 },
      rows: { value: TEXT_ROWS },
      start: { value: TEXT_START },
      ends: { value: LETTER_ENDS }
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vFacing;

      void main() {
        vUv = uv;
        // How squarely this face points at the camera
        vFacing = abs(normalize(normalMatrix * normal).z);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform float ready;
      uniform float time;
      uniform float typed;
      uniform float cursor;
      uniform float scan;
      uniform float glitch;
      uniform float glow;
      uniform vec2 rows;
      uniform float start;
      uniform float ends[6];
      varying vec2 vUv;
      varying float vFacing;

      float hash(float n) {
        return fract(sin(n) * 43758.5453);
      }

      void main() {
        vec2 uv = vUv;

        // Glitch: strips of the face jump sideways and a few invert,
        // re-rolled 24 times a second
        float strip = floor(uv.y * 36.0);
        float tick = floor(time * 24.0);
        float jumps = step(0.55, hash(strip * 7.7 + tick));
        uv.x += (hash(strip * 13.1 + tick) - 0.5) * 0.2 * glitch * jumps;
        float inverted = glitch * step(0.94, hash(strip * 3.3 + tick));

        // 1 on the letters, 0 on the white face
        float ink = 1.0 - texture2D(map, uv).r;

        // Only the letters typed so far, then the block cursor after them
        float shownEnd = start;
        for (int i = 0; i < 6; i++) {
          if (float(i) + 1.0 <= typed) shownEnd = ends[i];
        }
        ink *= step(uv.x, shownEnd);
        float inRows = step(rows.x, uv.y) * step(uv.y, rows.y);
        float atCursor = step(shownEnd + 0.02, uv.x) * step(uv.x, shownEnd + 0.065);
        ink = max(ink, cursor * inRows * atCursor);

        float face = mix(1.0 - ink, ink, inverted);

        // The scan line: a thin bright line that lights the letters it crosses
        float band = exp(-pow((vUv.y - scan) / 0.014, 2.0));
        float light = (0.55 + 0.45 * vFacing) * (0.75 + 0.35 * glow) + 1.1 * band;
        gl_FragColor = vec4(vec3(face * light * ready), 1.0);
      }
    `
  })

export const addResumeContent = async (viewport: Viewport) => {
  const surfacedAt = performance.now()
  let typedAt = Infinity
  const material = faceMaterial(
    new TextureLoader().load('/textures/resume.png', () => {
      material.uniforms.ready.value = 1
      // Types in as the cube surfaces, or straight away if the image was slow
      const wait = TYPE_AT_MS - (performance.now() - surfacedAt)
      new Tween(material.uniforms.typed, viewport.tweenGroup)
        .to({ value: LETTER_ENDS.length }, LETTER_ENDS.length * LETTER_MS)
        .delay(Math.max(0, wait))
        .onStart(() => {
          material.uniforms.cursor.value = 1
        })
        .onComplete(() => {
          typedAt = performance.now()
        })
        .start()
    })
  )

  const cube = new Mesh(new BoxGeometry(BoxDim, BoxDim, BoxDim), material)

  const node = new ThreeDNode(cube)

  // Short glitch bursts every few seconds, more often while hovered
  let burstEnd = 0
  let nextBurst = surfacedAt + 2600
  const burst = (now: number) => {
    burstEnd = now + 140 + Math.random() * 160
  }
  let wasHovered = false

  node.onSelected = (selected) => {
    if (!selected) return
    burst(performance.now())
    window.open('/resume.html', '_blank')
    // Selection toggles, so clear it and let the next click open it again
    node.setSelected(false)
  }

  node.object.userData = { isRotatingCube: true }

  viewport.addContentFrame(() => {
    const now = performance.now()
    const { uniforms } = material
    uniforms.time.value = now / 1000

    // The cursor stays lit while typing, then blinks like a prompt
    if (now > typedAt)
      uniforms.cursor.value = (now - typedAt) % 1000 < 550 ? 1 : 0

    // A scan line passes down the faces once typing is done
    const sinceTyped = now - typedAt
    const phase = sinceTyped % SCAN_EVERY_MS
    uniforms.scan.value =
      sinceTyped > 400 && phase < SCAN_MS ? 1.15 - 1.3 * (phase / SCAN_MS) : -1

    const hovered = node.isRayCasted
    if (hovered && !wasHovered) burst(now)
    wasHovered = hovered
    if (now >= nextBurst) {
      burst(now)
      nextBurst =
        now +
        (hovered ? 500 + Math.random() * 700 : 2500 + Math.random() * 3000)
    }
    uniforms.glitch.value = now < burstEnd ? 0.5 + Math.random() * 0.5 : 0
    uniforms.glow.value += ((hovered ? 1 : 0) - uniforms.glow.value) * 0.15
  })

  // Rises out of the water with a full turn, then settles into its slow spin
  const rise = { y: -BoxDim, turn: 0 }
  let turned = 0
  let splashes = 0
  node.object.position.set(0, rise.y, 0)
  node.object.scale.setScalar(0.6)
  new Tween(rise, viewport.tweenGroup)
    .to({ y: PLANE_HEIGHT / 2, turn: -Math.PI * 2 }, 1200)
    .easing(Easing.Back.Out)
    .onUpdate(() => {
      node.object.position.y = rise.y
      // Added to the idle rotation the viewport applies every frame
      node.object.rotation.y += rise.turn - turned
      turned = rise.turn
      while (
        splashes < SPLASH_HEIGHTS.length &&
        rise.y > SPLASH_HEIGHTS[splashes]
      ) {
        splash(viewport)
        splashes++
      }
    })
    .start()
  new Tween(node.object.scale, viewport.tweenGroup)
    .to({ x: 1, y: 1, z: 1 }, 1200)
    .easing(Easing.Back.Out)
    .start()

  viewport.addToContentGroup(node)
}
