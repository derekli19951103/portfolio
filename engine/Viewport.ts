import TWEEN, { Easing } from "@tweenjs/tween.js";
import { addContactContent } from "components/three/contact-section";
import {
  addFighterJetGame,
  addGameCountdown,
  addGameOver,
} from "components/three/fighter-jet";
import { addIntroContent } from "components/three/intro-section";
import { addResumeContent } from "components/three/resume-section";
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
import { PLANE_HEIGHT } from "constant";
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
  spotLightHelper: SpotLightHelper;

  width: number;
  height: number;
  private fixed: boolean = false;

  private stats?: Stats;

  plane?: ThreeDNode;

  raised = false;

  selectedTabIndex?: number;
  displayContent = new Group();

  activeIntervals: number[] = [];
  activeTimeouts: number[] = [];

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

    const mouseLightZHeight = 30;
    this.mouseSpotLight = new SpotLight(
      0xffffff,
      5,
      mouseLightZHeight + 10,
      Math.PI / 2
    );
    this.scene.add(this.mouseSpotLight);
    this.mouseSpotLight.position.set(0, 0, mouseLightZHeight);
    this.spotLightHelper = new SpotLightHelper(this.mouseSpotLight, 0x111111);
    // this.scene.add(this.spotLightHelper);

    const onPointerMove = (x: number, y: number) => {
      this.pointer.x = (x / this.width) * 2 - 1;
      this.pointer.y = -(y / this.height) * 2 + 1;

      const vector = new Vector3(this.pointer.x, this.pointer.y, 0.5);
      vector.unproject(this.camera);
      const dir = vector.sub(this.camera.position).normalize();
      const distance = -this.camera.position.z / dir.z;
      const pos = this.camera.position
        .clone()
        .add(dir.multiplyScalar(distance));
      this.mouseSpotLight.position.set(pos.x, pos.y, pos.z + mouseLightZHeight);

      //fighter jet
      const jet = this.nodes.find((n) => n.object.userData.isFightJet);
      if (jet) {
        const size = new Vector3();
        jet.bbox.getSize(size);
        if (pos.y >= size.y / 2) {
          jet?.object.position.set(pos.x, pos.y, pos.z);
        }
      }
    };

    canvas.addEventListener("mousemove", (e) => {
      onPointerMove(e.clientX, e.clientY);
    });

    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
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
      e.preventDefault();
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
                this.clearContentGroup();

                this.switchContent(nameIndex);
              }
            }

            this.selectedTabIndex = nameIndex;
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

        this.clearContentGroup();
      }
    };

    canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      loweringActions();
    });

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

  removeNodeFromContentGroup(node: ThreeDNode) {
    const idx = this.nodes.findIndex((n) => n.object.id === node.object.id);
    if (idx > 0) {
      this.nodes.splice(idx, 1);
    }
    this.displayContent.remove(node.object);
  }

  clearContentGroup() {
    const uuids: string[] = [];
    this.displayContent.traverse((c) => {
      uuids.push(c.uuid);
    });
    this.nodes = this.nodes.filter((n) => !uuids.includes(n.object.uuid));
    this.displayContent.clear();
    this.clearActiveIntervals();
    this.clearActiveTimeouts();
  }

  addPlane(node: ThreeDNode) {
    this.plane = node;
    this.scene.add(node.object);
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

  animateDolphins() {
    this.nodes.forEach((n) => {
      if (n.object.userData.isDolphin) {
        n.object.rotation.x += n.object.userData.innateRotationSpeed;
      }
    });
  }

  animteRotatingCube() {
    this.nodes.forEach((n) => {
      if (n.object.userData.isRotatingCube) {
        n.object.rotation.x -= 0.01;
        n.object.rotation.y -= 0.01;
      }
    });
  }

  addToActiveIntervals(...numbers: number[]) {
    this.activeIntervals.push(...numbers);
  }

  clearActiveIntervals() {
    this.activeIntervals.forEach((ac) => window.clearInterval(ac));
    this.activeIntervals = [];
  }

  addToActiveTimeouts(...numbers: number[]) {
    this.activeTimeouts.push(...numbers);
  }

  clearActiveTimeouts() {
    this.activeTimeouts.forEach((ac) => window.clearInterval(ac));
    this.activeTimeouts = [];
  }

  switchContent(nameIndex?: number | string) {
    this.mouseSpotLight.visible = true;
    this.orbitControls.enableRotate = true;
    this.clearActiveIntervals();
    switch (nameIndex) {
      case 0:
        addProfileText(this);
        break;
      case 1:
        addEduContent(this);
        break;
      case 2:
        addIntroContent(this);
        break;
      case 3:
        addToolsContent(this);
        break;
      case 5:
        this.mouseSpotLight.visible = false;
        this.orbitControls.enableRotate = false;
        this.camera.position.copy(this.facingCameraPos);
        addGameCountdown(this);
        this.addToActiveTimeouts(
          window.setTimeout(() => {
            addFighterJetGame(this);
          }, 3500)
        );
        break;
      case 6:
        this.mouseSpotLight.visible = false;
        addContactContent(this);
        break;
      case 7:
        this.mouseSpotLight.visible = false;
        addResumeContent(this);
        break;
      case "lose":
        this.mouseSpotLight.visible = false;
        this.orbitControls.enableRotate = false;
        this.camera.position.copy(this.facingCameraPos);
        addGameOver(this);
    }
  }

  setMouseSpotLightTarget(object: Object3D) {
    this.mouseSpotLight.target = object;
  }

  jetGameLogic() {
    this.nodes.forEach((n) => {
      if (n.object.userData.isBullet) {
        this.nodes.forEach((other) => {
          if (other.object.userData.isWord) {
            const intersect = n.bbox.intersectsBox(other.bbox);
            if (intersect) {
              this.removeNodeFromContentGroup(n);
              if (
                other.object.userData.impactCount < other.object.userData.armor
              ) {
                other.object.userData.impactCount += 1;
                (
                  other.object.material as ShaderMaterial
                ).uniforms.amplitude.value =
                  other.object.userData.impactCount /
                  other.object.userData.armor;
              } else {
                this.removeNodeFromContentGroup(other);
              }
            }
          }
        });
      }
      if (n.object.userData.isFightJet) {
        this.nodes.forEach((other) => {
          if (other.object.userData.isWord) {
            const intersect = n.bbox.intersectsBox(other.bbox);
            if (intersect) {
              this.clearContentGroup();
              this.switchContent("lose");
            }
          }
        });
      }
    });
  }

  restartJetGame() {
    this.clearContentGroup();
    this.switchContent(5);
  }

  render() {
    this.raycaster.setFromCamera(this.pointer, this.camera);

    this.stats?.update();
    TWEEN.update();
    this.water.material.uniforms["time"].value += 1.0 / 60.0;

    this.nodes.forEach((n) => {
      n.update();
      const intersect = this.raycaster.intersectObject(n.object, true);
      n.setRayCasted(intersect.length > 0);

      if (n.isRayCasted) {
        if (n.object.userData.isRotatingCube) {
          n.object.rotation.x -= 0.02;
          n.object.rotation.y -= 0.02;
        }
      }
    });

    this.animateName();
    this.animateDolphins();
    this.animteRotatingCube();
    this.jetGameLogic();

    this.orbitControls.update();

    this.composer.render();
    requestAnimationFrame(this.render.bind(this));
  }
}
