import { Easing, Tween } from '@tweenjs/tween.js'
import { PLANE_HEIGHT, PLANE_WIDTH } from 'constant'
import { createTranslationAnimation } from 'engine/animations/text-animations'
import { TransparentBox } from 'engine/objects/TransparentBox'
import { createWireframeText } from 'engine/objects/WireframeText'
import ThreeDNode from 'engine/ThreeDNode'
import {
  AdditiveBlending,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  TextureLoader
} from 'three'
import { loadFont } from '../../engine/loaders/font-loader'
import Viewport from '../../engine/Viewport'

const links = [
  {
    url: 'https://www.linkedin.com/in/yufeng-li-567a3517a/',
    icon: '/textures/linkedin.jpg',
    y: PLANE_HEIGHT / 2 + 40
  },
  {
    url: 'https://github.com/derekli19951103',
    icon: '/textures/github.jpg',
    y: PLANE_HEIGHT / 2 - 40
  }
]
const ICON_X = -PLANE_WIDTH / 2 + 60
// URLs start just right of their icons, so both rows line up
const TEXT_LEFT = ICON_X + 30

// Opens on every click: selection toggles, so a plain handler skipped every
// other one
const openOnClick = (node: ThreeDNode, url: string) => {
  node.object.userData = { isLink: true }
  node.onSelected = (selected) => {
    if (!selected) return
    window.open(url, '_blank', 'noopener')
    node.setSelected(false)
  }
}

export const addContactContent = async (viewport: Viewport) => {
  const font = await loadFont('/fonts/helvetiker_regular.typeface.json')

  const nodes = links.flatMap(({ url, icon, y }, row) => {
    const delay = row * 180

    // The icon flips in like a card. It glows by itself, since this tab has
    // no spotlight and the ambient light alone leaves it dim.
    const texture = new TextureLoader().load(icon)
    const pic = new ThreeDNode(
      new Mesh(
        new PlaneGeometry(40, 40),
        new MeshStandardMaterial({
          map: texture,
          emissive: 0xffffff,
          emissiveMap: texture,
          emissiveIntensity: 1,
          blending: AdditiveBlending
        })
      )
    )
    openOnClick(pic, url)
    pic.object.position.set(ICON_X, y, 1)
    pic.object.scale.setScalar(0.001)
    pic.object.rotation.y = -Math.PI
    new Tween(pic.object.scale, viewport.tweenGroup)
      .to({ x: 1, y: 1, z: 1 }, 700)
      .easing(Easing.Back.Out)
      .delay(delay)
      .start()
    new Tween(pic.object.rotation, viewport.tweenGroup)
      .to({ y: 0 }, 700)
      .easing(Easing.Cubic.Out)
      .delay(delay)
      .start()

    // The URL glides in from the right, out of the depth
    const link = createWireframeText(font, url, { size: 8 })
    link.object.add(TransparentBox(link))
    openOnClick(link, url)
    const width = link.size.x
    const x = TEXT_LEFT + width / 2
    const start = { x: x + 60, y, z: 40 }
    link.object.position.set(start.x, start.y, start.z)
    link.object.visible = false
    createTranslationAnimation({
      object: link.object,
      start,
      end: { x, y, z: 0 },
      easing: Easing.Cubic.Out,
      duration: 700,
      group: viewport.tweenGroup
    })
      .delay(delay + 120)
      .onStart(() => {
        link.object.visible = true
      })
      .start()

    // Then an underline draws itself left to right, marking it as a link
    const underlineGeometry = new PlaneGeometry(width, 0.6)
    underlineGeometry.translate(width / 2, 0, 0)
    const underline = new ThreeDNode(
      new Mesh(underlineGeometry, new MeshBasicMaterial())
    )
    underline.object.position.set(TEXT_LEFT, y - 7, 0.1)
    underline.object.scale.set(0.001, 1, 1)
    new Tween(underline.object.scale, viewport.tweenGroup)
      .to({ x: 1 }, 500)
      .easing(Easing.Cubic.Out)
      .delay(delay + 550)
      .start()

    return [pic, link, underline]
  })

  viewport.addToContentGroup(...nodes)
}
