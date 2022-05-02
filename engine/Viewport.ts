import {
  ACESFilmicToneMapping,
  Color,
  CubeCamera,
  CubeTextureLoader,
  EquirectangularReflectionMapping,
  GridHelper,
  HalfFloatType,
  HemisphereLight,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Plane,
  PlaneBufferGeometry,
  Raycaster,
  RepeatWrapping,
  Scene,
  sRGBEncoding,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLCubeRenderTarget,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { TransformControls } from "../engine/three/TransformControls";
import TNode from "./TNode";

export default class Viewport {
  scene: Scene;
  renderer: WebGLRenderer;
  camera: PerspectiveCamera;

  nodes: TNode[] = [];
  selectedNodes: TNode[] = [];

  orbitControls: OrbitControls;
  transformControls: TransformControls;

  grid: GridHelper;
  gridPlane: Plane = new Plane(new Vector3(0, 1, 0), 0);

  raycaster: Raycaster = new Raycaster();
  pointer: Vector2 = new Vector2();

  gridPlanePointerIntersect = new Vector3();

  width: number;
  height: number;
  private fixed: boolean = false;

  private dragging: boolean = false;
  private dragStartPoint: Vector3 = new Vector3();
  private dragNodesInitPos: Vector3[] = [];

  private transforming: boolean = false;

  cubeRenderTarget: WebGLCubeRenderTarget;
  cubeCamera: CubeCamera;

  constructor(canvas: HTMLCanvasElement, width?: number, height?: number) {
    this.scene = new Scene();
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
    });

    this.renderer.outputEncoding = sRGBEncoding;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = ACESFilmicToneMapping;

    this.width = width || window.innerWidth;
    this.height = height || window.innerHeight;
    if (width && height) {
      this.fixed = true;
    }

    this.camera = new PerspectiveCamera(45, this.width / this.height, 0.1, 600);

    this.camera.position.set(5, 5, 5);

    this.scene.add(this.camera);

    canvas.addEventListener(
      "mousemove",
      (e) => {
        this.pointer.x = (e.clientX / this.width) * 2 - 1;
        this.pointer.y = -(e.clientY / this.height) * 2 + 1;
      },
      false
    );

    this.orbitControls = new OrbitControls(this.camera, canvas);
    this.orbitControls.listenToKeyEvents(canvas);
    this.orbitControls.keyPanSpeed = 100;

    this.transformControls = new TransformControls(this.camera, canvas);

    this.transformControls.addEventListener("dragging-changed", (e) => {
      this.transforming = e.value;
      this.orbitControls.enabled = !e.value;
      console.log(e);
    });

    this.scene.add(this.transformControls);

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

      if (this.dragging && !this.transforming) {
        const diff = new Vector3().subVectors(
          this.gridPlanePointerIntersect,
          this.dragStartPoint
        );

        this.selectedNodes.forEach((node, i) => {
          node.object.position.set(
            diff.x + this.dragNodesInitPos[i].x,
            diff.y + this.dragNodesInitPos[i].y,
            diff.z + this.dragNodesInitPos[i].z
          );
        });
      }
    });

    canvas.addEventListener("mouseup", (e) => {
      this.dragging = false;
      this.orbitControls.enabled = true;
    });

    canvas.addEventListener("keydown", (e) => {
      if (this.selectedNodes.length > 0) {
        switch (e.code) {
          case "KeyR": {
            this.transformControls.setMode("rotate");
            //@ts-ignore
            this.transformControls.showX = false;
            //@ts-ignore
            this.transformControls.showZ = false;
            break;
          }
          case "KeyT": {
            this.transformControls.setMode("translate");
            //@ts-ignore
            this.transformControls.showX = true;
            //@ts-ignore
            this.transformControls.showZ = true;
            break;
          }
        }
      }
    });

    const hemiLight = new HemisphereLight(0xffeeb1, 0x080820, 4);
    this.scene.add(hemiLight);

    this.scene.background = new CubeTextureLoader().load([
      "/textures/sky/right.jpg",
      "/textures/sky/left.jpg",
      "/textures/sky/top.jpg",
      "/textures/sky/bottom.jpg",
      "/textures/sky/front.jpg",
      "/textures/sky/back.jpg",
    ]);

    this.cubeRenderTarget = new WebGLCubeRenderTarget(256, {
      generateMipmaps: true,
      minFilter: LinearMipmapLinearFilter,
    });
    // this.cubeRenderTarget.texture.type = HalfFloatType;

    this.cubeCamera = new CubeCamera(1, 1000, this.cubeRenderTarget);

    this.scene.add(this.cubeCamera);

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
      })
    );
    ground.receiveShadow = true;
    ground.position.y -= 0.2;
    ground.rotation.x -= Math.PI / 2;
    this.scene.add(this.grid, ground);

    this.renderer.setSize(this.width, this.height);

    window.addEventListener("resize", () => {
      if (!this.fixed) {
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(this.width, this.height);
      }
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

    this.nodes.push(...nodes);
    this.scene.add(...objects);
  }

  public enableTransformControls(node: TNode) {
    this.transformControls.attach(node.object);
  }

  public disableTransformControls() {
    this.transformControls.detach();
  }

  render() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.cubeCamera.update(this.renderer, this.scene);
    this.renderer.render(this.scene, this.camera);
    this.nodes.forEach((n) => {
      const subsets: Mesh[] = [];
      n.object.traverse((o) => {
        //@ts-ignore
        if (o.isMesh) {
          subsets.push(o as Mesh);
        }
      });
      const intersect = this.raycaster.intersectObjects([n.object], false);
      const subsetIntersect = this.raycaster.intersectObjects(subsets, false);
      if (intersect.length || subsetIntersect.length) {
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
    });

    requestAnimationFrame(this.render.bind(this));
  }
}
