import {
  ACESFilmicToneMapping,
  AmbientLight,
  CubeTextureLoader,
  HemisphereLight,
  MathUtils,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
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
import { OrbitControls } from "../engine/three/OrbitControls";
import ThreeDNode from "./ThreeDNode";
import { Water } from "three/examples/jsm/objects/Water.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

import { LuminosityShader } from "three/examples/jsm/shaders/LuminosityShader.js";
import { SobelOperatorShader } from "three/examples/jsm/shaders/SobelOperatorShader.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

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

  terminalRef: HTMLDivElement;

  constructor(props: {
    canvas: HTMLCanvasElement;
    width?: number;
    height?: number;
    stats?: Stats;
    terminalRef: HTMLDivElement;
  }) {
    const { canvas, width, height, stats, terminalRef } = props;

    this.stats = stats;
    this.terminalRef = terminalRef;

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

    canvas.addEventListener("click", (e) => {
      const plane = this.nodes.find((n) => n.object.userData.isPlane);
      this.nodes.forEach((n) => {
        if (n.isRayCasted) {
          n.setSelected(!n.isSelected);

          this.camera.position.set(
            this.facingCameraPos[0],
            this.facingCameraPos[1],
            this.facingCameraPos[2]
          );
          if (plane) {
            plane.object.userData.needsRaising = true;
          }
        }
      });
    });

    canvas.addEventListener("contextmenu", (e) => {
      const plane = this.nodes.find((n) => n.object.userData.isPlane);
      this.nodes.forEach((n) => {
        n.setSelected(false);
      });
      this.terminalRef.setAttribute("style", "display:none;");
      this.camera.position.set(
        this.originalCameraPos[0],
        this.originalCameraPos[1],
        this.originalCameraPos[2]
      );
      if (plane) {
        plane.object.userData.needsRaising = false;
      }
    });

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
  }

  add(...nodes: ThreeDNode[]) {
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

  animatePlane() {
    const plane = this.nodes.find((n) => n.object.userData.isPlane);
    if (plane) {
      if (plane.object.userData.needsRaising) {
        if (plane.object.position.y < 0) {
          plane.object.position.y += 1;
        } else {
          this.terminalRef.setAttribute(
            "style",
            "display:block; position:absolute; top: 132px; left: calc(50vw - 300px)"
          );
        }
        this.nodes.forEach((n) => {
          if (n.object.userData.isName) {
            if (n.object.position.y < 130) {
              n.object.position.y += 1;
            }
          }
        });
      } else {
        if (plane.object.position.y > -126) {
          plane.object.position.y -= 1;
        }
        this.nodes.forEach((n) => {
          if (n.object.userData.isName) {
            if (n.object.position.y > 5) {
              n.object.position.y -= 1;
            }
          }
        });
      }
    }
  }

  render() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.stats?.update();
    this.water.material.uniforms["time"].value += 1.0 / 60.0;

    // console.log(this.camera.position);
    // console.log(this.camera.rotation.x);
    // console.log(this.camera.rotation.y);
    // console.log(this.camera.rotation.z);
    this.animateName();
    this.animatePlane();

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
