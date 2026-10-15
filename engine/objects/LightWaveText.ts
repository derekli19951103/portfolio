import { Mesh, ShaderMaterial } from 'three'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry'
import { Font } from 'three/examples/jsm/loaders/FontLoader'
import ThreeDNode from '../ThreeDNode'

// Text a band of light sweeps across, lifting the letters it passes. The
// caller moves the band (sweep) and sets the brightness either side of it
// (base, peak) and an overall fade. Brightness can go past 1: the scene
// renders in high range, so a bright crest gets a bloom halo.
export const createLightWaveText = (
  font: Font,
  text: string,
  params?: { size?: number; bandWidth?: number; lift?: number }
) => {
  const geometry = new TextGeometry(text, {
    font,
    size: params?.size || 20,
    depth: 0.1,
    bevelEnabled: false
  })
  geometry.center()
  geometry.computeBoundingBox()

  const material = new ShaderMaterial({
    uniforms: {
      sweep: { value: 0 },
      bandWidth: { value: params?.bandWidth || 5 },
      lift: { value: params?.lift || 0.7 },
      base: { value: 0 },
      peak: { value: 0 },
      fade: { value: 0 }
    },
    vertexShader: /* glsl */ `
      uniform float sweep;
      uniform float bandWidth;
      uniform float lift;
      varying float vX;

      void main() {
        vX = position.x;
        float d = (position.x - sweep) / bandWidth;
        vec3 lifted = position + vec3(0.0, lift * exp(-d * d), 0.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(lifted, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float sweep;
      uniform float bandWidth;
      uniform float base;
      uniform float peak;
      uniform float fade;
      varying float vX;

      void main() {
        float d = (vX - sweep) / bandWidth;
        float light = base + (peak - base) * exp(-d * d);
        gl_FragColor = vec4(vec3(light * fade), 1.0);
      }
    `
  })

  return new ThreeDNode(new Mesh(geometry, material))
}
