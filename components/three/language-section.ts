import { createTranslationAnimation } from "../../engine/animations/text-animations";
import { loadFont } from "../../engine/loaders/font-loader";
import { createDupText } from "../../engine/objects/DupText";
import Viewport from "../../engine/Viewport";
import { PLANE_HEIGHT, PLANE_WIDTH } from "../Canvas";
import TWEEN from "@tweenjs/tween.js";

export const addLangContent = async (viewport: Viewport) => {
  const langs = [
    {
      title: "Typescript",
      size: 18,
      pos: { x: -PLANE_WIDTH / 2 + 20, y: PLANE_HEIGHT - 20 },
    },
    {
      title: "Rust",
      size: 18,
      pos: { x: -PLANE_WIDTH / 2 + 20, y: PLANE_HEIGHT - 50 },
    },
    {
      title: "Python",
      size: 12,
      pos: { x: -PLANE_WIDTH / 2 + 20, y: PLANE_HEIGHT - 80 },
    },
    {
      title: "Java",
      size: 12,
      pos: { x: -PLANE_WIDTH / 2 + 20, y: PLANE_HEIGHT - 100 },
    },
    {
      title: "SQL",
      size: 12,
      pos: { x: -PLANE_WIDTH / 2 + 20, y: PLANE_HEIGHT - 125 },
    },
  ];

  const font = await loadFont("/fonts/helvetiker_regular.typeface.json");

  const nodes = langs.map((s, i) => {
    const { x, y } = s.pos;
    const t = createDupText(font, s.title, { size: s.size });
    const xcaliber = x + t.size.x / 2;

    createTranslationAnimation({
      object: t.object,
      start: {
        x: xcaliber,
        y: y - 200 - i * 30,
        z: t.object.position.z,
      },
      end: { x: xcaliber, y: y, z: t.object.position.z },
      easing: TWEEN.Easing.Linear.None,
    }).start();

    return t;
  });

  viewport.addToContentGroup(...nodes);
};
