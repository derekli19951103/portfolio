import ThreeDNode from 'engine/ThreeDNode'
import { BoxGeometry, Matrix4, Mesh, MeshBasicMaterial, Vector3 } from 'three'

export const TransparentBox = (node: ThreeDNode) => {
  const dimensions = new Vector3().subVectors(node.bbox.max, node.bbox.min)
  const boxGeo = new BoxGeometry(dimensions.x, dimensions.y, dimensions.z)
  const matrix = new Matrix4().setPosition(
    dimensions.addVectors(node.bbox.min, node.bbox.max).multiplyScalar(0.5)
  )
  boxGeo.applyMatrix4(matrix)
  const bboxHelper = new Mesh(boxGeo, new MeshBasicMaterial())

  bboxHelper.material.visible = false
  return bboxHelper
}
