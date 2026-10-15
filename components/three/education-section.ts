import { Easing, Tween } from '@tweenjs/tween.js'
import {
  AdditiveBlending,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Texture,
  TextureLoader,
  Vector2
} from 'three'
import { createTranslationAnimation } from '../../engine/animations/text-animations'
import { loadFont } from '../../engine/loaders/font-loader'
import { createStandardText } from '../../engine/objects/StandardText'
import ThreeDNode from '../../engine/ThreeDNode'
import Viewport from '../../engine/Viewport'
import { PLANE_HEIGHT } from 'constant'

const LOGO_Y = PLANE_HEIGHT / 2 + 10

// The UofT logo, revealed left to right by a line of light, and torn into
// shifting strips around the cursor while it moves over it
const logoMaterial = (logo: Texture) =>
  new ShaderMaterial({
    uniforms: {
      map: { value: logo },
      // How far across (in uv) the reveal has got
      reveal: { value: 0 },
      // The uv under the cursor, and how hard to tear there (0 to 1)
      mouse: { value: new Vector2(-1, -1) },
      tear: { value: 0 },
      time: { value: 0 }
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform float reveal;
      uniform vec2 mouse;
      uniform float tear;
      uniform float time;
      varying vec2 vUv;

      float hash(float n) {
        return fract(sin(n) * 43758.5453);
      }

      void main() {
        vec2 uv = vUv;
        // The plane is three times wider than tall: measure in true proportion
        float distance = length((uv - mouse) * vec2(3.0, 1.0));
        float near = (1.0 - smoothstep(0.0, 0.36, distance)) * tear;
        // Thin horizontal strips jump sideways, re-torn 15 times a second
        float strip = floor(uv.y * 48.0);
        uv.x += (hash(strip * 7.13 + floor(time * 15.0)) - 0.5) * 0.1 * near;
        // Cuts the JPEG noise in the black background, which the scene's
        // edge filter would otherwise draw as faint streaks
        vec3 logo = max(texture2D(map, uv).rgb - 0.05, 0.0) / 0.95;

        // Shown behind the reveal's edge, with a bright line at the edge
        float shown = 1.0 - smoothstep(reveal - 0.06, reveal, vUv.x);
        float edge = exp(-pow((vUv.x - reveal) / 0.025, 2.0));
        gl_FragColor = vec4(logo * (1.1 * shown + 2.5 * edge), 1.0);
      }
    `,
    blending: AdditiveBlending,
    depthWrite: false
  })

export const addEduContent = async (viewport: Viewport) => {
  // The logo rises into place as the light sweeps across it, once loaded
  const logo = new TextureLoader().load('/textures/uoft.jpg', () => {
    reveal.start()
    rise.start()
  })
  const material = logoMaterial(logo)
  const mesh = new Mesh(new PlaneGeometry(180, 60), material)
  const node = new ThreeDNode(mesh)
  const reveal = new Tween(material.uniforms.reveal, viewport.tweenGroup)
    .to({ value: 1.15 }, 1600)
    .easing(Easing.Cubic.InOut)
  const start = { x: 0, y: LOGO_Y - 8, z: 1 }
  node.object.position.set(start.x, start.y, start.z)
  const rise = createTranslationAnimation({
    object: node.object,
    start,
    end: { x: 0, y: LOGO_Y, z: 1 },
    easing: Easing.Cubic.Out,
    duration: 1600,
    group: viewport.tweenGroup
  })

  // Tears quickly while the cursor moves over the logo, mends once it stops
  let last: Vector2 | undefined
  let lastTime = performance.now()
  viewport.addContentFrame(() => {
    const now = performance.now()
    const { uniforms } = material
    uniforms.time.value = now / 1000
    const uv = viewport.raycaster.intersectObject(mesh, false)[0]?.uv
    let target = 0
    if (uv) {
      // Speed in logo widths per second
      const seconds = Math.max((now - lastTime) / 1000, 0.001)
      if (last) target = Math.min(1, (uv.distanceTo(last) / seconds) * 0.8)
      uniforms.mouse.value.copy(uv)
    }
    last = uv?.clone()
    lastTime = now
    const rate = target > uniforms.tear.value ? 0.35 : 0.06
    uniforms.tear.value += (target - uniforms.tear.value) * rate
  })

  const font = await loadFont('/fonts/helvetiker_regular.typeface.json')
  const degree = createStandardText(font, 'B.Sc. in Computer Science - 2019', {
    size: 10
  })

  // The degree rises in as the reveal finishes
  const degreeStart = { x: 10, y: 20, z: 30 }
  degree.object.position.set(degreeStart.x, degreeStart.y, degreeStart.z)
  degree.object.visible = false
  createTranslationAnimation({
    object: degree.object,
    start: degreeStart,
    end: { x: 10, y: 30, z: 0 },
    easing: Easing.Cubic.Out,
    duration: 900,
    group: viewport.tweenGroup
  })
    .delay(1100)
    .onStart(() => {
      degree.object.visible = true
    })
    .start()

  viewport.addToContentGroup(node, degree)
}
