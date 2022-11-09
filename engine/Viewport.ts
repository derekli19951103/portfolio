import TWEEN, { Easing } from "@tweenjs/tween.js";
import { addContactContent } from "components/three/contact-section";
import { addIntroContent } from "components/three/intro-section";
import {
  ACESFilmicToneMapping,
  AmbientLight,
  CubeTextureLoader,
  Group,
  Mesh,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SpotLight,
  SpotLightHelper,
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
import { PLANE_HEIGHT } from "../components/Canvas";
import { addEduContent } from "../components/three/education-section";
import { addProfileText } from "../components/three/profile-section";
import { addToolsContent } from "../components/three/tools-section";
import { OrbitControls } from "../engine/three/OrbitControls";
import ThreeDNode from "./ThreeDNode";

export default class Viewport {
  scene: Scene;
  renderer: WebGLRenderer;
  camera: PerspectiveCamera;

  originalCameraPos = new Vector3(-70, 12, 120);
  facingCameraPos = new Vector3(0, PLANE_HEIGHT / 2, 220);

  water: Water;

  composer: EffectComposer;
  effectSobel: ShaderPass;

  nodes: ThreeDNode[] = [];

  orbitControls: OrbitControls;

  raycaster: Raycaster = new Raycaster();
  pointer: Vector2 = new Vector2();
  mouseSpotLight: SpotLight;

  width: number;
  height: number;
  private fixed: boolean = false;

  private stats?: Stats;

  plane?: ThreeDNode;

  raised = false;

  selectedTabIndex?: number;
  displayContent = new Group();

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
      antialias: true,
    });

    this.scene.add(this.displayContent);

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

    this.camera.position.copy(this.originalCameraPos);

    this.scene.add(this.camera);

    const ambientLight = new AmbientLight(0xcccccc, 0.4);
    this.scene.add(ambientLight);

    const mouseLightZHeight = 50;
    this.mouseSpotLight = new SpotLight(
      0xffffff,
      10,
      mouseLightZHeight + 10,
      Math.PI / 2
    );
    this.scene.add(this.mouseSpotLight);
    this.mouseSpotLight.position.set(0, 0, mouseLightZHeight);
    const lightHelper = new SpotLightHelper(this.mouseSpotLight);
    this.scene.add(lightHelper);

    canvas.addEventListener("mousemove", (e) => {
      this.pointer.x = (e.clientX / this.width) * 2 - 1;
      this.pointer.y = -(e.clientY / this.height) * 2 + 1;

      const vector = new Vector3(this.pointer.x, this.pointer.y, 0.5);
      vector.unproject(this.camera);
      const dir = vector.sub(this.camera.position).normalize();
      const distance = -this.camera.position.z / dir.z;
      const pos = this.camera.position
        .clone()
        .add(dir.multiplyScalar(distance));
      this.mouseSpotLight.position.copy(
        new Vector3(pos.x, pos.y, pos.z + mouseLightZHeight)
      );
    });

    this.orbitControls = new OrbitControls(this.camera, canvas);
    this.orbitControls.listenToKeyEvents(canvas);
    this.orbitControls.maxPolarAngle = Math.PI * 0.495;
    this.orbitControls.minDistance = 40.0;
    this.orbitControls.maxDistance = 350;
    this.orbitControls.enablePan = false;
    this.orbitControls.enableRotate = true;
    this.orbitControls.enableDamping = true;

    this.scene.background = new CubeTextureLoader().load([
      "/textures/sky/right.png",
      "/textures/sky/left.png",
      "/textures/sky/top.png",
      "/textures/sky/bottom.png",
      "/textures/sky/front.png",
      "/textures/sky/back.png",
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

    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);

    const effectGrayScale = new ShaderPass(LuminosityShader);

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
          if (n.object.userData.isName) {
            const nameIndex = n.object.userData.nameIndex;

            if (!this.raised) {
              this.camera.position.copy(this.originalCameraPos);
              this.raisingAnimations();
            } else {
              if (this.selectedTabIndex !== nameIndex) {
                this.removeFromContentGroup();

                this.switchContent(nameIndex);
              }
            }

            this.selectedTabIndex = nameIndex;
          }

          if (n.object.userData.type === "linkedin") {
            window.open("https://www.linkedin.com/in/yufeng-li-567a3517a/");
          }
          if (n.object.userData.type === "github") {
            window.open("https://github.com/derekli19951103");
          }
        }
      });
    });

    const loweringActions = () => {
      this.nodes.forEach((n) => {
        n.setSelected(false);
      });

      if (this.raised) {
        this.camera.position.copy(this.facingCameraPos);
        this.lowerAnimations();

        this.selectedTabIndex = undefined;

        this.removeFromContentGroup();
      }
    };

    canvas.addEventListener("contextmenu", loweringActions);

    let tapedTwice = false;

    canvas.addEventListener("touchstart", (event) => {
      if (!tapedTwice) {
        tapedTwice = true;
        setTimeout(function () {
          tapedTwice = false;
        }, 300);
        return false;
      }
      event.preventDefault();
      //action on double tap goes below
      loweringActions();
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

  addToContentGroup(...nodes: ThreeDNode[]) {
    const objects = [];
    for (let i = 0; i < nodes.length; i++) {
      objects.push(nodes[i].object);
    }

    this.nodes.push(...nodes);
    this.displayContent.add(...objects);
  }

  removeFromContentGroup() {
    const uuids: string[] = [];
    this.displayContent.traverse((c) => {
      uuids.push(c.uuid);
    });
    this.nodes = this.nodes.filter((n) => !uuids.includes(n.object.uuid));
    this.displayContent.clear();
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

  lowerAnimations() {
    if (this.plane) {
      const planeHeight = this.plane.size.y;

      const origPos: { [key: number]: Vector3 } = {};

      this.nodes.forEach((n) => {
        if (n.object.userData.isName) {
          origPos[n.object.userData.nameIndex] = n.object.position.clone();
        }
      });

      new TWEEN.Tween({ height: planeHeight / 2 })
        .to({ height: -planeHeight / 2 - 0.1 })
        .easing(Easing.Linear.None)
        .onUpdate(({ height }, elapsed) => {
          this.plane!.object.position.y = height;
          this.orbitControls.enableRotate = false;

          this.nodes.forEach((n) => {
            const userData = n.object.userData;
            if (userData.isName) {
              n.object.position.y = height + planeHeight / 2 + 15;
              n.object.position.x =
                origPos[userData.nameIndex].x -
                (userData.nameIndex / 14 - 1.2) * 100 * elapsed;
              const shrink = 1 - 0.003;
              1;
              const newScale = n.object.scale.divideScalar(
                Math.pow(shrink, elapsed)
              );
              n.object.scale.set(newScale.x, newScale.y, newScale.z);
            }
          });

          this.camera.position.x =
            this.facingCameraPos.x +
            (this.originalCameraPos.x - this.facingCameraPos.x) * elapsed;
          this.camera.position.y =
            this.facingCameraPos.y +
            (this.originalCameraPos.y - this.facingCameraPos.y) * elapsed;
          this.camera.position.z =
            this.facingCameraPos.z +
            (this.originalCameraPos.z - this.facingCameraPos.z) * elapsed;
          this.orbitControls.target.y =
            this.facingCameraPos.y +
            (this.originalCameraPos.y - this.facingCameraPos.y) * elapsed;
        })
        .onComplete(() => {
          this.raised = false;
          this.orbitControls.enableRotate = true;
        })
        .start();
    }
  }

  raisingAnimations() {
    if (this.plane) {
      const planeHeight = this.plane.size.y;

      const origPos: { [key: number]: Vector3 } = {};

      this.nodes.forEach((n) => {
        if (n.object.userData.isName) {
          origPos[n.object.userData.nameIndex] = n.object.position.clone();
        }
      });

      new TWEEN.Tween({ height: -planeHeight / 2 - 1 })
        .to({ height: planeHeight / 2 })
        .easing(Easing.Linear.None)
        .onUpdate(({ height }, elapsed) => {
          this.plane!.object.position.y = height;
          this.orbitControls.enableRotate = false;

          this.nodes.forEach((n) => {
            const userData = n.object.userData;
            if (userData.isName) {
              n.object.position.y = height + planeHeight / 2 + 15;
              n.object.position.x =
                origPos[userData.nameIndex].x +
                (userData.nameIndex / 14 - 1.2) * 100 * elapsed;
              const shrink = 1 - 0.003;
              const newScale = n.object.scale.multiplyScalar(
                Math.pow(shrink, elapsed)
              );
              n.object.scale.set(newScale.x, newScale.y, newScale.z);
            }
          });

          this.camera.position.x =
            this.originalCameraPos.x +
            (this.facingCameraPos.x - this.originalCameraPos.x) * elapsed;
          this.camera.position.y =
            this.originalCameraPos.y +
            (this.facingCameraPos.y - this.originalCameraPos.y) * elapsed;
          this.camera.position.z =
            this.originalCameraPos.z +
            (this.facingCameraPos.z - this.originalCameraPos.z) * elapsed;
          this.orbitControls.target.y =
            this.originalCameraPos.y +
            (this.facingCameraPos.y - this.originalCameraPos.y) * elapsed;
        })
        .onComplete(() => {
          this.raised = true;
          this.orbitControls.enableRotate = true;

          this.switchContent(this.selectedTabIndex);
        })
        .start();
    }
  }

  animateDolphins() {
    this.nodes.forEach((n) => {
      if (n.object.userData.isDolphin) {
        n.object.rotation.x += n.object.userData.innateRotationSpeed;
      }
    });
  }

  switchContent(nameIndex?: number) {
    switch (nameIndex) {
      case 0:
        addProfileText(this);
        break;
      case 1:
        this.mouseSpotLight.visible = true;
        addEduContent(this);
        break;
      case 2:
        addIntroContent(this);
        break;
      case 3:
        addToolsContent(this);
        break;
      case 6:
        this.mouseSpotLight.visible = false;
        addContactContent(this);
        break;
      case 7:
        this.mouseSpotLight.visible = false;
        addContactContent(this);
        break;
    }
  }

  setMouseSpotLightTarget(object: Object3D) {
    this.mouseSpotLight.target = object;
  }

  render() {
    this.raycaster.setFromCamera(this.pointer, this.camera);

    this.stats?.update();
    TWEEN.update();
    this.water.material.uniforms["time"].value += 1.0 / 60.0;

    this.animateName();
    this.animateDolphins();

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
        n.setRayCasted(true);
      } else {
        n.setRayCasted(false);
      }
    });

    this.composer.render();
    requestAnimationFrame(this.render.bind(this));
  }
}
