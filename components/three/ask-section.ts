import { Easing, Tween } from '@tweenjs/tween.js'
import { Mesh, MeshBasicMaterial, PlaneGeometry } from 'three'
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js'
import { mountAskPanel } from 'components/ask/panel'
import { createTranslationAnimation } from '../../engine/animations/text-animations'
import { loadFont } from '../../engine/loaders/font-loader'
import { createStandardText } from '../../engine/objects/StandardText'
import ThreeDNode from '../../engine/ThreeDNode'
import Viewport from '../../engine/Viewport'
import { PLANE_HEIGHT } from 'constant'

// The chat hangs from just under the title's underline, a little in front of
// the board. Its widest, and its tallest as a share of the screen's height,
// in CSS pixels: it's sized so a CSS pixel spans a screen pixel from where
// the camera faces the board.
const PANEL_TOP = PLANE_HEIGHT - 38
const PANEL_Z = 1
const PANEL_WIDTH = 560
const PANEL_MARGIN = 32
const PANEL_HEIGHT = 0.56

export const addAskContent = async (viewport: Viewport) => {
  // The chat is HTML placed on the board in the scene, so it moves and tilts
  // with the board. It hangs in a holder sized for the screen, which lets
  // clicks through to the scene; only the panel takes them, and its text can
  // still be selected.
  const holder = document.createElement('div')
  holder.className = 'ask-holder'
  const panel = new CSS3DObject(holder)
  holder.style.pointerEvents = 'none'
  holder.style.userSelect = ''

  // Refitted when the screen turns or resizes; the chat itself is kept
  let fittedTo = ''
  const fit = () => {
    const size = `${viewport.width}x${viewport.height}`
    if (size === fittedTo) return
    fittedTo = size
    const perPixel =
      (2 * viewport.halfWidthAt(viewport.facingCameraPos.z - PANEL_Z)) /
      viewport.width
    const height = PANEL_HEIGHT * viewport.height
    holder.style.width = `${Math.min(PANEL_WIDTH, viewport.width - PANEL_MARGIN)}px`
    holder.style.height = `${height}px`
    panel.scale.setScalar(perPixel)
    panel.position.set(0, PANEL_TOP - (height * perPixel) / 2, PANEL_Z)
  }
  fit()
  viewport.addHtmlToContent(panel)
  viewport.addContentCleanup(mountAskPanel(holder))
  viewport.addContentFrame(fit)

  const font = await loadFont('/fonts/helvetiker_regular.typeface.json')
  const title = createStandardText(font, 'ASK MY AI', { size: 9 })
  const underline = new ThreeDNode(
    new Mesh(new PlaneGeometry(16, 0.6), new MeshBasicMaterial())
  )
  const y = PLANE_HEIGHT - 24

  const start = { x: 0, y: y + 18, z: 40 }
  title.object.position.set(start.x, start.y, start.z)
  createTranslationAnimation({
    object: title.object,
    start,
    end: { x: 0, y, z: 0 },
    easing: Easing.Cubic.Out,
    duration: 700,
    group: viewport.tweenGroup
  }).start()

  underline.object.position.set(0, y - 8, 0.1)
  underline.object.scale.set(0.001, 1, 1)
  new Tween(underline.object.scale, viewport.tweenGroup)
    .to({ x: 1 }, 450)
    .easing(Easing.Cubic.Out)
    .delay(350)
    .start()

  viewport.addToContentGroup(title, underline)
}
