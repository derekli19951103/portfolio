import { Group, Matrix4 } from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'

export const loadObj = (url: string) => {
  return new Promise<Group>((resolve, reject) => {
    const loader = new OBJLoader()

    loader.load(
      url,
      (object) => {
        object.traverse((child) => {
          const pos = child.position
          const matrix = new Matrix4().makeTranslation(-pos.x, -pos.y, -pos.z)
          child.applyMatrix4(matrix)
        })
        resolve(object)
      },
      () => {},
      (err) => reject(err)
    )
  })
}
