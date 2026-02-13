import { Mesh, MeshBasicMaterial, Vector3 } from 'three'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry'
import { Font } from 'three/examples/jsm/loaders/FontLoader'
import ThreeDNode from '../ThreeDNode'

export const createWireframeText = (
  font: Font,
  text: string,
  options?: { size?: number }
) => {
  const geometry = new TextGeometry(text, {
    font,
    size: options?.size || 20,
    depth: 0.1,
    bevelEnabled: false
  })

  const center = new Vector3()
  geometry.computeBoundingBox()
  geometry.boundingBox!.getCenter(center)
  geometry.center()

  const mesh = new Mesh(geometry, new MeshBasicMaterial())

  const node = new ThreeDNode(mesh, {
    onRayCasted: (rayCasted) => {
      mesh.material.wireframe = rayCasted
    }
  })

  return node
}
