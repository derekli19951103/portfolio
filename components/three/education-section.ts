import { Easing, Tween } from '@tweenjs/tween.js'
import {
  AdditiveBlending,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Texture,
  TextureLoader
} from 'three'
import { createTranslationAnimation } from '../../engine/animations/text-animations'
import { loadFont } from '../../engine/loaders/font-loader'
import { createStandardText } from '../../engine/objects/StandardText'
import ThreeDNode from '../../engine/ThreeDNode'
import Viewport from '../../engine/Viewport'
import { PLANE_HEIGHT } from 'constant'

const LOGO_Y = PLANE_HEIGHT / 2 + 10
const LOGO_WIDTH = 180
const LOGO_HEIGHT = 60
// The degree sits under the logo's wordmark
const DEGREE = { x: 10, y: 30 }
// Share of the screen's width the logo may take. A phone held upright sees
// less than the logo's width, so there the logo and the degree shrink
// together toward the logo's centre.
const FILL = 0.9

// The UofT logo, revealed left to right by a line of light
const logoMaterial = (logo: Texture) =>
  new ShaderMaterial({
    uniforms: {
      map: { value: logo },
      // How far across (in uv) the reveal has got
      reveal: { value: 0 }
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
      varying vec2 vUv;

      void main() {
        // Cuts the JPEG noise in the black background, which the scene's
        // edge filter would otherwise draw as faint streaks
        vec3 logo = max(texture2D(map, vUv).rgb - 0.05, 0.0) / 0.95;

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
  const seen = 2 * viewport.halfWidthAt(viewport.facingCameraPos.z)
  const fit = Math.min(1, (FILL * seen) / LOGO_WIDTH)

  const material = logoMaterial(logo)
  const mesh = new Mesh(new PlaneGeometry(LOGO_WIDTH, LOGO_HEIGHT), material)
  mesh.scale.setScalar(fit)
  const node = new ThreeDNode(mesh)
  const reveal = new Tween(material.uniforms.reveal, viewport.tweenGroup)
    .to({ value: 1.15 }, 1600)
    .easing(Easing.Cubic.InOut)
  const start = { x: 0, y: LOGO_Y - 8 * fit, z: 1 }
  node.object.position.set(start.x, start.y, start.z)
  const rise = createTranslationAnimation({
    object: node.object,
    start,
    end: { x: 0, y: LOGO_Y, z: 1 },
    easing: Easing.Cubic.Out,
    duration: 1600,
    group: viewport.tweenGroup
  })

  const font = await loadFont('/fonts/helvetiker_regular.typeface.json')
  const degree = createStandardText(font, 'B.Sc. in CS - 2019', {
    size: 10
  })
  degree.object.scale.setScalar(fit)

  // The degree rises in as the reveal finishes
  const degreeAt = {
    x: DEGREE.x * fit,
    y: LOGO_Y + (DEGREE.y - LOGO_Y) * fit
  }
  const degreeStart = { x: degreeAt.x, y: degreeAt.y - 10 * fit, z: 30 }
  degree.object.position.set(degreeStart.x, degreeStart.y, degreeStart.z)
  degree.object.visible = false
  createTranslationAnimation({
    object: degree.object,
    start: degreeStart,
    end: { ...degreeAt, z: 0 },
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
