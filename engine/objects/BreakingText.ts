import { BufferAttribute, Color, Mesh, ShaderMaterial, Vector3 } from 'three'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry'
import { Font } from 'three/examples/jsm/loaders/FontLoader'
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier'
import ThreeDNode from '../ThreeDNode'

export const createBreakingText = (
  font: Font,
  fragmentShader: string,
  vertexShader: string,
  text: string,
  params?: {
    size?: number
    height?: number
    bevelEnabled?: boolean
  }
) => {
  let geometry = new TextGeometry(text, {
    font,
    size: params?.size || 20,
    depth: params?.height || 3,
    bevelThickness: 1,
    bevelSize: 0.5,
    bevelEnabled:
      params?.bevelEnabled === undefined ? true : params.bevelEnabled
  })

  const center = new Vector3()
  geometry.computeBoundingBox()
  geometry.boundingBox!.getCenter(center)
  geometry.center()

  const tessellateModifier = new TessellateModifier(8, 6)

  geometry = tessellateModifier.modify(geometry)

  const numFaces = geometry.attributes.position.count / 3

  const colors = new Float32Array(numFaces * 3 * 3)
  const displacement = new Float32Array(numFaces * 3 * 3)

  const color = new Color()
  color.setHSL(1, 1, 1)

  for (let f = 0; f < numFaces; f++) {
    const index = 9 * f

    const d = 2 * (0.5 - Math.random())

    for (let i = 0; i < 3; i++) {
      colors[index + 3 * i] = color.r
      colors[index + 3 * i + 1] = color.g
      colors[index + 3 * i + 2] = color.b

      displacement[index + 3 * i] = d
      displacement[index + 3 * i + 1] = d
      displacement[index + 3 * i + 2] = d
    }
  }

  geometry.setAttribute('customColor', new BufferAttribute(colors, 3))
  geometry.setAttribute('displacement', new BufferAttribute(displacement, 3))

  const uniforms = {
    amplitude: { value: 0.0 }
  }

  const shaderMaterial = new ShaderMaterial({
    uniforms: uniforms,
    fragmentShader,
    vertexShader
  })

  const mesh = new Mesh(geometry, shaderMaterial)

  const node = new ThreeDNode(mesh)

  return node
}
