import { Easing } from '@tweenjs/tween.js'
import { createDupText } from 'engine/objects/DupText'
import { Coord2 } from 'types/utils'
import { createTranslationAnimation } from '../../engine/animations/text-animations'
import { loadFont } from '../../engine/loaders/font-loader'
import Viewport from '../../engine/Viewport'
import { PLANE_HEIGHT, PLANE_WIDTH } from 'constant'
import { TransparentBox } from 'engine/objects/TransparentBox'

export const paragraph = [
  'Easygoing & Practical',
  'Cat person',
  'Web Developing',
  'Computer Vision',
  'Love to Experiment'
]

export const addIntroContent = async (viewport: Viewport) => {
  const langs: { title: string; pos: Coord2 }[] = []
  paragraph.forEach((p, i) => {
    langs.push({
      title: p,
      pos: { x: -PLANE_WIDTH / 2 + 20, y: PLANE_HEIGHT - i * 30 - 16 }
    })
  })

  const font = await loadFont('/fonts/helvetiker_regular.typeface.json')

  const nodes = langs.map((s, i) => {
    const { x, y } = s.pos
    const t = createDupText(font, s.title, { size: 18 }, viewport.tweenGroup)
    t.object.add(TransparentBox(t))

    const xcaliber = x + t.size.x / 2

    createTranslationAnimation({
      object: t.object,
      start: {
        x: xcaliber,
        y: y - 200 - i * 30,
        z: t.object.position.z
      },
      end: { x: xcaliber, y: y, z: t.object.position.z },
      easing: Easing.Linear.None,
      group: viewport.tweenGroup
    }).start()

    return t
  })

  viewport.addToContentGroup(...nodes)
}
