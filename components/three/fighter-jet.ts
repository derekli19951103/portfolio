import { loadObj } from "engine/loaders/OBJLoader";
import ThreeDNode from "engine/ThreeDNode";
import { Mesh } from "three";
import Viewport from "../../engine/Viewport";

export const addFighterJetGame = async (viewport: Viewport) => {
  const mesh = new Mesh();
  mesh.add(await loadObj("/models/jet.obj"));
  mesh.rotation.set(Math.PI / 2, 0, 0);
  mesh.scale.set(1.5, 1.5, 1.5);
  const node = new ThreeDNode(mesh);
  node.object.userData = { isFightJet: true };

  viewport.addToContentGroup(node);
};
