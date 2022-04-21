import {
  Color,
  CubeTextureLoader,
  GridHelper,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Plane,
  PlaneBufferGeometry,
  Raycaster,
  RepeatWrapping,
  Scene,
  SpotLight,
  sRGBEncoding,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { DragControls } from "three/examples/jsm/controls/DragControls";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import TNode from "./TNode";

export default class Viewport {
  scene: Scene;
  renderer: WebGLRenderer;
  camera: PerspectiveCamera;

  nodes: TNode[] = [];
  objectGroups: Group[] = [];
  selectedNodes: TNode[] = [];

  dragControls: DragControls;
  orbitControls: OrbitControls;

  grid: GridHelper;
  gridPlane: Plane = new Plane(new Vector3(0, 1, 0), 0);

  raycaster: Raycaster = new Raycaster();
  pointer: Vector2 = new Vector2();

  gridPlanePointerIntersect = new Vector3();

  movingGroup: Group = new Group();

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new Scene();
    this.renderer = new WebGLRenderer({
      canvas,
    });

    this.renderer.outputEncoding = sRGBEncoding;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;

    this.camera = new PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.camera.position.set(5, 5, 5);

    window.addEventListener(
      "mousemove",
      (e) => {
        this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      },
      false
    );

    window.addEventListener("click", (e) => {
      if (!this.nodes.some((n) => n.isRayCasted)) {
        this.nodes.forEach((n) => {
          n.isSelected = false;
        });
        this.selectedNodes = [];
      }
      this.nodes.forEach((n) => {
        if (n.isRayCasted) {
          if (this.selectedNodes.length >= 1) {
            if (e.shiftKey) {
              if (!n.isSelected) {
                this.selectedNodes.push(n);
              }
              n.isSelected = true;
            }
          } else {
            if (!n.isSelected) {
              this.selectedNodes.push(n);
            }
            n.isSelected = true;
          }
        }
      });
    });

    const hemiLight = new HemisphereLight(0xffeeb1, 0x080820, 4);
    this.scene.add(hemiLight);
    const light = new SpotLight(0xffa95c, 4);
    light.position.set(-50, 50, 50);
    light.castShadow = true;
    this.scene.add(light);

    this.scene.background = new CubeTextureLoader().load([
      "/textures/sky/right.jpg",
      "/textures/sky/left.jpg",
      "/textures/sky/top.jpg",
      "/textures/sky/bottom.jpg",
      "/textures/sky/front.jpg",
      "/textures/sky/back.jpg",
    ]);

    const textureLoader = new TextureLoader();
    const texture = textureLoader.load("/textures/gp.png");
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(50, 50);
    const geo = new PlaneBufferGeometry(200, 200, 1, 1);
    this.grid = new GridHelper(200, 200);
    const ground = new Mesh(
      geo,
      new MeshBasicMaterial({
        color: new Color(0xcccccc),
        map: texture,
      })
    );
    ground.receiveShadow = true;
    ground.position.y = -0.2;
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(this.grid, ground);

    this.orbitControls = new OrbitControls(this.camera, canvas);

    this.dragControls = new DragControls(
      this.objectGroups,
      this.camera,
      canvas
    );

    this.dragControls.addEventListener("dragstart", () => {
      this.orbitControls.enabled = false;

      // this.selectedNodes.forEach((node) => {
      //   this.movingGroup.add(node.boudingGroup);
      // });
    });

    this.dragControls.addEventListener("drag", (event) => {
      this.raycaster.ray.intersectPlane(
        this.gridPlane,
        this.gridPlanePointerIntersect
      );

      if (event.object.parent.isGroup) {
        event.object.parent.position.set(
          this.gridPlanePointerIntersect.x,
          event.object.parent.position.y,
          this.gridPlanePointerIntersect.z
        );
      } else {
        event.object.position.set(
          this.gridPlanePointerIntersect.x,
          event.object.position.y,
          this.gridPlanePointerIntersect.z
        );
      }
    });

    this.dragControls.addEventListener("dragend", () => {
      this.orbitControls.enabled = true;
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);

    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  add(...nodes: TNode[]) {
    const objects = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.object) {
        objects.push(node.boudingGroup);
      }
    }
    this.objectGroups.push(...objects);
    this.nodes.push(...nodes);
    this.scene.add(...objects);
  }

  render() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.renderer.render(this.scene, this.camera);
    this.nodes.forEach((n) => {
      if (n.boudingGroup) {
        const intersect = this.raycaster.intersectObjects([n.boudingGroup]);
        if (intersect.length) {
          n.isRayCasted = true;
          if (!n.isSelected && !n.isHovered) {
            n.isHovered = true;
          }
        } else {
          n.isRayCasted = false;
          if (!n.isSelected && n.isHovered) {
            n.isHovered = false;
          }
        }
      }
    });

    requestAnimationFrame(this.render.bind(this));
  }
}
