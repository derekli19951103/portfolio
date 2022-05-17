import TWEEN from "@tweenjs/tween.js";
import {
  AdditiveBlending,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  TextureLoader,
} from "three";
import { createTranslationAnimation } from "../../engine/animations/text-animations";
import ThreeDNode from "../../engine/ThreeDNode";
import Viewport from "../../engine/Viewport";
import { PLANE_HEIGHT } from "../Canvas";

export const addEduContent = async (viewport: Viewport) => {
  const geo = new PlaneGeometry(180, 60);

  const mesh = new Mesh(
    geo,
    new MeshBasicMaterial({
      map: new TextureLoader().load("/textures/uoft.png"),
      blending: AdditiveBlending,
      side: DoubleSide,
    })
  );

  const node = new ThreeDNode(mesh);

  createTranslationAnimation({
    object: node.object,
    start: {
      x: -100,
      y: PLANE_HEIGHT / 2 + 10,
      z: 1,
    },
    end: { x: 0, y: PLANE_HEIGHT / 2 + 10, z: 1 },
    easing: TWEEN.Easing.Quadratic.InOut,
  }).start();

  viewport.addToContentGroup(node);
};
