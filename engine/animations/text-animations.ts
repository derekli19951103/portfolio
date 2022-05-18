import TWEEN from "@tweenjs/tween.js";
import { Mesh } from "three";
import { Coord3 } from "../../types/utils";

export const createTranslationAnimation = (params: {
  object: Mesh;
  start: Coord3;
  end: Coord3;
  easing: (amount: number) => number;
  duration?: number;
}) => {
  const { start, end, easing, object } = params;

  return new TWEEN.Tween(start)
    .to(end, params.duration)
    .easing(easing)
    .onUpdate((coords) => {
      object.position.set(coords.x, coords.y, coords.z);
    });
};
