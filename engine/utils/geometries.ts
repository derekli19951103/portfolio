import { Box3, BufferGeometry, Vector2, Vector3 } from "three";

export const ThickWireframe = (bbox: Box3, offset: Vector3) => {
  const bboxMin = bbox.min.addScaledVector(offset, -1);
  const bboxMax = bbox.max.addScaledVector(offset, 1);
  return new BufferGeometry().setFromPoints([
    //1
    new Vector3(bboxMin.x, bboxMin.y, bboxMin.z),
    //2
    new Vector3(bboxMin.x, bboxMin.y, bboxMax.z),
    //3
    new Vector3(bboxMin.x, bboxMax.y, bboxMax.z),
    //4
    new Vector3(bboxMin.x, bboxMax.y, bboxMin.z),
    //1
    new Vector3(bboxMin.x, bboxMin.y, bboxMin.z),
    //5
    new Vector3(bboxMax.x, bboxMin.y, bboxMin.z),
    //6
    new Vector3(bboxMax.x, bboxMin.y, bboxMax.z),
    //7
    new Vector3(bboxMax.x, bboxMax.y, bboxMax.z),
    //8
    new Vector3(bboxMax.x, bboxMax.y, bboxMin.z),
    //4
    new Vector3(bboxMin.x, bboxMax.y, bboxMin.z),
    //3
    new Vector3(bboxMin.x, bboxMax.y, bboxMax.z),
    //7
    new Vector3(bboxMax.x, bboxMax.y, bboxMax.z),
    //6
    new Vector3(bboxMax.x, bboxMin.y, bboxMax.z),
    //2
    new Vector3(bboxMin.x, bboxMin.y, bboxMax.z),
    //1
    new Vector3(bboxMin.x, bboxMin.y, bboxMin.z),
    //5
    new Vector3(bboxMax.x, bboxMin.y, bboxMin.z),
    //8
    new Vector3(bboxMax.x, bboxMax.y, bboxMin.z),
  ]);
};
