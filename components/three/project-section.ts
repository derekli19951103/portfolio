import { Easing, Tween } from '@tweenjs/tween.js'
import { PLANE_HEIGHT } from 'constant'
import { openOnClick } from 'components/three/contact-section'
import { settle } from 'components/three/tools-section'
import { createTranslationAnimation } from 'engine/animations/text-animations'
import { createHackedText } from 'engine/objects/HackedText'
import ThreeDNode from 'engine/ThreeDNode'
import {
  BufferGeometry,
  CircleGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  QuadraticBezierCurve3,
  RingGeometry,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3
} from 'three'
import { loadFont } from '../../engine/loaders/font-loader'
import { createStandardText } from '../../engine/objects/StandardText'
import Viewport from '../../engine/Viewport'

// Waypoint Log, a pilot logbook web app. A plane flies its route across the
// board, and each waypoint it reaches is one of the things the app does.
const SITE = 'https://www.waypointlog.com'
const WAYPOINTS = [
  { title: 'AI IMPORT', detail: 'photos, PDFs, spreadsheets' },
  { title: 'ROSTERS', detail: 'airlines & Google Calendar' },
  { title: 'NIGHT TIME', detail: 'twilight along the route' },
  { title: 'TC & FAA', detail: 'recency & flight time limits' }
]
const STACK = 'React · Hono · Postgres · Gemini · Stripe'

const HEADING_SIZE = 9
const SUBTITLE_SIZE = 5
const STOP_SIZE = 5.5
const DETAIL_SIZE = 4
const STACK_SIZE = 4
const LINK_SIZE = 6

// Laid out around the board's centre, then scaled to fit the screen. A wide
// screen flies the route across in an arc, each stop's words under it, all
// in the sky above the horizon (level with the centre) where small words
// read best; the stack and link sit on the water below. A narrower screen
// runs the route down the board with the words beside it.
const CENTRE = PLANE_HEIGHT / 2
const WIDE = { heading: 64, subtitle: 49, stack: -14, link: -32 }
const NARROW = { heading: 70, subtitle: 55, stack: -42, link: -56 }
const ARC = { span: 120, y: 29, rise: 7 }
const DROP = { top: 37, bottom: -23, bow: 10 }
// A stop's title and detail, under its waypoint or beside it
const UNDER = { title: -10, detail: -18 }
const BESIDE = { x: 9, title: 2.5, detail: -5.5 }
// Share of the screen's width it may take, and the smallest the arc may
// shrink to before the route turns to run down the board instead
const FILL = 0.9
const MIN_WIDE = 0.8

// The route is dashed, and only drawn as far as the plane has flown it
const DASH = 3.5
const DASH_GAP = 2.5
const DASH_WIDTH = 0.6

// A waypoint is a ring around a dot. As the plane passes, a ripple spreads
// from it and it flares, with its title, brighter than white.
const RING = { inner: 2.4, outer: 3.2 }
const DOT = 0.9
const RIPPLE_MS = 900
const RIPPLE_GROWTH = 2.4
const HOT = 2.2
// How far short of a waypoint the plane counts as there, along the route
const ARRIVE = 0.015

// The first flight draws the route and brings in each waypoint as it gets
// there. Then, after a rest, it flies the route again every few seconds,
// lighting a wake behind it that fades down the dashes.
const FIRST_AT_MS = 500
const FIRST_MS = 2400
const REST_MS = 2600
const FLY_MS = 4200
const WAKE = 0.08
const PLANE_LIGHT = 1.4

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')

// The plane from above, nose along +x, a high-wing single like the one in
// the app's logo: one side of it, mirrored for the other
const PLANE = [
  [4.8, 0],
  [4.4, 0.55],
  [1, 0.6],
  [0.95, 4.9],
  [-0.6, 4.9],
  [-0.65, 0.6],
  [-3.5, 0.45],
  [-3.6, 1.9],
  [-4.5, 1.9],
  [-4.6, 0]
]

