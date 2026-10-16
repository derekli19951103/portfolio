import { Easing, Tween } from '@tweenjs/tween.js'
import { PLANE_HEIGHT } from 'constant'
import { createTranslationAnimation } from 'engine/animations/text-animations'
import { createHackedText } from 'engine/objects/HackedText'
import ThreeDNode from 'engine/ThreeDNode'
import {
  AdditiveBlending,
  Mesh,
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
// Each row is its icon with a hacked-looking ">REDIRECT" beside it, centred,
// narrow enough for a phone held upright
const ICON_SIZE = 40
const GAP = 12
const TEXT_SIZE = 7

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
  const font = await loadFont('/fonts/droid_sans_mono_regular.typeface.json')

  const nodes = links.flatMap(({ url, icon, y }, row) => {
    const delay = row * 180

    const hacked = createHackedText(font, '>REDIRECT', { size: TEXT_SIZE })
    const link = hacked.node
    openOnClick(link, url)
    const width = link.size.x
    const left = -(ICON_SIZE + GAP + width) / 2

    // The icon flips in like a card. It glows by itself, since the ambient
    // light alone leaves it dim.
    const texture = new TextureLoader().load(icon)
    const pic = new ThreeDNode(
      new Mesh(
        new PlaneGeometry(ICON_SIZE, ICON_SIZE),
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
    pic.object.position.set(left + ICON_SIZE / 2, y, 1)
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

    // The text glides in from the right, out of the depth, decoding itself
    // on the way. It glitches far more often while its row is hovered.
    const x = left + ICON_SIZE + GAP + width / 2
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
        hacked.reveal(performance.now())
      })
      .start()
    viewport.addContentFrame(() => {
      hacked.update(performance.now(), pic.isRayCasted || link.isRayCasted)
    })

    return [pic, link]
  })

  viewport.addToContentGroup(...nodes)
}
