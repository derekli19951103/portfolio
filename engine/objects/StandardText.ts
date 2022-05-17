import { Mesh, MeshBasicMaterial, Vector3 } from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";
import { Font } from "three/examples/jsm/loaders/FontLoader";
import ThreeDNode from "../ThreeDNode";

export const createStandardText = (font: Font, text: string) => {
  const geometry = new TextGeometry(text, {
    font,
    size: 20,
    height: 0.1,
    curveSegments: 4,
    bevelEnabled: false,
  });

  const center = new Vector3();
  geometry.computeBoundingBox();
  geometry.boundingBox!.getCenter(center);
  geometry.center();

  const mesh = new Mesh(geometry, new MeshBasicMaterial());

  const node = new ThreeDNode(mesh, {
    onRayCasted: (rayCasted) => {
      mesh.material.wireframe = rayCasted;
    },
  });

  return node;
};