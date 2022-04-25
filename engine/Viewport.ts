import {
  Color,
  CubeTextureLoader,
  GridHelper,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  Object3D,
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
  objectGroups: Object3D[] = [];
  selectedNodes: TNode[] = [];

  orbitControls: OrbitControls;

  grid: GridHelper;
  gridPlane: Plane = new Plane(new Vector3(0, 1, 0), 0);

  raycaster: Raycaster = new Raycaster();
  pointer: Vector2 = new Vector2();

  gridPlanePointerIntersect = new Vector3();

  movingGroup: Group = new Group();

  width: number;
  height: number;

  dragging: boolean = false;
  dragStartPoint: Vector3 = new Vector3();
  dragNodesInitPos: Vector3[] = [];

  constructor(canvas: HTMLCanvasElement, width?: number, height?: number) {
    this.scene = new Scene();
    this.renderer = new WebGLRenderer({
      canvas,
    });

    this.renderer.outputEncoding = sRGBEncoding;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;

    this.width = width || window.innerWidth;
    this.height = height || window.innerHeight;

    this.camera = new PerspectiveCamera(
      75,
      this.width / this.height,
      0.1,
      1000
    );

    this.camera.position.set(5, 5, 5);

    canvas.addEventListener(
      "mousemove",
      (e) => {
        this.pointer.x = (e.clientX / this.width) * 2 - 1;
        this.pointer.y = -(e.clientY / this.height) * 2 + 1;
      },
      false
    );

    canvas.addEventListener("click", (e) => {
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
                n.isSelected = true;
              } else {
                this.selectedNodes = this.selectedNodes.filter(
                  (sn) => sn !== n
                );
                n.isSelected = false;
              }
            } else {
              if (this.selectedNodes.length === 1) {
                this.selectedNodes[0].isSelected = false;
                this.selectedNodes = [n];
                n.isSelected = true;
              }
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

    canvas.addEventListener("mousedown", (e) => {
      if (
        this.selectedNodes.length > 0 &&
        this.selectedNodes.some((n) => n.isRayCasted)
      ) {
        this.dragging = true;
        this.orbitControls.enabled = false;

        this.raycaster.ray.intersectPlane(this.gridPlane, this.dragStartPoint);

        this.dragNodesInitPos = this.selectedNodes.map((n) =>
          n.object.position.clone()
        );
      }
    });

    canvas.addEventListener("mousemove", () => {
      this.raycaster.ray.intersectPlane(
        this.gridPlane,
        this.gridPlanePointerIntersect
      );

      if (this.dragging) {
        const diff = new Vector3().subVectors(
          this.gridPlanePointerIntersect,
          this.dragStartPoint
        );

        this.selectedNodes.forEach((node, i) => {
          node.object.position.set(
            diff.x + this.dragNodesInitPos[i].x,
            this.dragNodesInitPos[i].y,
            diff.z + this.dragNodesInitPos[i].z
          );

          node.object.updateMatrixWorld();
        });
      }
    });

    canvas.addEventListener("mouseup", (e) => {
      this.dragging = false;
      this.orbitControls.enabled = true;
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

    this.renderer.setSize(this.width, this.height);

    window.addEventListener("resize", () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;

      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(this.width, this.height);
    });
  }

  add(...nodes: TNode[]) {
    const objects = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.object) {
        objects.push(node.object);
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
      if (n.object) {
        const intersect = this.raycaster.intersectObjects([n.object]);
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
