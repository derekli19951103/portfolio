import { PLANE_HEIGHT } from "constant";
import ThreeDNode from "engine/ThreeDNode";
import { BoxGeometry, Mesh, MeshStandardMaterial, TextureLoader } from "three";
import Viewport from "../../engine/Viewport";

const BoxDim = 60;

export const addResumeContent = async (viewport: Viewport) => {
  const boxGeo = new BoxGeometry(BoxDim, BoxDim, BoxDim);
  const material = new MeshStandardMaterial({
    map: new TextureLoader().load("/textures/resume.png"),
  });

  const cube = new Mesh(boxGeo, material);

  const node = new ThreeDNode(cube);

  node.onSelected = (selected) => {
    if (selected) {
      window.open("/Resume.pdf");
    }
  };

  node.object.position.set(0, PLANE_HEIGHT / 2, 0);
  node.object.userData = { isRotatingCube: true };

  viewport.addToContentGroup(node);
};
