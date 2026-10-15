import { Easing, Tween } from '@tweenjs/tween.js'
import { Mesh, MeshBasicMaterial, PlaneGeometry } from 'three'
import { mountAskPanel } from 'components/ask/panel'
import { createTranslationAnimation } from '../../engine/animations/text-animations'
import { loadFont } from '../../engine/loaders/font-loader'
import { createStandardText } from '../../engine/objects/StandardText'
import ThreeDNode from '../../engine/ThreeDNode'
import Viewport from '../../engine/Viewport'
import { PLANE_HEIGHT } from 'constant'

export const addAskContent = async (viewport: Viewport) => {
  // The chat is HTML laid over the board, removed when the tab changes
  viewport.addContentCleanup(mountAskPanel())

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
