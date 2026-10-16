import { Tween, Easing, Group as TweenGroup } from '@tweenjs/tween.js'
import { addContactContent } from 'components/three/contact-section'
import {
  addFighterJetGame,
  addGameCountdown,
  addGameOver
} from 'components/three/fighter-jet'
import { addAskContent } from 'components/three/ask-section'
import { addResumeContent } from 'components/three/resume-section'
import {
  ACESFilmicToneMapping,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CubeTextureLoader,
  Float32BufferAttribute,
  Group,
  Material,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  DoubleSide,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  RingGeometry,
  Raycaster,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
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
import { LuminosityShader } from 'three/examples/jsm/shaders/LuminosityShader.js'
import { SobelOperatorShader } from 'three/examples/jsm/shaders/SobelOperatorShader.js'
import { PLANE_HEIGHT } from 'constant'
import { addEduContent } from '../components/three/education-section'
import { addProfileText } from '../components/three/profile-section'
import { addToolsContent } from '../components/three/tools-section'
import { OrbitControls } from '../engine/three/OrbitControls'
import ThreeDNode from './ThreeDNode'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry'

// One slow breath of the "click a letter" hint, in and out, and how long the
// wave of light takes to cross it during each breath
const HINT_BREATH_MS = 3200
const HINT_WAVE_MS = 1400

// The name sits on the water on the landing view, and becomes a row of tabs
// above the board once one opens
const NAME_Y = 15
const NAV_Y = PLANE_HEIGHT + 15
const NAV_SCALE = 0.91
// On the landing view the letters tower: stretched taller and pulled
// narrower, standing on the same baseline. A portrait screen has height to
// spare and little width, so there they stretch further. They ease back to
// their own shape as they become tabs.
const TOWER = { tall: 2.6, slim: 0.6 }
const NARROW_TOWER = { tall: 6.5, slim: 0.55 }
// Share of the screen's width the name may fill
const NAME_FILL = 0.94
// A portrait screen spreads the name across this share of its width, the
// letters spaced between these gaps to get there
const NARROW_SPAN = 0.9
const NARROW_GAP = { min: 8, max: 13 }
// Below this the tabs are squeezed enough that their labels would collide
const COMPACT_NAV = 0.8

// The landing view looks up at the name from just over the water. The eye
// never sinks below CAMERA_FLOOR, and rides up over a swell to stay
// WATER_CLEARANCE above it.
const CAMERA_FLOOR = 1.5
const WATER_CLEARANCE = 3

const WATER_SIZE = 10000
const WATER_SEGMENTS = 40

// How tall the swell runs, kept gentle so the low view isn't swamped
const WAVE_SCALE = 0.4

// The swell at a point on the water, in the water's own (unrotated) plane
const waveHeight = (x: number, y: number, time: number) =>
  WAVE_SCALE *
  (Math.sin(x * 0.015 + time * 1.2) * 8 +
    Math.sin(y * 0.02 + time * 1.8) * 6 +
    Math.cos((x + y) * 0.012 + time * 0.8) * 5 +
    Math.sin(x * 0.005 - time * 0.5) * 10 +
    Math.cos(y * 0.008 + time * 1.0) * 4)

// The water's surface height under a point in the scene, read off the same
// triangles the mesh draws (the swell is only worked out at its vertices)
const waterHeightAt = (x: number, z: number, time: number) => {
  const step = WATER_SIZE / WATER_SEGMENTS
  const half = WATER_SIZE / 2
  // The water lies flat, so the scene's z runs along its -y
  const gx = (x + half) / step
  const gy = (half + z) / step
  const ix = Math.floor(gx)
  const iy = Math.floor(gy)
  const u = gx - ix
  const v = gy - iy
  const x0 = ix * step - half
  const yTop = half - iy * step
  const a = waveHeight(x0, yTop, time)
  const b = waveHeight(x0, yTop - step, time)
  const c = waveHeight(x0 + step, yTop - step, time)
  const d = waveHeight(x0 + step, yTop, time)
  // Each cell is split along its b-d diagonal
  return u + v <= 1
    ? a + u * (d - a) + v * (b - a)
    : c + (1 - u) * (b - c) + (1 - v) * (d - c)
}

// Each letter's place in the name, with a blank slot between YUFENG and LI
const nameSlot = (i: number) => (i > 5 ? i + 1 : i)

// Where a letter of the name sits, how big it is, how much taller and
// narrower than its own shape it's stretched, how wide an area takes its
// taps, and its label above it
type NamePose = {
  x: number
  y: number
  scale: number
  tall: number
  slim: number
  hitWidth: number
  labelScale: number
  labelX: number
}

const nameLabel = (n: ThreeDNode) =>
  n.object.children.find((c) => c.userData.isNameLabelTag) as
    Mesh<TextGeometry, Material> | undefined

// The pose is kept on the letter, since a stretched letter's scale no longer
// says it on its own
const readPose = (n: ThreeDNode): NamePose => n.object.userData.pose

const setPose = (n: ThreeDNode, pose: NamePose) => {
  n.object.userData.pose = pose
  const { tall, slim } = pose
  n.object.position.set(pose.x, pose.y, 0)
  n.object.scale.set(pose.scale * slim, pose.scale * tall, pose.scale)
  const hitBox = n.object.children.find((c) => c.userData.isHitBox)
  if (hitBox) hitBox.scale.x = pose.hitWidth / (n.size.x * pose.scale * slim)
  const label = nameLabel(n)
  if (label) {
    // Undo the stretch so the label keeps its shape, and lift it to stay
    // the same height over the letter's top
    label.scale.set(pose.labelScale / slim, pose.labelScale / tall, 1)
    label.position.x = pose.labelX / slim
    label.position.y =
      (label.userData.restY + (n.size.y / 2) * (tall - 1)) / tall
  }
}

const mixPose = (from: NamePose, to: NamePose, t: number): NamePose => ({
  x: MathUtils.lerp(from.x, to.x, t),
  y: MathUtils.lerp(from.y, to.y, t),
  scale: MathUtils.lerp(from.scale, to.scale, t),
  tall: MathUtils.lerp(from.tall, to.tall, t),
  slim: MathUtils.lerp(from.slim, to.slim, t),
  hitWidth: MathUtils.lerp(from.hitWidth, to.hitWidth, t),
  labelScale: MathUtils.lerp(from.labelScale, to.labelScale, t),
  labelX: MathUtils.lerp(from.labelX, to.labelX, t)
})

export default class Viewport {
  scene: Scene
  renderer: WebGLRenderer
  camera: PerspectiveCamera

  // Set for the screen's shape by setCameraPositions
  originalCameraPos = new Vector3()
  facingCameraPos = new Vector3()
  // Where the landing view looks, above the name so the eye tilts up
  landingTarget = new Vector3()
  // Holds the camera, and lifts it over the swell without disturbing the
  // orbit controls, which only move the camera within it
  private cameraRig = new Group()
  private cameraLift = 0
  private waveTime = 0
  // A portrait screen, which sees the scene from further back
  narrow = false

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
  // The cursor away from anything clickable; the game hides it, since there
  // the jet is the cursor
  idleCursor = ''
  private boardRay = new Vector3()

  width: number
  height: number
  private fixed: boolean = false

  private stats?: Stats

  plane?: ThreeDNode

  raised = false
  // While the board rises or sinks
  moving = false
  // Set by the first letter click; the "click a letter" hint then fades out
  hintDismissed = false

  selectedTabIndex?: number
  // What the board shows: a tab's index, or 'lose' after the game
  shownContent?: number | string
  displayContent = new Group()

  tweenGroup: TweenGroup = new TweenGroup()

  activeIntervals: number[] = []
  activeTimeouts: number[] = []
  // Teardown for content that lives outside the scene, like HTML overlays
  contentCleanups: (() => void)[] = []
  // Per-frame work for the open tab, run after hover detection
  contentFrames: (() => void)[] = []
  // Bumped whenever the content clears, so content still loading can tell
  // it's been replaced
  contentVersion = 0
  private _rafId: number = 0
  private _disposed: boolean = false
  // Removes every listener the viewport added, so a disposed one goes quiet
  private listeners = new AbortController()
  private resizeObserver?: ResizeObserver
  // The width the open tab was laid out for, and the pending re-layout
  private laidOutWidth: number
  private relayoutTimeout = 0

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

    // The stylesheet sizes the canvas: on an iPhone it runs on under
    // Safari's see-through toolbars, past what window.innerHeight counts
    this.width = width || canvas.clientWidth || window.innerWidth
    this.height = height || canvas.clientHeight || window.innerHeight
    if (width && height) {
      this.fixed = true
    }

    this.renderer.setSize(this.width, this.height, this.fixed)

    this.narrow = this.width < this.height
    this.setCameraPositions()
    this.laidOutWidth = this.width

    this.camera = new PerspectiveCamera(55, this.width / this.height, 1, 20000)

    this.camera.position.copy(this.originalCameraPos)
    const { signal } = this.listeners

    this.cameraRig.add(this.camera)
    this.scene.add(this.cameraRig)

    const ambientLight = new AmbientLight(0xcccccc, 0.13)
    this.scene.add(ambientLight)

    const onPointerMove = (x: number, y: number) => {
      this.pointer.x = (x / this.width) * 2 - 1
      this.pointer.y = -(y / this.height) * 2 + 1
    }

    canvas.addEventListener(
      'mousemove',
      (e) => {
        onPointerMove(e.clientX, e.clientY)
      },
      { signal }
    )

    canvas.addEventListener(
      'touchmove',
      (e) => {
        e.preventDefault()
        if (e.touches.length > 0) {
          onPointerMove(e.touches[0].clientX, e.touches[0].clientY)
        }
      },
      { signal }
    )

    this.orbitControls = new OrbitControls(this.camera, canvas)
    this.orbitControls.listenToKeyEvents(canvas)
    this.orbitControls.target.copy(this.landingTarget)
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

    const waterGeometry = new PlaneGeometry(
      WATER_SIZE,
      WATER_SIZE,
      WATER_SEGMENTS,
      WATER_SEGMENTS
    )

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

    this.composer = new EffectComposer(this.renderer)
    const renderPass = new RenderPass(this.scene, this.camera)

    const effectGrayScale = new ShaderPass(LuminosityShader)

    this.effectSobel = new ShaderPass(SobelOperatorShader)
    const cappedDpr = Math.min(window.devicePixelRatio, 2)
    this.effectSobel.uniforms['resolution'].value.x = this.width * cappedDpr
    this.effectSobel.uniforms['resolution'].value.y = this.height * cappedDpr

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

    if (!this.fixed) {
      this.resizeObserver = new ResizeObserver(() =>
        this.resize(canvas.clientWidth, canvas.clientHeight)
      )
      this.resizeObserver.observe(canvas)
    }

    canvas.addEventListener(
      'click',
      (e) => {
        e.preventDefault()
        // Hit-test where the click landed: a tap has no hover beforehand
        onPointerMove(e.clientX, e.clientY)
        this.updateHover()
        this.nodes.forEach((n) => {
          if (n.isRayCasted) {
            n.setSelected(!n.isSelected)
            if (n.object.userData.isName) {
              this.hintDismissed = true
              const nameIndex = n.object.userData.nameIndex

              // While the board moves the tab is only remembered: a rising
              // board opens it when it arrives
              if (!this.raised && !this.moving) {
                this.camera.position.copy(this.originalCameraPos)
                this.raisingAnimations()
              } else if (
                this.raised &&
                !this.moving &&
                this.selectedTabIndex !== nameIndex
              ) {
                this.clearContentGroup()

                this.switchContent(nameIndex)
              }

              this.selectedTabIndex = nameIndex
            }
          }
        })
      },
      { signal }
    )

    const loweringActions = () => {
      this.nodes.forEach((n) => {
        n.setSelected(false)
      })

      if (this.raised) {
        this.camera.position.copy(this.facingCameraPos)
        this.lowerAnimations()

        this.selectedTabIndex = undefined
        this.shownContent = undefined

        this.clearContentGroup()
      }
    }

    canvas.addEventListener(
      'contextmenu',
      (e) => {
        e.preventDefault()
        loweringActions()
      },
      { signal }
    )

    let tapedTwice = false

    canvas.addEventListener(
      'touchstart',
      (event) => {
        // Flying the jet means quick repeated touches, which mustn't end
        // the game; a letter above leaves it instead
        if (this.shownContent === 5) return
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
      },
      { signal }
    )
  }

  // Where a point on the screen lands on the board's plane (z = 0)
  toBoard(x: number, y: number, target = new Vector3()) {
    const dir = this.boardRay
      .set((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1, 0.5)
      .unproject(this.camera)
      .sub(this.camera.position)
      .normalize()
    const distance = -this.camera.position.z / dir.z
    return target.copy(this.camera.position).addScaledVector(dir, distance)
  }

  // The scene is seen straight on, the name from low down looking up; a
  // portrait screen sees it from further back, so it tilts up more steeply
  private setCameraPositions() {
    if (this.narrow) {
      this.originalCameraPos.set(0, 2, 200)
      this.landingTarget.set(0, 67, 0)
      this.facingCameraPos.set(0, PLANE_HEIGHT / 2, 280)
    } else {
      this.originalCameraPos.set(0, 2, 90)
      this.landingTarget.set(0, 35, 0)
      this.facingCameraPos.set(0, PLANE_HEIGHT / 2, 220)
    }
  }

  // Follows the canvas as the stylesheet resizes it, when the screen turns
  // or the window changes size
  private resize(width: number, height: number) {
    if (!width || !height) return
    if (width === this.width && height === this.height) return
    this.width = width
    this.height = height

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(width, height, false)
    this.composer.setSize(width, height)

    const dpr = Math.min(window.devicePixelRatio, 2)
    this.effectSobel.uniforms['resolution'].value.x = width * dpr
    this.effectSobel.uniforms['resolution'].value.y = height * dpr
    this.fitToScreen()
  }

  // Keeps the scene fitted when the screen turns or resizes. The open tab
  // lays itself out again once the width settles; a phone keyboard only
  // changes the height, so it leaves the tab (and its input) alone.
  private fitToScreen() {
    const narrow = this.width < this.height
    if (narrow !== this.narrow) {
      this.narrow = narrow
      this.setCameraPositions()
      if (!this.moving && this.raised) {
        this.camera.position.copy(this.facingCameraPos)
      } else if (!this.moving) {
        this.camera.position.copy(this.originalCameraPos)
        this.orbitControls.target.copy(this.landingTarget)
      }
    }
    if (!this.moving) this.placeName()

    if (this.width === this.laidOutWidth) return
    window.clearTimeout(this.relayoutTimeout)
    this.relayoutTimeout = window.setTimeout(() => {
      this.laidOutWidth = this.width
      // The Ask tab's chat is HTML that fits itself, and rebuilding it would
      // drop the question being typed, and a phone's keyboard with it
      const fitsItself = this.shownContent === 2
      if (
        this.raised &&
        !this.moving &&
        this.shownContent !== undefined &&
        !fitsItself
      ) {
        this.clearContentGroup()
        this.switchContent(this.shownContent)
      }
    }, 250)
  }

  // Half the width the camera sees at the board, from this far away
  halfWidthAt(distance: number) {
    const { fov, aspect } = this.camera
    return distance * Math.tan(MathUtils.degToRad(fov / 2)) * aspect
  }

  private nameLetters() {
    return this.nodes
      .filter((n) => n.object.userData.isName)
      .sort((a, b) => a.object.userData.nameIndex - b.object.userData.nameIndex)
  }

  // Towering along the water under the hint, centred in front of the camera.
  // A narrow screen spaces it to span most of the width, and it shrinks if
  // it still won't fit.
  private landingPoses(letters: ThreeDNode[]): NamePose[] {
    const { tall, slim } = this.narrow ? NARROW_TOWER : TOWER
    const pose = (x: number, scale: number, pitch: number, n: ThreeDNode) => ({
      x,
      // Stretched up from where its foot stood unstretched
      y: NAME_Y + (n.size.y / 2) * (tall - 1) * scale,
      scale,
      tall,
      slim,
      // Most of its slot, however slim the letter
      hitWidth: 0.9 * pitch,
      labelScale: 1,
      labelX: nameLabel(n)?.userData.restX ?? 0
    })
    const scale = this.narrow ? 0.7 : 1
    const middle = nameSlot(letters.length - 1) / 2
    const endHalf =
      (Math.max(letters[0].size.x, letters[letters.length - 1].size.x) / 2) *
      slim *
      scale
    const seen = this.halfWidthAt(this.originalCameraPos.z)
    const gap = this.narrow
      ? MathUtils.clamp(
          (NARROW_SPAN * seen - endHalf) / middle,
          NARROW_GAP.min,
          NARROW_GAP.max
        )
      : 14
    const halfWidth = middle * gap + endHalf
    const fit = Math.min(1, (NAME_FILL * seen) / halfWidth)
    return letters.map((n, i) =>
      pose((nameSlot(i) - middle) * gap * fit, scale * fit, gap * fit, n)
    )
  }

  // A row of tabs above the board, up and to the left where there's room.
  // On a narrower screen it slides right only as far as it must to stay on
  // screen, then shrinks to fit. Squeezed tabs keep their labels full size,
  // kept on screen; animateName shows only the lit one so they don't collide.
  private navPoses(letters: ThreeDNode[]): NamePose[] {
    const last = letters.length - 1
    const xs = letters.map((_, i) => -175 + 20 * nameSlot(i) + (100 / 14) * i)
    const left = xs[0] - (letters[0].size.x / 2) * NAV_SCALE
    const right = xs[last] + (letters[last].size.x / 2) * NAV_SCALE
    const width = right - left
    const centre = (left + right) / 2

    const room = NAME_FILL * this.halfWidthAt(this.facingCameraPos.z)
    const fit = Math.min(1, (2 * room) / width)
    const target =
      fit < 1 ? 0 : MathUtils.clamp(centre, -room + width / 2, room - width / 2)
    const compact = fit < COMPACT_NAV

    return letters.map((n, i) => {
      const x = target + (xs[i] - centre) * fit
      const scale = NAV_SCALE * fit
      const label = nameLabel(n)
      const restX = label?.userData.restX ?? 0
      if (!compact || !label) {
        return {
          x,
          y: NAV_Y,
          scale,
          tall: 1,
          slim: 1,
          hitWidth: n.size.x * scale,
          labelScale: 1,
          labelX: restX
        }
      }
      const labelScale = 1 / fit
      // An empty label has an empty (inverted) bounding box
      const halfLabel =
        Math.max(0, label.geometry.boundingBox?.max.x ?? 0) * NAV_SCALE
      const labelCentre = MathUtils.clamp(
        x + restX * scale,
        -room + halfLabel,
        room - halfLabel
      )
      return {
        x,
        y: NAV_Y,
        scale,
        tall: 1,
        slim: 1,
        hitWidth: n.size.x * scale,
        labelScale,
        labelX: (labelCentre - x) / scale
      }
    })
  }

  // Puts the name where it rests now, and the hint above its landing spot
  placeName() {
    const letters = this.nameLetters()
    if (!letters.length) return
    const landing = this.landingPoses(letters)
    const poses = this.raised ? this.navPoses(letters) : landing
    letters.forEach((n, i) => setPose(n, poses[i]))

    const hint = this.nodes.find((n) => n.object.userData.isHint)
    if (hint) {
      const first = landing[0]
      const last = landing[landing.length - 1]
      // Over the towering letters' tops
      const rise = letters[0].size.y * (first.tall - 1)
      hint.object.position.set(
        (first.x + last.x) / 2,
        NAME_Y + (28 + rise) * first.scale,
        0
      )
      hint.object.scale.setScalar(first.scale)
    }
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
    // Content may shake the whole group; the next tab starts still
    this.displayContent.position.set(0, 0, 0)
    this.clearActiveIntervals()
    this.clearActiveTimeouts()
    this.clearContentCleanups()
    this.contentFrames = []
    this.contentVersion++
  }

  addContentFrame(frame: () => void) {
    this.contentFrames.push(frame)
  }

  addContentCleanup(cleanup: () => void) {
    this.contentCleanups.push(cleanup)
  }

  clearContentCleanups() {
    this.contentCleanups.forEach((cleanup) => cleanup())
    this.contentCleanups = []
  }

  addPlane(node: ThreeDNode) {
    this.plane = node
    this.scene.add(node.object)
  }

  lowerAnimations() {
    if (this.plane) {
      const planeHeight = this.plane.size.y

      const letters = this.nameLetters()
      const from = letters.map(readPose)
      this.moving = true

      new Tween({ height: planeHeight / 2 }, this.tweenGroup)
        .to({ height: -planeHeight / 2 - 0.1 })
        .easing(Easing.Linear.None)
        .onUpdate(({ height }, elapsed) => {
          this.plane!.object.position.y = height
          this.orbitControls.enableRotate = false

          // Worked out every frame, in case the screen turns mid-way
          const to = this.landingPoses(letters)
          letters.forEach((n, i) =>
            setPose(n, mixPose(from[i], to[i], elapsed))
          )

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
            (this.landingTarget.y - this.facingCameraPos.y) * elapsed
        })
        .onComplete(() => {
          this.raised = false
          this.moving = false
          this.orbitControls.enableRotate = true
        })
        .start()
    }
  }

  raisingAnimations() {
    if (this.plane) {
      const planeHeight = this.plane.size.y

      const letters = this.nameLetters()
      const from = letters.map(readPose)
      this.moving = true

      new Tween({ height: -planeHeight / 2 - 1 }, this.tweenGroup)
        .to({ height: planeHeight / 2 })
        .easing(Easing.Linear.None)
        .onUpdate(({ height }, elapsed) => {
          this.plane!.object.position.y = height
          this.orbitControls.enableRotate = false

          // Worked out every frame, in case the screen turns mid-way
          const to = this.navPoses(letters)
          letters.forEach((n, i) =>
            setPose(n, mixPose(from[i], to[i], elapsed))
          )

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
            this.landingTarget.y +
            (this.facingCameraPos.y - this.landingTarget.y) * elapsed
        })
        .onComplete(() => {
          this.raised = true
          this.moving = false
          this.orbitControls.enableRotate = true

          this.switchContent(this.selectedTabIndex)
        })
        .start()
    }
  }

  animateName() {
    const pulse = Math.abs(Math.sin(Date.now() * 0.001)) / 2
    // On the landing view, every two seconds the next letter that opens a tab
    // shimmers, a hint that the letters can be clicked. Once a tab is open the
    // open one is the only letter lit.
    const tabs = this.nodes.filter(
      (n) => n.object.userData.isName && n.object.userData.hasTab
    )
    const shimmering = this.raised
      ? undefined
      : tabs[Math.floor(Date.now() / 2000) % tabs.length]

    this.nodes.forEach((n) => {
      const { isName, isHint, nameIndex } = n.object.userData
      if (isName) {
        // Only the open tab's letter stays lit, however many were clicked
        const open = this.raised && nameIndex === this.selectedTabIndex
        const active = n.isRayCasted || open
        ;(n.object.material as ShaderMaterial).uniforms.amplitude.value =
          active || n === shimmering ? pulse : 0

        const label = nameLabel(n)
        if (label) {
          // Labels rest faintly so each letter shows where it leads, and
          // light up on hover and for the open tab. The edge filter turns
          // anything over about 0.3 opacity full white, so rest stays low.
          // Tabs squeezed onto a narrow screen keep their labels full size,
          // which would collide, so there only the lit one shows.
          const rest = readPose(n).labelScale > 1 ? 0 : 0.12
          const target = active ? 1 : n === shimmering ? 0.35 : rest
          label.material.opacity += (target - label.material.opacity) * 0.15
        }
      } else if (isHint) {
        this.animateHint(n)
      }
    })
  }

  // The "click a letter" hint breathes dimly, and once per breath a wave of
  // light runs across it left to right, lifting each letter as it passes.
  // The crest runs brighter than white, which the bloom pass haloes. After
  // the first letter click it fades out for good.
  animateHint(hint: ThreeDNode) {
    const now = Date.now()
    const breath = 0.5 - 0.5 * Math.cos((now / HINT_BREATH_MS) * Math.PI * 2)
    const { uniforms } = hint.object.material as ShaderMaterial
    const halfWidth = hint.object.geometry.boundingBox!.max.x
    const band = uniforms.bandWidth.value
    // Crosses in the first part of each breath, then rests off the right end
    const t = Math.min((now % HINT_BREATH_MS) / HINT_WAVE_MS, 1)
    const eased = t * t * (3 - 2 * t)
    uniforms.sweep.value =
      -halfWidth - 2 * band + eased * (2 * halfWidth + 4 * band)
    // Kept low: the edge filter turns anything over about 0.3 full white, and
    // the resting letters should read as grey against the crest
    uniforms.base.value = 0.05 + breath * 0.1
    uniforms.peak.value = 1.3
    const fadeTarget = this.hintDismissed ? 0 : 1
    uniforms.fade.value += (fadeTarget - uniforms.fade.value) * 0.08
    hint.object.visible = !this.hintDismissed || uniforms.fade.value > 0.01
  }

  // Lets the low landing view orbit no lower than the floor, and lifts the
  // camera over a swell that would otherwise wash over it. It rises at once
  // and settles back gently, like riding the wave.
  private keepCameraAboveWater() {
    const eye = this.camera.position
    const target = this.orbitControls.target
    this.orbitControls.maxPolarAngle =
      this.raised && !this.moving
        ? Math.PI * 0.495
        : Math.acos(
            MathUtils.clamp(
              (CAMERA_FLOOR - target.y) / eye.distanceTo(target),
              -1,
              1
            )
          )

    const needed = Math.max(
      0,
      waterHeightAt(eye.x, eye.z, this.waveTime) + WATER_CLEARANCE - eye.y
    )
    this.cameraLift = Math.max(
      needed,
      MathUtils.lerp(this.cameraLift, needed, 0.05)
    )
    this.cameraRig.position.y = this.cameraLift
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
    this.waveTime = time
    const geometry = (this.water as unknown as Mesh).geometry
    const position = geometry.getAttribute('position')
    for (let i = 0; i < position.count; i++) {
      position.setZ(i, waveHeight(position.getX(i), position.getY(i), time))
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
    this.shownContent = nameIndex
    this.orbitControls.enableRotate = true
    this.clearActiveIntervals()
    switch (nameIndex) {
      case 0:
        addProfileText(this)
        break
      case 1:
        addEduContent(this)
        break
      case 2:
        addAskContent(this)
        break
      case 3:
        addToolsContent(this)
        break
      case 5:
        this.orbitControls.enableRotate = false
        this.camera.position.copy(this.facingCameraPos)
        addGameCountdown(this)
        this.addToActiveTimeouts(
          window.setTimeout(() => {
            addFighterJetGame(this)
          }, 3500)
        )
        break
      case 6:
        addContactContent(this)
        break
      case 7:
        addResumeContent(this)
        break
      case 'lose':
        this.orbitControls.enableRotate = false
        this.camera.position.copy(this.facingCameraPos)
        addGameOver(this)
    }
  }

  restartJetGame() {
    this.clearContentGroup()
    this.switchContent(5)
  }

  // Hover state for everything clickable, with a hand cursor over anything
  // that opens something
  updateHover() {
    this.raycaster.setFromCamera(this.pointer, this.camera)
    let overClickable = false
    this.nodes.forEach((n) => {
      const { isName, isRotatingCube, isLink, hasTab } = n.object.userData
      if (!isName && !isRotatingCube && !isLink) return
      n.setRayCasted(this.raycaster.intersectObject(n.object, true).length > 0)
      if (n.isRayCasted && (hasTab || isRotatingCube || isLink)) {
        overClickable = true
      }
    })
    const cursor = overClickable ? 'pointer' : this.idleCursor
    const style = this.renderer.domElement.style
    if (style.cursor !== cursor) style.cursor = cursor
  }

  render() {
    this.stats?.update()
    this.tweenGroup.update()
    this.scene.backgroundRotation.y += 0.0003
    this.water.material.uniforms['time'].value += 1.0 / 60.0
    this.animateWaves()
    this.animateSnow()
    this.animateRipples()

    this.nodes.forEach((n) => n.update())
    this.updateHover()
    this.contentFrames.forEach((frame) => frame())
    this.nodes.forEach((n) => {
      if (n.isRayCasted && n.object.userData.isRotatingCube) {
        n.object.rotation.x -= 0.02
        n.object.rotation.y -= 0.02
      }
    })

    this.animateName()
    this.animteRotatingCube()

    this.keepCameraAboveWater()
    this.orbitControls.update()

    this.composer.render()
    if (!this._disposed) {
      this._rafId = requestAnimationFrame(this.render.bind(this))
    }
  }

  dispose() {
    this._disposed = true
    cancelAnimationFrame(this._rafId)
    this.listeners.abort()
    this.resizeObserver?.disconnect()
    window.clearTimeout(this.relayoutTimeout)
    this.clearContentCleanups()
    this.clearActiveIntervals()
    this.clearActiveTimeouts()

    this.scene.traverse((obj) => {
      if (obj instanceof Mesh || obj instanceof Points) {
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
