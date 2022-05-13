import {
  ACESFilmicToneMapping,
  AmbientLight,
  CubeTextureLoader,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Raycaster,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  sRGBEncoding,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import Stats from "three/examples/jsm/libs/stats.module";
import { Water } from "three/examples/jsm/objects/Water.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { LuminosityShader } from "three/examples/jsm/shaders/LuminosityShader.js";
import { SobelOperatorShader } from "three/examples/jsm/shaders/SobelOperatorShader.js";
import { OrbitControls } from "../engine/three/OrbitControls";
import ThreeDNode from "./ThreeDNode";

export default class Viewport {
  scene: Scene;
  renderer: WebGLRenderer;
  camera: PerspectiveCamera;

  originalCameraPos = [-70, 12, 110];
  facingCameraPos = [0, 0, 300];

  water: Water;

  composer: EffectComposer;
  effectSobel: ShaderPass;

  nodes: ThreeDNode[] = [];

  orbitControls: OrbitControls;

  raycaster: Raycaster = new Raycaster();
  pointer: Vector2 = new Vector2();

  width: number;
  height: number;
  private fixed: boolean = false;

  private stats: Stats | undefined;

  plane: ThreeDNode | undefined;
  needsRaising = false;
  raised = false;

  constructor(props: {
    canvas: HTMLCanvasElement;
    width?: number;
    height?: number;
    stats?: Stats;
  }) {
    const { canvas, width, height, stats } = props;

    this.stats = stats;

    this.scene = new Scene();
    this.renderer = new WebGLRenderer({
      canvas,
    });

    this.renderer.outputEncoding = sRGBEncoding;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.toneMapping = ACESFilmicToneMapping;

    this.width = width || window.innerWidth;
    this.height = height || window.innerHeight;
    if (width && height) {
      this.fixed = true;
    }

    this.renderer.setSize(this.width, this.height);

    this.camera = new PerspectiveCamera(55, this.width / this.height, 1, 20000);

    this.camera.position.set(
      this.originalCameraPos[0],
      this.originalCameraPos[1],
      this.originalCameraPos[2]
    );

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
    this.orbitControls.maxPolarAngle = Math.PI * 0.495;
    this.orbitControls.minDistance = 40.0;
    this.orbitControls.maxDistance = 300;
    this.orbitControls.enablePan = false;
    this.orbitControls.enableRotate = true;
    this.orbitControls.enableDamping = true;

    this.scene.background = new CubeTextureLoader().load([
      "/textures/sky/square.png",
      "/textures/sky/square.png",
      "/textures/sky/square.png",
      "/textures/sky/square.png",
      "/textures/sky/square.png",
      "/textures/sky/square.png",
    ]);

    const waterGeometry = new PlaneGeometry(10000, 10000);

    this.water = new Water(waterGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new TextureLoader().load(
        "/textures/waternormals.jpg",
        (texture) => {
          texture.wrapS = texture.wrapT = RepeatWrapping;
        }
      ),
      sunDirection: new Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 1,
      fog: this.scene.fog !== undefined,
    });

    this.water.rotation.x = -Math.PI / 2;

    this.scene.add(this.water);

    const ambientLight = new AmbientLight(0xcccccc, 0.4);
    this.scene.add(ambientLight);

    const pointLight = new PointLight(0xffffff, 0.8);
    this.camera.add(pointLight);

    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);

    const effectGrayScale = new ShaderPass(LuminosityShader);

    // you might want to use a gaussian blur filter before
    // the next pass to improve the result of the Sobel operator

    // Sobel operator

    this.effectSobel = new ShaderPass(SobelOperatorShader);
    this.effectSobel.uniforms["resolution"].value.x =
      window.innerWidth * window.devicePixelRatio;
    this.effectSobel.uniforms["resolution"].value.y =
      window.innerHeight * window.devicePixelRatio;

    const bloomPass = new UnrealBloomPass(
      new Vector2(this.width, this.height),
      1,
      1,
      0.4
    );

    this.composer.addPass(renderPass);
    this.composer.addPass(effectGrayScale);
    this.composer.addPass(this.effectSobel);
    this.composer.addPass(bloomPass);

    window.addEventListener("resize", () => {
      if (!this.fixed) {
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(this.width, this.height);
        this.composer.setSize(this.width, this.height);

        this.effectSobel.uniforms["resolution"].value.x =
          this.width * window.devicePixelRatio;
        this.effectSobel.uniforms["resolution"].value.y =
          this.height * window.devicePixelRatio;
      }
    });

    canvas.addEventListener("click", (e) => {
      this.nodes.forEach((n) => {
        if (n.isRayCasted) {
          n.setSelected(!n.isSelected);

          if (!this.raised) {
            this.camera.position.set(
              this.originalCameraPos[0],
              this.originalCameraPos[1],
              this.originalCameraPos[2]
            );
            this.needsRaising = true;
          }
        }
      });
    });

    canvas.addEventListener("contextmenu", (e) => {
      this.nodes.forEach((n) => {
        n.setSelected(false);
      });

      if (this.raised) {
        this.camera.position.set(
          this.facingCameraPos[0],
          this.facingCameraPos[1],
          this.facingCameraPos[2]
        );
        this.needsRaising = false;
      }
    });
  }

  add(...nodes: ThreeDNode[]) {
    const objects = [];
    for (let i = 0; i < nodes.length; i++) {
      objects.push(nodes[i].object);
    }

    this.nodes.push(...nodes);
    this.scene.add(...objects);
  }

  addPlane(node: ThreeDNode) {
    this.plane = node;
    this.scene.add(node.object);
  }

  animateName() {
    const time = Date.now() * 0.001;
    this.nodes.forEach((n) => {
      if (n.object.userData.isName) {
        if (n.isRayCasted || n.isSelected) {
          (n.object.material as ShaderMaterial).uniforms.amplitude.value =
            1.0 + Math.sin(time * 0.5);
        } else {
          (n.object.material as ShaderMaterial).uniforms.amplitude.value = 0;
        }
      }
    });
  }

  raisingAnimations() {
    if (this.plane) {
      if (this.needsRaising) {
        if (this.plane.object.position.y < 0) {
          this.plane.object.position.y += 1;
        } else {
          this.raised = true;
        }
        this.nodes.forEach((n, i) => {
          if (n.object.userData.isName) {
            if (!this.raised) {
              n.object.position.y += 1;
              n.object.position.x += 1 * i * 0.1 - 1;
            }
          }
        });
      } else {
        if (this.plane.object.position.y > -this.plane.size.y / 2 - 1) {
          this.plane.object.position.y -= 1;
        } else {
          this.raised = false;
        }
        this.nodes.forEach((n, i) => {
          if (n.object.userData.isName) {
            if (this.raised) {
              n.object.position.y -= 1;
              n.object.position.x += 1 - 1 * i * 0.1;
            }
          }
        });
      }
    }
  }

  animateCamera() {
    if (this.plane) {
      const seg = this.plane.size.y / 2;
      if (!this.raised && this.needsRaising) {
        this.camera.position.x +=
          (this.facingCameraPos[0] - this.originalCameraPos[0]) / seg;
        this.camera.position.y +=
          (this.facingCameraPos[1] - this.originalCameraPos[1]) / seg;
        this.camera.position.z +=
          (this.facingCameraPos[2] - this.originalCameraPos[2]) / seg;
      } else if (this.raised && !this.needsRaising) {
        this.camera.position.x +=
          (this.originalCameraPos[0] - this.facingCameraPos[0]) / seg;
        this.camera.position.y +=
          (this.originalCameraPos[1] - this.facingCameraPos[1]) / seg;
        this.camera.position.z +=
          (this.originalCameraPos[2] - this.facingCameraPos[2]) / seg;
      }
    }
  }

  render() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.stats?.update();
    this.water.material.uniforms["time"].value += 1.0 / 60.0;

    this.animateName();
    this.raisingAnimations();
    this.animateCamera();

    this.orbitControls.update();

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
      } else {
        n.isRayCasted = false;
      }
    });

    // this.renderer.render(this.scene, this.camera);
    this.composer.render();
    requestAnimationFrame(this.render.bind(this));
  }
}