const planeGeometry = () => {
  const mirrored = PLANE.slice(1, -1)
    .reverse()
    .map(([x, y]) => [x, -y])
  return new ShapeGeometry(
    new Shape([...PLANE, ...mirrored].map(([x, y]) => new Vector2(x, y)))
  )
}

// Short quads along the route, each corner knowing how far along it is
const dashGeometry = (route: QuadraticBezierCurve3) => {
  const length = route.getLength()
  const positions: number[] = []
  const along: number[] = []
  const index: number[] = []
  for (let s = 0; s < length; s += DASH + DASH_GAP) {
    const ends = [s / length, Math.min(s + DASH, length) / length]
    const [a, b] = ends.map((u) => route.getPointAt(u))
    const side = new Vector3(a.y - b.y, b.x - a.x, 0).setLength(DASH_WIDTH / 2)
    const first = positions.length / 3
    ;[a, b].forEach((p, i) => {
      positions.push(p.x + side.x, p.y + side.y, 0)
      positions.push(p.x - side.x, p.y - side.y, 0)
      along.push(ends[i], ends[i])
    })
    index.push(first, first + 1, first + 2, first + 1, first + 3, first + 2)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('along', new Float32BufferAttribute(along, 1))
  geometry.setIndex(index)
  return geometry
}

// The dashes light themselves: shown only as far as the route is drawn, and
// brighter than white just behind the plane, fading back down its wake
const routeMaterial = () =>
  new ShaderMaterial({
    uniforms: {
      drawn: { value: 0 },
      plane: { value: 0 },
      // How lit the wake is, 0 to 1, and how far back down the route it fades
      wake: { value: 0 },
      tail: { value: WAKE },
      hot: { value: HOT }
    },
    vertexShader: /* glsl */ `
      attribute float along;
      varying float vAlong;

      void main() {
        vAlong = along;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float drawn;
      uniform float plane;
      uniform float wake;
      uniform float tail;
      uniform float hot;
      varying float vAlong;

      void main() {
        if (vAlong > drawn) discard;
        float behind = plane - vAlong;
        float lit = behind < 0.0 ? 0.0 : wake * exp(-behind / tail);
        gl_FragColor = vec4(vec3(0.8 + (hot - 0.8) * lit), 1.0);
      }
    `,
    side: DoubleSide
  })

// Which flight it is and how far through it, or undefined while it rests
const flightAt = (elapsed: number) => {
  const first = elapsed - FIRST_AT_MS
  if (first < 0) return undefined
  if (first < FIRST_MS) return { n: 0, t: first / FIRST_MS }
  const since = first - FIRST_MS
  const into = (since % (REST_MS + FLY_MS)) - REST_MS
  if (into < 0) return undefined
  return { n: 1 + Math.floor(since / (REST_MS + FLY_MS)), t: into / FLY_MS }
}

export const addProjectContent = async (viewport: Viewport) => {
  const version = viewport.contentVersion
  const [font, mono] = await Promise.all([
    loadFont('/fonts/helvetiker_regular.typeface.json'),
    loadFont('/fonts/droid_sans_mono_regular.typeface.json')
  ])
  if (viewport.contentVersion !== version) return

  const heading = createStandardText(font, 'WAYPOINT LOG', {
    size: HEADING_SIZE
  })
  const underline = new ThreeDNode(
    new Mesh(new PlaneGeometry(16, 0.6), new MeshBasicMaterial())
  )
  const subtitle = createStandardText(font, 'Personal pilot logbook', {
    size: SUBTITLE_SIZE
  })
  const stack = createStandardText(font, STACK, { size: STACK_SIZE })
  const hacked = createHackedText(mono, '>WAYPOINTLOG.COM', { size: LINK_SIZE })
  const link = hacked.node
  openOnClick(link, SITE)
  const stops = WAYPOINTS.map((stop) => ({
    title: createStandardText(font, stop.title, { size: STOP_SIZE }),
    detail: createStandardText(font, stop.detail, { size: DETAIL_SIZE })
  }))

  // The arc if it fits well enough, else the route down the board, which
  // bows away from the words beside it and is centred with them
  const words = Math.max(
    ...stops.flatMap(({ title, detail }) => [title.size.x, detail.size.x])
  )
  const lines = Math.max(heading.size.x, stack.size.x, link.size.x)
  const room = FILL * 2 * viewport.halfWidthAt(viewport.facingCameraPos.z)
  const arcWidth = 2 * ARC.span + words
  const dropWidth = RING.outer + DROP.bow + BESIDE.x + words
  const wide = room / arcWidth >= MIN_WIDE
  const layout = wide ? WIDE : NARROW
  const fit = Math.min(1, room / Math.max(wide ? arcWidth : dropWidth, lines))
  const dropX = (RING.outer + DROP.bow - BESIDE.x - words) / 2
  const route = wide
    ? new QuadraticBezierCurve3(
        new Vector3(-ARC.span, ARC.y, 0),
        new Vector3(0, ARC.y + 2 * ARC.rise, 0),
        new Vector3(ARC.span, ARC.y, 0)
      )
    : new QuadraticBezierCurve3(
        new Vector3(dropX, DROP.top, 0),
        new Vector3(dropX - 2 * DROP.bow, (DROP.top + DROP.bottom) / 2, 0),
        new Vector3(dropX, DROP.bottom, 0)
      )

  const board = new ThreeDNode(new Mesh())
  board.object.position.set(0, CENTRE, 0)
  board.object.scale.setScalar(fit)

  const dashes = routeMaterial()
  const routeMesh = new Mesh(dashGeometry(route), dashes)

  const planeMaterial = new MeshBasicMaterial({
    transparent: true,
    side: DoubleSide
  })
  planeMaterial.color.setScalar(PLANE_LIGHT)
  const plane = new Mesh(planeGeometry(), planeMaterial)
  plane.visible = false

  // Each waypoint, evenly spaced along the route, and where its words land
  const ringGeometry = new RingGeometry(RING.inner, RING.outer, 40)
  const dotGeometry = new CircleGeometry(DOT, 20)
  const marks = stops.map(({ title, detail }, i) => {
    const u = i / (stops.length - 1)
    const at = route.getPointAt(u)
    const material = new MeshBasicMaterial()
    const ring = new Mesh(ringGeometry, material)
    ring.add(new Mesh(dotGeometry, material))
    ring.position.set(at.x, at.y, 0.2)
    ring.visible = false
    const ripple = new Mesh(
      ringGeometry,
      new MeshBasicMaterial({ transparent: true })
    )
    ripple.position.copy(ring.position)
    ripple.visible = false
    const left = at.x + BESIDE.x
    const titleAt = wide
      ? { x: at.x, y: at.y + UNDER.title }
      : { x: left + title.size.x / 2, y: at.y + BESIDE.title }
    const detailAt = wide
      ? { x: at.x, y: at.y + UNDER.detail }
      : { x: left + detail.size.x / 2, y: at.y + BESIDE.detail }
    title.object.visible = false
    detail.object.visible = false
    return { u, ring, material, ripple, titleAt, detailAt, rippledAt: -1e9 }
  })

  // A waypoint's first showing: the ring pops up and its words rise in
  const reveal = (i: number) => {
    const { ring, titleAt, detailAt } = marks[i]
    if (ring.visible) return
    ring.visible = true
    ring.scale.setScalar(0.001)
    new Tween(ring.scale, viewport.tweenGroup)
      .to({ x: 1, y: 1, z: 1 }, 500)
      .easing(Easing.Back.Out)
      .start()
    const { title, detail } = stops[i]
    settle(viewport, title, titleAt, {
      dy: -8,
      z: 30,
      delay: 60,
      duration: 550
    })
    settle(viewport, detail, detailAt, {
      dy: -8,
      z: 30,
      delay: 150,
      duration: 550
    })
  }

  // The heading drops in and is underlined, then the rest rises in under it
  settle(
    viewport,
    heading,
    { x: 0, y: layout.heading },
    { dy: 18, z: 40, delay: 0, duration: 700 }
  )
  underline.object.position.set(0, layout.heading - 8, 0.1)
  underline.object.scale.set(0.001, 1, 1)
  new Tween(underline.object.scale, viewport.tweenGroup)
    .to({ x: 1 }, 450)
    .easing(Easing.Cubic.Out)
    .delay(350)
    .start()
  settle(
    viewport,
    subtitle,
    { x: 0, y: layout.subtitle },
    { dy: -10, z: 30, delay: 250, duration: 600 }
  )
  settle(
    viewport,
    stack,
    { x: 0, y: layout.stack },
    { dy: -10, z: 30, delay: 350, duration: 600 }
  )

  // The link glides in from the right, out of the depth, decoding itself
  const linkStart = { x: 60, y: layout.link, z: 40 }
  link.object.position.set(linkStart.x, linkStart.y, linkStart.z)
  link.object.visible = false
  createTranslationAnimation({
    object: link.object,
    start: linkStart,
    end: { x: 0, y: layout.link, z: 0 },
    easing: Easing.Cubic.Out,
    duration: 700,
    group: viewport.tweenGroup
  })
    .delay(450)
    .onStart(() => {
      link.object.visible = true
      hacked.reveal(performance.now())
    })
    .start()

  // Reduced motion shows the route drawn and every waypoint, and the plane
  // never flies
  const start = performance.now()
  const tangent = new Vector3()
  let flying = -1
  let reached = 0
  const frame = () => {
    const now = performance.now()
    const elapsed = now - start
    hacked.update(now, link.isRayCasted)

    const flight = reducedMotion.matches ? undefined : flightAt(elapsed)
    if (flight) {
      if (flight.n !== flying) {
        flying = flight.n
        reached = 0
      }
      const u = Easing.Sinusoidal.InOut(flight.t)
      route.getPointAt(u, plane.position)
      plane.position.z = 0.5
      route.getTangentAt(u, tangent)
      plane.rotation.z = Math.atan2(tangent.y, tangent.x)
      // Fades in as it sets off and out as it lands
      planeMaterial.opacity = Math.min(1, flight.t / 0.08, (1 - flight.t) / 0.1)
      while (reached < marks.length && u >= marks[reached].u - ARRIVE) {
        reveal(reached)
        marks[reached].rippledAt = now
        reached++
      }
      dashes.uniforms.plane.value = u
      if (flight.n === 0) dashes.uniforms.drawn.value = u
    }
    plane.visible = !!flight
    dashes.uniforms.wake.value = flight ? planeMaterial.opacity : 0

    // Once the first flight is over everything shows, even if its frames
    // were missed while the page was hidden
    if (reducedMotion.matches || elapsed >= FIRST_AT_MS + FIRST_MS) {
      dashes.uniforms.drawn.value = 1
      marks.forEach((_, i) => reveal(i))
    }

    marks.forEach(({ material, ripple, rippledAt }, i) => {
      const k = (now - rippledAt) / RIPPLE_MS
      const rippling = k >= 0 && k < 1
      ripple.visible = rippling
      if (rippling) {
        ripple.scale.setScalar(1 + RIPPLE_GROWTH * k)
        ripple.material.opacity = 0.8 * (1 - k)
      }
      const flare = 1 + (HOT - 1) * (rippling ? (1 - k) ** 2 : 0)
      material.color.setScalar(flare)
      ;(stops[i].title.object.material as MeshBasicMaterial).color.setScalar(
        flare
      )
    })
  }
  frame()
  viewport.addContentFrame(frame)

  board.object.add(
    heading.object,
    underline.object,
    subtitle.object,
    routeMesh,
    plane,
    ...marks.flatMap(({ ring, ripple }) => [ring, ripple]),
    ...stops.flatMap(({ title, detail }) => [title.object, detail.object]),
    stack.object
  )
  // The link is added to the viewport so it's hovered and clicked, then
  // moved onto the board so it's scaled with the rest
  viewport.addToContentGroup(board, link)
  board.object.add(link.object)
}
