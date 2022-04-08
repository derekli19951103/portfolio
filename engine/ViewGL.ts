import {
  Camera,
  Color,
  Object3D,
  PerspectiveCamera,
  Scene,
  sRGBEncoding,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export default class ViewGL {
  scene: Scene;
  renderer: WebGLRenderer;
  camera: Camera;
  objects: Object3D[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new Scene();
    this.renderer = new WebGLRenderer({
      canvas,
    });
    this.camera = new PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer.outputEncoding = sRGBEncoding;
    this.renderer.physicallyCorrectLights = true;

    this.scene.background = new Color(255, 255, 255);

    new OrbitControls(this.camera, canvas);

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  add(...objects: Object3D[]) {
    this.objects.push(...objects);
    this.scene.add(...objects);
  }

  render() {
    this.renderer.render(this.scene, this.camera);

    requestAnimationFrame(this.render.bind(this));
  }

  animationLoop() {
    this.renderer.render(this.scene, this.camera);

    for (let object of this.objects) {
      object.rotation.x += 0.01;
      object.rotation.y += 0.03;
    }

    requestAnimationFrame(this.animationLoop.bind(this));
  }
}
