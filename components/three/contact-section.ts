import { PLANE_HEIGHT, PLANE_WIDTH } from "components/Canvas";
import { createTranslationAnimation } from "engine/animations/text-animations";
import ThreeDNode from "engine/ThreeDNode";
import {
  AdditiveBlending,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  TextureLoader,
} from "three";
import { loadFont } from "../../engine/loaders/font-loader";
import Viewport from "../../engine/Viewport";
import TWEEN from "@tweenjs/tween.js";
import { createStandardText } from "engine/objects/StandardText";

export const addContactContent = async (viewport: Viewport) => {
  const font = await loadFont("/fonts/helvetiker_regular.typeface.json");

  const linkedInMesh = new Mesh(
    new PlaneGeometry(40, 40),
    new MeshStandardMaterial({
      map: new TextureLoader().load("/textures/linkedin.jpg"),
      blending: AdditiveBlending,
    })
  );

  const linkedInPic = new ThreeDNode(linkedInMesh);

  const githubMesh = new Mesh(
    new PlaneGeometry(40, 40),
    new MeshStandardMaterial({
      map: new TextureLoader().load("/textures/github.jpg"),
      blending: AdditiveBlending,
    })
  );

  const githubPic = new ThreeDNode(githubMesh);

  const linkedinLink = createStandardText(
    font,
    "https://www.linkedin.com/in/yufeng-li-567a3517a/",
    {
      size: 8,
    }
  );
  const githubLink = createStandardText(
    font,
    "https://github.com/derekli19951103",
    {
      size: 8,
    }
  );

  createTranslationAnimation({
    object: linkedInPic.object,
    start: {
      x: -PLANE_WIDTH / 2 - 80,
      y: PLANE_HEIGHT / 2 + 40,
      z: 0,
    },
    end: { x: -PLANE_WIDTH / 2 + 60, y: PLANE_HEIGHT / 2 + 40, z: 0 },
    easing: TWEEN.Easing.Linear.None,
    duration: 500,
  }).start();

  createTranslationAnimation({
    object: linkedinLink.object,
    start: {
      x: 200,
      y: PLANE_HEIGHT / 2 + 40,
      z: 0,
    },
    end: { x: -PLANE_WIDTH / 2 + 220, y: PLANE_HEIGHT / 2 + 40, z: 0 },
    easing: TWEEN.Easing.Linear.None,
    duration: 500,
  }).start();

  createTranslationAnimation({
    object: githubPic.object,
    start: {
      x: -PLANE_WIDTH / 2 - 80,
      y: PLANE_HEIGHT / 2 - 40,
      z: 0,
    },
    end: { x: -PLANE_WIDTH / 2 + 60, y: PLANE_HEIGHT / 2 - 40, z: 0 },
    easing: TWEEN.Easing.Linear.None,
    duration: 500,
  }).start();

  createTranslationAnimation({
    object: githubLink.object,
    start: {
      x: 200,
      y: PLANE_HEIGHT / 2 - 40,
      z: 0,
    },
    end: { x: -PLANE_WIDTH / 2 + 220, y: PLANE_HEIGHT / 2 - 40, z: 0 },
    easing: TWEEN.Easing.Linear.None,
    duration: 500,
  }).start();

  viewport.addToContentGroup(linkedInPic, linkedinLink, githubPic, githubLink);
};
