import TWEEN from "@tweenjs/tween.js";
import { Vector3 } from "three";
import { createTranslationAnimation } from "../../engine/animations/text-animations";
import { loadFont } from "../../engine/loaders/font-loader";
import { createStandardText } from "../../engine/objects/StandardText";
import { getRandomPointInInterval } from "../../engine/utils/math";
import Viewport from "../../engine/Viewport";
import { PLANE_HEIGHT } from "../Canvas";

export const addToolsContent = async (viewport: Viewport) => {
  const tools = [
    { title: "React", size: 18, pos: { x: -140, y: PLANE_HEIGHT / 2 + 3 } },
    { title: "Angular", size: 18, pos: { x: 130, y: PLANE_HEIGHT / 2 } },
    { title: "GraphQL", size: 12, pos: { x: -50, y: 100 } },
    { title: "Three.js", size: 12, pos: { x: 50, y: 100 } },
    { title: "Node.js", size: 12, pos: { x: 0, y: 20 } },
    { title: "Next.js", size: 12, pos: { x: 0, y: 135 } },
    { title: "Diesel", size: 12, pos: { x: -20, y: 50 } },
    {
      title: "Async-graphql",
      size: 18,
      pos: { x: -10, y: PLANE_HEIGHT / 2 },
    },
    { title: "MongoDB", size: 8, pos: { x: 60, y: 120 } },
    { title: "PostgreSQL", size: 10, pos: { x: 60, y: 50 } },
    { title: "Kubernetes", size: 8, pos: { x: 80, y: 25 } },
    { title: "Docker", size: 8, pos: { x: -60, y: 120 } },
    { title: "Mobx", size: 8, pos: { x: -60, y: 25 } },
    { title: "Spring Boot", size: 12, pos: { x: -100, y: 50 } },
  ];

  const font = await loadFont(
    "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json"
  );

  const nodes = tools.map((s) => {
    const { x, y } = s.pos;
    const t = createStandardText(font, s.title, { size: s.size });
    t.calculateWireframe(new Vector3(4, 3, 1));
    t.onRayCasted = (rayCasted) => {
      t.wire!.visible = rayCasted;
    };
    createTranslationAnimation({
      object: t.object,
      start: {
        x: getRandomPointInInterval(-500, 500) - x,
        y: y + getRandomPointInInterval(-300, 300),
        z: 200,
      },
      end: { x: x, y: y, z: 0 },
      easing: TWEEN.Easing.Linear.None,
      duration: getRandomPointInInterval(300, 500),
    }).start();

    return t;
  });

  viewport.addToContentGroup(...nodes);
};
