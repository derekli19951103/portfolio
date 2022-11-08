import TWEEN from "@tweenjs/tween.js";
import { Mesh, MeshBasicMaterial, ShapeGeometry, Vector3 } from "three";
import { Font } from "three/examples/jsm/loaders/FontLoader";
import { createTranslationAnimation } from "../animations/text-animations";
import ThreeDNode from "../ThreeDNode";

export const createDupText = (
  font: Font,
  text: string,
  params?: {
    size?: number;
    height?: number;
  }
) => {
  const shapes = font.generateShapes(text, params?.size || 20);

  const geometry = new ShapeGeometry(shapes);

  const center = new Vector3();
  geometry.computeBoundingBox();
  geometry.boundingBox!.getCenter(center);
  geometry.center();

  const mesh = new Mesh(geometry, new MeshBasicMaterial());

  const shadow1 = new Mesh(geometry, new MeshBasicMaterial());

  const shadow2 = new Mesh(geometry, new MeshBasicMaterial());

  mesh.add(shadow1, shadow2);

  const shadowGap = 3;

  const node = new ThreeDNode(mesh);

  node.object.translateZ(shadowGap);

  const s1Animation = createTranslationAnimation({
    object: shadow1,
    start: {
      x: mesh.position.x,
      y: mesh.position.y,
      z: mesh.position.z,
    },
    end: {
      x: mesh.position.x + shadowGap,
      y: mesh.position.y + shadowGap,
      z: mesh.position.z - shadowGap,
    },
    easing: TWEEN.Easing.Quadratic.InOut,
  });

  const s2Animation = createTranslationAnimation({
    object: shadow2,
    start: {
      x: mesh.position.x,
      y: mesh.position.y,
      z: mesh.position.z,
    },
    end: {
      x: mesh.position.x - shadowGap,
      y: mesh.position.y - shadowGap,
      z: mesh.position.z + shadowGap,
    },
    easing: TWEEN.Easing.Quadratic.InOut,
  });

  node.onRayCasted = (rayCasted) => {
    shadow1.visible = rayCasted;
    shadow2.visible = rayCasted;
    if (rayCasted) {
      s1Animation.start();
      s2Animation.start();
    }
  };

  return node;
};
