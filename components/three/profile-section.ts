import TWEEN from "@tweenjs/tween.js";
import { createTranslationAnimation } from "../../engine/animations/text-animations";
import { loadFont } from "../../engine/loaders/font-loader";
import { createWireframeText } from "../../engine/objects/WireframeText";
import Viewport from "../../engine/Viewport";
import { PLANE_HEIGHT } from "../Canvas";

export const addProfileText = async (viewport: Viewport) => {
  const font = await loadFont(
    "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json"
  );

  const t1 = createWireframeText(font, "Fullstack");
  const t2 = createWireframeText(font, "Developer");

  createTranslationAnimation({
    object: t1.object,
    start: {
      x: -100,
      y: PLANE_HEIGHT / 2 + 20,
      z: 0,
    },
    end: { x: 0, y: PLANE_HEIGHT / 2 + 20, z: 0 },
    easing: TWEEN.Easing.Quadratic.InOut,
  }).start();

  createTranslationAnimation({
    object: t2.object,
    start: {
      x: 100,
      y: PLANE_HEIGHT / 4 + 20,
      z: 0,
    },
    end: { x: 0, y: PLANE_HEIGHT / 4 + 20, z: 0 },
    easing: TWEEN.Easing.Quadratic.InOut,
  }).start();

  viewport.addToContentGroup(t1, t2);
};
