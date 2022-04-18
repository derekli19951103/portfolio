import {
  Camera,
  Color,
  GridHelper,
  Object3D,
  PerspectiveCamera,
  Plane,
  Raycaster,
  Scene,
  sRGBEncoding,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { DragControls } from "three/examples/jsm/controls/DragControls";

export default class Viewport {
  scene: Scene;
  renderer: WebGLRenderer;
  camera: Camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  objects: Object3D[] = [];
  dragControls: DragControls | undefined;
  orbitControls: OrbitControls | undefined;

  grid: GridHelper | undefined;
  gridPlane: Plane = new Plane(new Vector3(0, 1, 0), 0);

  raycaster: Raycaster = new Raycaster();
  pointer: Vector2 = new Vector2();

  gridPlanePointerIntersect = new Vector3();

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new Scene();
    this.renderer = new WebGLRenderer({
      canvas,
    });

    this.renderer.outputEncoding = sRGBEncoding;

    this.camera.position.set(5, 5, 5);

    window.addEventListener(
      "mousemove",
      (e) => {
        this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      },
      false
    );

    this.scene.background = new Color(255, 255, 255);

    this.grid = new GridHelper(200, 200);
    this.scene.add(this.grid);

    this.orbitControls = new OrbitControls(this.camera, canvas);
    this.dragControls = new DragControls(this.objects, this.camera, canvas);

    this.dragControls!.addEventListener("dragstart", () => {
      this.orbitControls!.enabled = false;
    });

    this.dragControls.addEventListener("drag", (event) => {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      this.raycaster.ray.intersectPlane(
        this.gridPlane,
        this.gridPlanePointerIntersect
      );

      if (event.object.parent.isGroup) {
        event.object.parent.position.set(
          this.gridPlanePointerIntersect.x,
          this.gridPlanePointerIntersect.y,
          this.gridPlanePointerIntersect.z
        );
      } else {
        event.object.position.set(
          this.gridPlanePointerIntersect.x,
          this.gridPlanePointerIntersect.y,
          this.gridPlanePointerIntersect.z
        );
      }
    });

    this.dragControls!.addEventListener("dragend", () => {
      this.orbitControls!.enabled = true;
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.renderer.render(this.scene, this.camera);
  }

  add(...objects: Object3D[]) {
    this.objects.push(...objects);
    this.scene.add(...objects);
  }

  render() {
    this.renderer.render(this.scene, this.camera);

    requestAnimationFrame(this.render.bind(this));
  }
}
