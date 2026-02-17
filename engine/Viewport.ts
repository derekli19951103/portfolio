import { Tween, Easing, Group as TweenGroup } from '@tweenjs/tween.js'
import { addContactContent } from 'components/three/contact-section'
import {
  addFighterJetGame,
  addGameCountdown,
  addGameOver,
  spawnExplosion
} from 'components/three/fighter-jet'
import { addIntroContent } from 'components/three/intro-section'
import { addResumeContent } from 'components/three/resume-section'
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CubeTextureLoader,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  Material,
  Mesh,
  MeshBasicMaterial,
  DoubleSide,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  RingGeometry,
  Raycaster,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SpotLight,
  SpotLightHelper,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer
} from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import { Water } from 'three/examples/jsm/objects/Water.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LuminosityShader } from 'three/examples/jsm/shaders/LuminosityShader.js'
import { SobelOperatorShader } from 'three/examples/jsm/shaders/SobelOperatorShader.js'
import { PLANE_HEIGHT, PLANE_WIDTH } from 'constant'
import { addEduContent } from '../components/three/education-section'
import { addProfileText } from '../components/three/profile-section'
import { addToolsContent } from '../components/three/tools-section'
import { OrbitControls } from '../engine/three/OrbitControls'
import ThreeDNode from './ThreeDNode'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry'

export default class Viewport {
  scene: Scene
  renderer: WebGLRenderer
  camera: PerspectiveCamera

  originalCameraPos = new Vector3(-70, 30, 250)
  facingCameraPos = new Vector3(0, PLANE_HEIGHT / 2, 220)

  water: Water

  composer: EffectComposer
  effectSobel: ShaderPass

  nodes: ThreeDNode[] = []
  rain: Points
  ripples: { mesh: Mesh; age: number }[] = []
  private ripplePool: Mesh[] = []
  private ripplePoolGeo: RingGeometry

  orbitControls: OrbitControls

  raycaster: Raycaster = new Raycaster()
  pointer: Vector2 = new Vector2()
  mouseWorldPos: Vector3 = new Vector3()
  private _tempVec3: Vector3 = new Vector3()
  lightTrail: Line2
  trailPositions: number[] = []
  trailColors: number[] = []
  trailLength: number = 60
  mouseSpotLight: SpotLight
  spotLightHelper: SpotLightHelper

  width: number
  height: number
  private fixed: boolean = false

  private stats?: Stats

  plane?: ThreeDNode

  raised = false

  selectedTabIndex?: number
  displayContent = new Group()

  tweenGroup: TweenGroup = new TweenGroup()

  activeIntervals: number[] = []
  activeTimeouts: number[] = []
  private _rafId: number = 0
  private _disposed: boolean = false

