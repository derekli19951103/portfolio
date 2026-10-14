import { Easing, Tween } from '@tweenjs/tween.js'
import { MathUtils, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three'
import { createTranslationAnimation } from '../../engine/animations/text-animations'
import { loadFont } from '../../engine/loaders/font-loader'
import { createStandardText } from '../../engine/objects/StandardText'
import ThreeDNode from '../../engine/ThreeDNode'
import Viewport from '../../engine/Viewport'
import { PLANE_HEIGHT, PLANE_WIDTH } from 'constant'

// Core Skills from public/resume.html, four per group so the board stays uncrowded
export const skillGroups = [
  { title: 'AI & AGENTS', items: ['Claude Code', 'MCP', 'Gemini', 'RAG'] },
  { title: 'FRONTEND', items: ['React', 'Next.js', 'TypeScript', 'Three.js'] },
  { title: 'BACKEND', items: ['Node.js', 'Rust', 'Python', 'GraphQL'] },
  { title: 'DATA', items: ['PostgreSQL', 'MySQL', 'Redis', 'MongoDB'] },
  { title: 'CLOUD', items: ['AWS', 'Terraform', 'Docker', 'GitHub Actions'] }
]

// The jet game drops these as targets
export const tools = skillGroups.flatMap((g) =>
  g.items.map((title) => ({ title }))
)

const HEADER_SIZE = 7.5
const ITEM_SIZE = 6.2
const UNDERLINE_Y = -7
const FIRST_ITEM_Y = -18
const ITEM_SPACING = 12
const COLUMN_GAP = 14
const ROW_GAP = 16
// Share of the visible board the grid may fill, and the smallest scale a
// layout may shrink to before more rows are tried
const FILL = 0.86
const MIN_SCALE = 0.7

// A group's extent around its header's centre line
const GROUP_TOP = 3
const GROUP_BOTTOM =
  FIRST_ITEM_Y -
  (Math.max(...skillGroups.map((g) => g.items.length)) - 1) * ITEM_SPACING -
  3
const GROUP_HEIGHT = GROUP_TOP - GROUP_BOTTOM

// Width of a centred row of columns spaced `pitch` apart
const rowSpan = (widths: number[], pitch: number) =>
  (widths.length - 1) * pitch + Math.max(widths[0], widths[widths.length - 1])

// One row when the board is in full view; stacked rows when the screen is too
// narrow (a phone in portrait sees about a third of the board)
const fitLayout = (viewport: Viewport, widths: number[], pitch: number) => {
  const { fov, aspect } = viewport.camera
  const visibleWidth =
    2 *
    viewport.facingCameraPos.z *
    Math.tan(MathUtils.degToRad(fov / 2)) *
    aspect
  const maxWidth = Math.min(visibleWidth, PLANE_WIDTH) * FILL
  const maxHeight = PLANE_HEIGHT * FILL

  let best = { perRow: widths.length, scale: 0 }
  for (let rows = 1; rows <= 3; rows++) {
    const perRow = Math.ceil(widths.length / rows)
    let width = 0
    for (let r = 0; r < rows; r++) {
      const row = widths.slice(r * perRow, (r + 1) * perRow)
      if (row.length) width = Math.max(width, rowSpan(row, pitch))
    }
    const height = rows * GROUP_HEIGHT + (rows - 1) * ROW_GAP
    const scale = Math.min(1, maxWidth / width, maxHeight / height)
    if (scale >= MIN_SCALE) return { perRow, scale }
    if (scale > best.scale) best = { perRow, scale }
  }
  return best
}

// Hidden until its turn, then glides into place
const settle = (
  viewport: Viewport,
  node: ThreeDNode,
  end: { x: number; y: number },
  from: { dy: number; z: number; delay: number; duration: number }
) => {
  const start = { x: end.x, y: end.y + from.dy, z: from.z }
  node.object.position.set(start.x, start.y, start.z)
  node.object.visible = false

  createTranslationAnimation({
    object: node.object,
    start,
    end: { ...end, z: 0 },
    easing: Easing.Cubic.Out,
    duration: from.duration,
    group: viewport.tweenGroup
  })
    .delay(from.delay)
    .onStart(() => {
      node.object.visible = true
    })
    .start()
}

export const addToolsContent = async (viewport: Viewport) => {
  const font = await loadFont('/fonts/helvetiker_regular.typeface.json')

  const groups = skillGroups.map((g) => ({
    header: createStandardText(font, g.title, { size: HEADER_SIZE }),
    underline: new ThreeDNode(
      new Mesh(new PlaneGeometry(14, 0.6), new MeshBasicMaterial())
    ),
    items: g.items.map((title) =>
      createStandardText(font, title, { size: ITEM_SIZE })
    )
  }))

  // Even spacing between column centres, wide enough for the widest neighbours
  const widths = groups.map(({ header, items }) =>
    Math.max(header.size.x, ...items.map((t) => t.size.x))
  )
  const pitch =
    Math.max(...widths.slice(1).map((w, i) => (widths[i] + w) / 2)) +
    COLUMN_GAP
  const { perRow, scale } = fitLayout(viewport, widths, pitch)
  const rows = Math.ceil(groups.length / perRow)
  const height = rows * GROUP_HEIGHT + (rows - 1) * ROW_GAP

  groups.forEach(({ header, underline, items }, i) => {
    const row = Math.floor(i / perRow)
    const inRow = Math.min(perRow, groups.length - row * perRow)
    const x = (i - row * perRow - (inRow - 1) / 2) * pitch * scale
    const y =
      PLANE_HEIGHT / 2 +
      (height / 2 - GROUP_TOP - row * (GROUP_HEIGHT + ROW_GAP)) * scale
    const delay = i * 90

    header.object.scale.setScalar(scale)
    settle(viewport, header, { x, y }, { dy: 18, z: 40, delay, duration: 700 })

    // Draws itself in under the header once the header has landed
    underline.object.position.set(x, y + UNDERLINE_Y * scale, 0.1)
    underline.object.scale.set(0.001, scale, scale)
    new Tween(underline.object.scale, viewport.tweenGroup)
      .to({ x: scale }, 450)
      .easing(Easing.Cubic.Out)
      .delay(delay + 350)
      .start()

    items.forEach((t, j) => {
      t.object.scale.setScalar(scale)
      settle(
        viewport,
        t,
        { x, y: y + (FIRST_ITEM_Y - j * ITEM_SPACING) * scale },
        { dy: -10, z: 30, delay: delay + 300 + j * 70, duration: 550 }
      )
    })
  })

  viewport.addToContentGroup(
    ...groups.flatMap(({ header, underline, items }) => [
      header,
      underline,
      ...items
    ])
  )
}
