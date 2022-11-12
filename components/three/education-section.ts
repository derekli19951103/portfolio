import TWEEN from "@tweenjs/tween.js";
import {
  AdditiveBlending,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  TextureLoader,
} from "three";
import { createTranslationAnimation } from "../../engine/animations/text-animations";
import { loadFont } from "../../engine/loaders/font-loader";
import { createStandardText } from "../../engine/objects/StandardText";
import ThreeDNode from "../../engine/ThreeDNode";
import Viewport from "../../engine/Viewport";
import { PLANE_HEIGHT } from "../Canvas";

export const addEduContent = async (viewport: Viewport) => {
  const geo = new PlaneGeometry(180, 60);

  const mat = new MeshStandardMaterial({
    map: new TextureLoader().load("/textures/uoft.jpg"),
    blending: AdditiveBlending,
  });

  const mesh = new Mesh(geo, mat);

  const node = new ThreeDNode(mesh);

  const font = await loadFont("/fonts/helvetiker_regular.typeface.json");

  const t1 = createStandardText(font, "B.Sc. in Computer Science - 2019", {
    size: 10,
  });

  createTranslationAnimation({
    object: node.object,
    start: {
      x: 100,
      y: PLANE_HEIGHT / 2 + 10,
      z: 1,
    },
    end: { x: 0, y: PLANE_HEIGHT / 2 + 10, z: 1 },
    easing: TWEEN.Easing.Quadratic.InOut,
  }).start();

  createTranslationAnimation({
    object: t1.object,
    start: {
      x: -100,
      y: 30,
      z: 0,
    },
    end: { x: 10, y: 30, z: 0 },
    easing: TWEEN.Easing.Quadratic.InOut,
  }).start();

  viewport.addToContentGroup(node, t1);
  viewport.setMouseSpotLightTarget(node.object);
};