  constructor(props: {
    canvas: HTMLCanvasElement
    width?: number
    height?: number
    stats?: Stats
  }) {
    const { canvas, width, height, stats } = props

    this.stats = stats

    this.scene = new Scene()
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true
    })

    this.scene.add(this.displayContent)

    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = ACESFilmicToneMapping

    this.width = width || window.innerWidth
    this.height = height || window.innerHeight
    if (width && height) {
      this.fixed = true
    }

    this.renderer.setSize(this.width, this.height)

    this.camera = new PerspectiveCamera(55, this.width / this.height, 1, 20000)

    this.camera.position.copy(this.originalCameraPos)

    this.scene.add(this.camera)

    const ambientLight = new AmbientLight(0xcccccc, 0.13)
    this.scene.add(ambientLight)

    const mouseLightZHeight = 30
    this.mouseSpotLight = new SpotLight(0xffffff, 50, 500, Math.PI / 2, 0, 1)
    this.scene.add(this.mouseSpotLight)
    this.mouseSpotLight.position.set(0, 0, mouseLightZHeight)
    this.spotLightHelper = new SpotLightHelper(this.mouseSpotLight, 0x111111)
    // this.scene.add(this.spotLightHelper);

    const onPointerMove = (x: number, y: number) => {
      this.pointer.x = (x / this.width) * 2 - 1
      this.pointer.y = -(y / this.height) * 2 + 1

      this._tempVec3.set(this.pointer.x, this.pointer.y, 0.5)
      this._tempVec3.unproject(this.camera)
      const dir = this._tempVec3.sub(this.camera.position).normalize()
      const distance = -this.camera.position.z / dir.z
      const pos = this.camera.position.clone().add(dir.multiplyScalar(distance))
      this.mouseSpotLight.position.set(pos.x, pos.y, pos.z + mouseLightZHeight)
      this.mouseSpotLight.target.position.set(pos.x, pos.y, pos.z)
      this.mouseWorldPos.set(pos.x, pos.y, pos.z)

      //fighter jet
      const jet = this.nodes.find((n) => n.object.userData.isFightJet)
      if (jet) {
        const size = new Vector3()
        jet.bbox.getSize(size)
        if (pos.y >= size.y / 2) {
          jet?.object.position.set(pos.x, pos.y, pos.z)
        }
      }
    }

    canvas.addEventListener('mousemove', (e) => {
      onPointerMove(e.clientX, e.clientY)
    })

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault()
      if (e.touches.length > 0) {
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    })

    this.orbitControls = new OrbitControls(this.camera, canvas)
    this.orbitControls.listenToKeyEvents(canvas)
    this.orbitControls.maxPolarAngle = Math.PI * 0.495
    this.orbitControls.minDistance = 80.0
    this.orbitControls.maxDistance = 350
    this.orbitControls.enablePan = false
    this.orbitControls.enableRotate = true
    this.orbitControls.enableDamping = true

    this.scene.background = new CubeTextureLoader().load([
      '/textures/sky/px.webp',
      '/textures/sky/nx.webp',
      '/textures/sky/py.webp',
      '/textures/sky/ny.webp',
      '/textures/sky/pz.webp',
      '/textures/sky/nz.webp'
    ])

    const waterGeometry = new PlaneGeometry(10000, 10000, 40, 40)

    this.water = new Water(waterGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new TextureLoader().load(
        '/textures/waternormals.jpg',
        (texture) => {
          texture.wrapS = texture.wrapT = RepeatWrapping
        }
      ),
      sunDirection: new Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 1,
      fog: this.scene.fog !== undefined
    })

    this.water.rotation.x = -Math.PI / 2

    this.scene.add(this.water)

    // Snow particles
    const snowCount = 500
    const snowGeo = new BufferGeometry()
    const snowPositions = new Float32Array(snowCount * 3)
    const snowVelocities = new Float32Array(snowCount)
    const snowDrift = new Float32Array(snowCount * 2) // x and z drift phase
    for (let i = 0; i < snowCount; i++) {
      snowPositions[i * 3] = (Math.random() - 0.5) * 1000
      snowPositions[i * 3 + 1] = Math.random() * 400
      snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 1000
      snowVelocities[i] = 0.3 + Math.random() * 0.5
      snowDrift[i * 2] = Math.random() * Math.PI * 2
      snowDrift[i * 2 + 1] = Math.random() * Math.PI * 2
    }
    snowGeo.setAttribute(
      'position',
      new Float32BufferAttribute(snowPositions, 3)
    )
    snowGeo.userData.velocities = snowVelocities
    snowGeo.userData.drift = snowDrift
    this.rain = new Points(
      snowGeo,
      new PointsMaterial({
        color: 0xffffff,
        size: 0.4,
        transparent: true,
        opacity: 0.8
      })
    )
    this.rain.layers.set(1)
    this.scene.add(this.rain)

    this.camera.layers.enable(1)

    // Pre-allocate ripple pool
    this.ripplePoolGeo = new RingGeometry(0.5, 1, 16)
    for (let i = 0; i < 50; i++) {
      const ring = new Mesh(
        this.ripplePoolGeo,
        new MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.4,
          side: DoubleSide
        })
      )
      ring.rotation.x = -Math.PI / 2
      ring.visible = false
      this.scene.add(ring)
      this.ripplePool.push(ring)
    }

    // Cursor light trail (Line2 with per-vertex color for fade)
    for (let i = 0; i < this.trailLength; i++) {
      this.trailPositions.push(0, -9999, 0)
      const t = i / (this.trailLength - 1)
      this.trailColors.push(1 - t, 1 - t * 0.4, 1)
    }
    const trailLineGeo = new LineGeometry()
    trailLineGeo.setPositions(this.trailPositions)
    trailLineGeo.setColors(this.trailColors)
    const trailLineMat = new LineMaterial({
      linewidth: 4,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: AdditiveBlending
    })
    trailLineMat.resolution.set(this.width, this.height)
    this.lightTrail = new Line2(trailLineGeo, trailLineMat)
    this.lightTrail.layers.set(1)
    this.scene.add(this.lightTrail)

    this.composer = new EffectComposer(this.renderer)
    const renderPass = new RenderPass(this.scene, this.camera)

    const effectGrayScale = new ShaderPass(LuminosityShader)

    this.effectSobel = new ShaderPass(SobelOperatorShader)
    const cappedDpr = Math.min(window.devicePixelRatio, 2)
    this.effectSobel.uniforms['resolution'].value.x =
      window.innerWidth * cappedDpr
    this.effectSobel.uniforms['resolution'].value.y =
      window.innerHeight * cappedDpr

    const bloomPass = new UnrealBloomPass(
      new Vector2(this.width, this.height),
      0.075,
      0.15,
      0.92
    )

    this.composer.addPass(renderPass)
    this.composer.addPass(effectGrayScale)
    this.composer.addPass(this.effectSobel)
    this.composer.addPass(bloomPass)

    window.addEventListener('resize', () => {
      if (!this.fixed) {
        this.width = window.innerWidth
        this.height = window.innerHeight

        this.camera.aspect = this.width / this.height
        this.camera.updateProjectionMatrix()

        this.renderer.setSize(this.width, this.height)
        this.composer.setSize(this.width, this.height)

        const dpr = Math.min(window.devicePixelRatio, 2)
        this.effectSobel.uniforms['resolution'].value.x = this.width * dpr
        this.effectSobel.uniforms['resolution'].value.y = this.height * dpr
      }
    })

    canvas.addEventListener('click', (e) => {
      e.preventDefault()
      this.nodes.forEach((n) => {
        if (n.isRayCasted) {
          n.setSelected(!n.isSelected)
          if (n.object.userData.isName) {
            const nameIndex = n.object.userData.nameIndex

            if (!this.raised) {
              this.camera.position.copy(this.originalCameraPos)
              this.raisingAnimations()
            } else {
              if (this.selectedTabIndex !== nameIndex) {
                this.clearContentGroup()

                this.switchContent(nameIndex)
              }
            }

            this.selectedTabIndex = nameIndex
          }
        }
      })
    })

    const loweringActions = () => {
      this.nodes.forEach((n) => {
        n.setSelected(false)
      })

      if (this.raised) {
        this.camera.position.copy(this.facingCameraPos)
        this.lowerAnimations()

        this.selectedTabIndex = undefined

        this.clearContentGroup()
        this.lightTrail.visible = true
        this.mouseSpotLight.visible = true
      }
    }

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      loweringActions()
    })

    let tapedTwice = false

    canvas.addEventListener('touchstart', (event) => {
      if (!tapedTwice) {
        tapedTwice = true
        setTimeout(function () {
          tapedTwice = false
        }, 300)
        return false
      }
      event.preventDefault()
      //action on double tap goes below
      loweringActions()
    })
  }

  add(...nodes: ThreeDNode[]) {
    const objects = []
    for (let i = 0; i < nodes.length; i++) {
      objects.push(nodes[i].object)
    }

    this.nodes.push(...nodes)
    this.scene.add(...objects)
  }

  addToContentGroup(...nodes: ThreeDNode[]) {
    const objects = []
    for (let i = 0; i < nodes.length; i++) {
      objects.push(nodes[i].object)
    }

    this.nodes.push(...nodes)
    this.displayContent.add(...objects)
  }

  removeNodeFromContentGroup(node: ThreeDNode) {
    const idx = this.nodes.findIndex((n) => n.object.id === node.object.id)
    if (idx > 0) {
      this.nodes.splice(idx, 1)
    }
    this.displayContent.remove(node.object)
  }

  clearContentGroup() {
    const uuids: string[] = []
    this.displayContent.traverse((c) => {
      uuids.push(c.uuid)
    })
    this.nodes = this.nodes.filter((n) => !uuids.includes(n.object.uuid))
    this.displayContent.clear()
    this.clearActiveIntervals()
    this.clearActiveTimeouts()
  }

  addPlane(node: ThreeDNode) {
    this.plane = node
    this.scene.add(node.object)
  }

  lowerAnimations() {
    if (this.plane) {
      const planeHeight = this.plane.size.y

      const origPos: { [key: number]: Vector3 } = {}

      this.nodes.forEach((n) => {
        if (n.object.userData.isName) {
          origPos[n.object.userData.nameIndex] = n.object.position.clone()
        }
      })

      new Tween({ height: planeHeight / 2 }, this.tweenGroup)
        .to({ height: -planeHeight / 2 - 0.1 })
        .easing(Easing.Linear.None)
        .onUpdate(({ height }, elapsed) => {
          this.plane!.object.position.y = height
          this.orbitControls.enableRotate = false

          this.nodes.forEach((n) => {
            const userData = n.object.userData
            if (userData.isName) {
              n.object.position.y = height + planeHeight / 2 + 15
              n.object.position.x =
                origPos[userData.nameIndex].x -
                (userData.nameIndex / 14 - 1.2) * 100 * elapsed
              const shrink = 1 - 0.003
              1
              const newScale = n.object.scale.divideScalar(
                Math.pow(shrink, elapsed)
              )
              n.object.scale.set(newScale.x, newScale.y, newScale.z)
            }
          })

          this.camera.position.x =
            this.facingCameraPos.x +
            (this.originalCameraPos.x - this.facingCameraPos.x) * elapsed
          this.camera.position.y =
            this.facingCameraPos.y +
            (this.originalCameraPos.y - this.facingCameraPos.y) * elapsed
          this.camera.position.z =
            this.facingCameraPos.z +
            (this.originalCameraPos.z - this.facingCameraPos.z) * elapsed
          this.orbitControls.target.y =
            this.facingCameraPos.y +
            (this.originalCameraPos.y - this.facingCameraPos.y) * elapsed
        })
        .onComplete(() => {
          this.raised = false
          this.orbitControls.enableRotate = true
        })
        .start()
    }
  }

  raisingAnimations() {
    if (this.plane) {
      const planeHeight = this.plane.size.y

      const origPos: { [key: number]: Vector3 } = {}

      this.nodes.forEach((n) => {
        if (n.object.userData.isName) {
          origPos[n.object.userData.nameIndex] = n.object.position.clone()
        }
      })

      new Tween({ height: -planeHeight / 2 - 1 }, this.tweenGroup)
        .to({ height: planeHeight / 2 })
        .easing(Easing.Linear.None)
        .onUpdate(({ height }, elapsed) => {
          this.plane!.object.position.y = height
          this.orbitControls.enableRotate = false

          this.nodes.forEach((n) => {
            const userData = n.object.userData
            if (userData.isName) {
              n.object.position.y = height + planeHeight / 2 + 15
              n.object.position.x =
                origPos[userData.nameIndex].x +
                (userData.nameIndex / 14 - 1.2) * 100 * elapsed
              const shrink = 1 - 0.003
              const newScale = n.object.scale.multiplyScalar(
                Math.pow(shrink, elapsed)
              )
              n.object.scale.set(newScale.x, newScale.y, newScale.z)
            }
          })

          this.camera.position.x =
            this.originalCameraPos.x +
            (this.facingCameraPos.x - this.originalCameraPos.x) * elapsed
          this.camera.position.y =
            this.originalCameraPos.y +
            (this.facingCameraPos.y - this.originalCameraPos.y) * elapsed
          this.camera.position.z =
            this.originalCameraPos.z +
            (this.facingCameraPos.z - this.originalCameraPos.z) * elapsed
          this.orbitControls.target.y =
            this.originalCameraPos.y +
            (this.facingCameraPos.y - this.originalCameraPos.y) * elapsed
        })
        .onComplete(() => {
          this.raised = true
          this.orbitControls.enableRotate = true

          this.switchContent(this.selectedTabIndex)
        })
        .start()
    }
  }

  animateName() {
    const time = Date.now() * 0.001
    const speed = Math.sin(time)
    this.nodes.forEach((n) => {
      if (n.object.userData.isName) {
        const label = n.object.children.find(
          (c) => c.userData.isNameLabelTag
        ) as Mesh<TextGeometry, Material> | undefined
        if (n.isRayCasted || n.isSelected) {
          ;(n.object.material as ShaderMaterial).uniforms.amplitude.value =
            Math.abs(speed) / 2

          if (label) {
            label.material.opacity = Math.abs(speed) / 2
          }
        } else {
          ;(n.object.material as ShaderMaterial).uniforms.amplitude.value = 0
          if (label) {
            label.material.opacity = 0
          }
        }
      }
    })
  }

  animateNameCircularLightUp() {
    const time = Date.now() * 0.001
    const names = this.nodes.filter((n) => n.object.userData.isName)
    names.forEach((n) => {
      const index = Math.floor(Date.now() / 2000) % 8
      const speed = Math.sin(time)

      const label = n.object.children.find((c) => c.userData.isNameLabelTag) as
        | Mesh<TextGeometry, Material>
        | undefined

      if (index === n.object.userData.nameIndex) {
        ;(n.object.material as ShaderMaterial).uniforms.amplitude.value =
          Math.abs(speed) / 2

        if (label) {
          label.material.opacity = Math.abs(speed) / 2
        }
      }
    })
  }

  animateDolphins() {
    this.nodes.forEach((n) => {
      if (n.object.userData.isDolphin) {
        n.object.rotation.x += n.object.userData.innateRotationSpeed
      }
    })
  }

  animteRotatingCube() {
    this.nodes.forEach((n) => {
      if (n.object.userData.isRotatingCube) {
        n.object.rotation.x -= 0.01
        n.object.rotation.y -= 0.01
      }
    })
  }

  animateWaves() {
    const time = Date.now() * 0.001
    const geometry = (this.water as unknown as Mesh).geometry
    const position = geometry.getAttribute('position')
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      const y = position.getY(i)
      const z =
        Math.sin(x * 0.015 + time * 1.2) * 8 +
        Math.sin(y * 0.02 + time * 1.8) * 6 +
        Math.cos((x + y) * 0.012 + time * 0.8) * 5 +
        Math.sin(x * 0.005 - time * 0.5) * 10 +
        Math.cos(y * 0.008 + time * 1.0) * 4
      position.setZ(i, z)
    }
    position.needsUpdate = true
    geometry.computeVertexNormals()
  }

  animateSnow() {
    const time = Date.now() * 0.001
    const geo = this.rain.geometry
    const positions = geo.getAttribute('position') as BufferAttribute
    const velocities = geo.userData.velocities as Float32Array
    const drift = geo.userData.drift as Float32Array
    for (let i = 0; i < positions.count; i++) {
      let y = positions.getY(i)
      y -= velocities[i]
      if (y < 0) {
        // Spawn ripple at water surface
        const x = positions.getX(i)
        const z = positions.getZ(i)
        this.spawnRipple(x, z)
        y = 400
        positions.setX(i, (Math.random() - 0.5) * 1000)
        positions.setZ(i, (Math.random() - 0.5) * 1000)
      }
      // Gentle random drift on X and Z
      const dx = Math.sin(time * 0.5 + drift[i * 2]) * 0.3
      const dz = Math.cos(time * 0.4 + drift[i * 2 + 1]) * 0.3
      positions.setX(i, positions.getX(i) + dx)
      positions.setZ(i, positions.getZ(i) + dz)
      positions.setY(i, y)
    }
    positions.needsUpdate = true
  }

  spawnRipple(x: number, z: number) {
    const ring = this.ripplePool.pop()
    if (!ring) return // Pool exhausted, skip this ripple
    ring.position.set(x, 0.5, z)
    ring.scale.set(1, 1, 1)
    ;(ring.material as MeshBasicMaterial).opacity = 0.4
    ring.visible = true
    this.ripples.push({ mesh: ring, age: 0 })
  }

  animateRipples() {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i]
      ripple.age += 1
      const scale = 1 + ripple.age * 0.5
      ripple.mesh.scale.set(scale, scale, scale)
      const mat = ripple.mesh.material as MeshBasicMaterial
      mat.opacity = 0.4 * (1 - ripple.age / 30)
      if (ripple.age >= 30) {
        ripple.mesh.visible = false
        this.ripplePool.push(ripple.mesh)
        this.ripples.splice(i, 1)
      }
    }
  }

  animateLightTrail() {
    // Shift all positions back by one slot (tail falls off)
    for (let i = this.trailLength - 1; i > 0; i--) {
      this.trailPositions[i * 3] = this.trailPositions[(i - 1) * 3]
      this.trailPositions[i * 3 + 1] = this.trailPositions[(i - 1) * 3 + 1]
      this.trailPositions[i * 3 + 2] = this.trailPositions[(i - 1) * 3 + 2]
    }
    // Head = current cursor
    this.trailPositions[0] = this.mouseWorldPos.x
    this.trailPositions[1] = this.mouseWorldPos.y
    this.trailPositions[2] = this.mouseWorldPos.z + 1

    const geo = this.lightTrail.geometry as LineGeometry
    geo.setPositions(this.trailPositions)
  }

  addToActiveIntervals(...numbers: number[]) {
    this.activeIntervals.push(...numbers)
  }

  clearActiveIntervals() {
    this.activeIntervals.forEach((ac) => window.clearInterval(ac))
    this.activeIntervals = []
  }

  addToActiveTimeouts(...numbers: number[]) {
    this.activeTimeouts.push(...numbers)
  }

  clearActiveTimeouts() {
    this.activeTimeouts.forEach((ac) => window.clearInterval(ac))
    this.activeTimeouts = []
  }

  switchContent(nameIndex?: number | string) {
    this.mouseSpotLight.visible = true
    this.orbitControls.enableRotate = true
    this.lightTrail.visible = true
    this.clearActiveIntervals()
    switch (nameIndex) {
      case 0:
        addProfileText(this)
        break
      case 1:
        addEduContent(this)
        break
      case 2:
        addIntroContent(this)
        break
      case 3:
        addToolsContent(this)
        break
      case 5:
        this.mouseSpotLight.visible = false
        this.orbitControls.enableRotate = false
        this.lightTrail.visible = false
        this.camera.position.copy(this.facingCameraPos)
        addGameCountdown(this)
        this.addToActiveTimeouts(
          window.setTimeout(() => {
            addFighterJetGame(this)
          }, 3500)
        )
        break
      case 6:
        this.mouseSpotLight.visible = false
        addContactContent(this)
        break
      case 7:
        this.mouseSpotLight.visible = false
        addResumeContent(this)
        break
      case 'lose':
        this.mouseSpotLight.visible = false
        this.orbitControls.enableRotate = false
        this.lightTrail.visible = false
        this.camera.position.copy(this.facingCameraPos)
        addGameOver(this)
    }
  }

  setMouseSpotLightTarget(_object: Object3D) {
    // Target follows mouse position via onPointerMove, no reassignment needed
  }

  jetGameLogic() {
    const time = Date.now() * 0.001

    // Pre-filter nodes into typed arrays to avoid O(n²) scans
    const bullets: ThreeDNode[] = []
    const words: ThreeDNode[] = []
    const powerUps: ThreeDNode[] = []
    const shields: ThreeDNode[] = []
    const heartDrops: ThreeDNode[] = []
    let jet: ThreeDNode | undefined

    for (const n of this.nodes) {
      const ud = n.object.userData
      if (ud.isBullet) bullets.push(n)
      else if (ud.isWord) {
        words.push(n)
        // Zigzag word animation
        if (ud.isZigzag) {
          n.object.position.x =
            Math.sin(time * ud.zigzagSpeed) * ud.zigzagAmplitude + ud.originalX
        }
      } else if (ud.isPowerUp) powerUps.push(n)
      else if (ud.isShield) shields.push(n)
      else if (ud.isHeartDrop) heartDrops.push(n)
      else if (ud.isFightJet) jet = n
    }

    // Bullet-word collisions
    for (const b of bullets) {
      for (const w of words) {
        if (!w.object.userData.isWord) continue
        const intersect = b.bbox.intersectsBox(w.bbox)
        if (intersect) {
          const hitPos = b.object.position.clone()
          this.removeNodeFromContentGroup(b)
          if (w.object.userData.impactCount < w.object.userData.armor) {
            w.object.userData.impactCount += 1
            ;(w.object.material as ShaderMaterial).uniforms.amplitude.value =
              w.object.userData.impactCount / w.object.userData.armor
            spawnExplosion(this, hitPos)
            const origScale = w.object.scale.clone()
            const origPos = w.object.position.clone()
            new Tween({ s: 1 }, this.tweenGroup)
              .to({ s: 1.5 }, 80)
              .easing(Easing.Quadratic.Out)
              .onUpdate(({ s }) => {
                w.object.scale.set(
                  origScale.x * s,
                  origScale.y * s,
                  origScale.z * s
                )
              })
              .onComplete(() => {
                new Tween({ s: 1.5 }, this.tweenGroup)
                  .to({ s: 1 }, 120)
                  .easing(Easing.Bounce.Out)
                  .onUpdate(({ s }) => {
                    w.object.scale.set(
                      origScale.x * s,
                      origScale.y * s,
                      origScale.z * s
                    )
                  })
                  .start()
              })
              .start()
            let shakeCount = 0
            const shakeInterval = window.setInterval(() => {
              w.object.position.x = origPos.x + (Math.random() - 0.5) * 8
              w.object.position.y = origPos.y + (Math.random() - 0.5) * 4
              shakeCount++
              if (shakeCount >= 6) {
                window.clearInterval(shakeInterval)
                w.object.position.x = origPos.x
                w.object.position.y = origPos.y
              }
            }, 30)
          } else {
            w.object.userData.isWord = false
            if (jet) {
              jet.object.userData.kills =
                (jet.object.userData.kills as number) + 1
              const hud = this.nodes.find((h) => h.object.userData.isKillsHud)
              if (hud) {
                const child = hud.object.children[0] as Mesh<TextGeometry>
                if (child && child.geometry) {
                  const params = child.geometry.parameters
                  if (params && params.options && params.options.font) {
                    child.geometry.dispose()
                    child.geometry = new TextGeometry(
                      `Defeated: ${jet.object.userData.kills}`,
                      { ...params.options, font: params.options.font }
                    )
                  }
                }
              }
            }
            const deathPos = w.object.position.clone()
            spawnExplosion(this, deathPos)
            new Tween({ z: deathPos.z, s: 1 }, this.tweenGroup)
              .to({ z: deathPos.z - 200, s: 0.01 }, 500)
              .easing(Easing.Quadratic.In)
              .onUpdate(({ z, s }) => {
                w.object.position.z = z
                w.object.scale.setScalar(s)
              })
              .onComplete(() => {
                spawnExplosion(this, deathPos)
                this.removeNodeFromContentGroup(w)
              })
              .start()
          }
          break // Bullet consumed, move to next bullet
        }
      }
    }

    if (jet) {
      // Animate aura ring
      const aura = jet.object.children.find((c) => c.userData.isAura) as
        | Mesh
        | undefined
      if (aura) {
        aura.visible = jet.object.userData.immune as boolean
        if (aura.visible) {
          aura.rotation.z += 0.05
          const pulse = 0.3 + Math.abs(Math.sin(Date.now() * 0.005)) * 0.4
          ;(aura.material as MeshBasicMaterial).opacity = pulse
        }
      }

      // Jet-word collision
      for (const w of words) {
        if (!w.object.userData.isWord) continue
        const intersect = jet.bbox.intersectsBox(w.bbox)
        if (intersect) {
          if (jet.object.userData.immune) {
            this.removeNodeFromContentGroup(w)
            continue
          }

          this.removeNodeFromContentGroup(w)
          jet.object.userData.lives -= 1

          const lives = jet.object.userData.lives as number
          const heart = this.nodes.find(
            (h) =>
              h.object.userData.isLifeHeart &&
              h.object.userData.heartIndex === lives
          )
          if (heart) {
            this.removeNodeFromContentGroup(heart)
          }

          spawnExplosion(this, jet.object.position.clone())
          jet.object.visible = false
          let flashCount = 0
          const flashInterval = window.setInterval(() => {
            jet!.object.visible = !jet!.object.visible
            flashCount++
            if (flashCount >= 6) {
              window.clearInterval(flashInterval)
              jet!.object.visible = true
            }
          }, 80)
          this.addToActiveIntervals(flashInterval)

          jet.object.userData.immune = true
          const immuneTimeout = window.setTimeout(() => {
            jet!.object.userData.immune = false
          }, 1000)
          this.addToActiveTimeouts(immuneTimeout)

          if (jet.object.userData.lives <= 0) {
            this.clearContentGroup()
            this.switchContent('lose')
            return
          }
        }
      }

      // Jet-powerup collision
      for (const p of powerUps) {
        if (jet.bbox.intersectsBox(p.bbox)) {
          this.removeNodeFromContentGroup(p)
          jet.object.userData.bulletCount =
            (jet.object.userData.bulletCount as number) + 1
        }
      }

      // Jet-shield collision
      for (const s of shields) {
        if (jet.bbox.intersectsBox(s.bbox)) {
          this.removeNodeFromContentGroup(s)
          jet.object.userData.immune = true
          const shieldTimeout = window.setTimeout(() => {
            jet!.object.userData.immune = false
          }, 2000)
          this.addToActiveTimeouts(shieldTimeout)
        }
      }

      // Jet-heart collision
      for (const h of heartDrops) {
        if (jet.bbox.intersectsBox(h.bbox)) {
          this.removeNodeFromContentGroup(h)
          const lives = jet.object.userData.lives as number
          if (lives < 3) {
            const newIndex = lives
            jet.object.userData.lives = lives + 1
            const geo = jet.object.userData.heartGeo as ExtrudeGeometry
            if (geo) {
              const heartMesh = new Mesh(
                geo.clone(),
                new MeshBasicMaterial({ color: 0xff0000 })
              )
              const heartNode = new ThreeDNode(heartMesh)
              heartNode.object.userData = {
                isLifeHeart: true,
                heartIndex: newIndex
              }
              heartNode.object.position.set(
                -PLANE_WIDTH / 2 + 20 + newIndex * 20,
                PLANE_HEIGHT - 10,
                0
              )
              this.addToContentGroup(heartNode)
            }
          }
        }
      }
    }
  }

  restartJetGame() {
    this.clearContentGroup()
    this.switchContent(5)
  }

  render() {
    this.raycaster.setFromCamera(this.pointer, this.camera)

    this.stats?.update()
    this.tweenGroup.update()
    this.scene.backgroundRotation.y += 0.0003
    this.water.material.uniforms['time'].value += 1.0 / 60.0
    this.animateWaves()
    this.animateSnow()
    this.animateRipples()
    this.animateLightTrail()

    this.nodes.forEach((n) => {
      n.update()
      if (n.object.userData.isName || n.object.userData.isRotatingCube) {
        const intersect = this.raycaster.intersectObject(n.object, true)
        n.setRayCasted(intersect.length > 0)

        if (n.isRayCasted && n.object.userData.isRotatingCube) {
          n.object.rotation.x -= 0.02
          n.object.rotation.y -= 0.02
        }
      }
    })

    this.animateName()
    this.animateDolphins()
    this.animteRotatingCube()
    this.jetGameLogic()
    this.animateNameCircularLightUp()

    this.orbitControls.update()
    // this.spotLightHelper.update()

    this.composer.render()
    if (!this._disposed) {
      this._rafId = requestAnimationFrame(this.render.bind(this))
    }
  }

  dispose() {
    this._disposed = true
    cancelAnimationFrame(this._rafId)
    this.clearActiveIntervals()
    this.clearActiveTimeouts()

    this.scene.traverse((obj) => {
      if (obj instanceof Mesh) {
        obj.geometry?.dispose()
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose())
        } else {
          obj.material?.dispose()
        }
      }
    })

    this.composer.dispose()
    this.renderer.dispose()
    this.orbitControls.dispose()
  }
}
