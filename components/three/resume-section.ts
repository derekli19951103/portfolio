import TWEEN from "@tweenjs/tween.js";
import { createDupText } from "engine/objects/DupText";
import { BoxGeometry, RawShaderMaterial } from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";
import { Coord2 } from "types/utils";
import { createTranslationAnimation } from "../../engine/animations/text-animations";
import { loadFont } from "../../engine/loaders/font-loader";
import Viewport from "../../engine/Viewport";
import { PLANE_HEIGHT, PLANE_WIDTH } from "../Canvas";




export const addResumeContent = async (viewport: Viewport) => {
 

  const font = await loadFont("/fonts/helvetiker_regular.typeface.json");

  const fontGeo = new TextGeometry('RESUME', {
    font,
    size: 20,
   
    bevelEnabled: false,
  });
  const fontMatreial =new RawShaderMaterial(   )

  const boxGeo = new BoxGeometry(1,1,1)
  const material = 

  const nodes = langs.map((s, i) => {
    const { x, y } = s.pos;
    const t = createDupText(font, s.title, { size: 18 });

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
