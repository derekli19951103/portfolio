import { Easing } from '@tweenjs/tween.js'
import { Vector3 } from 'three'
import { createTranslationAnimation } from '../../engine/animations/text-animations'
import { loadFont } from '../../engine/loaders/font-loader'
import { createStandardText } from '../../engine/objects/StandardText'
import { getRandomPointInInterval } from '../../engine/utils/math'
import Viewport from '../../engine/Viewport'
import { PLANE_HEIGHT } from 'constant'
import { TransparentBox } from 'engine/objects/TransparentBox'

export const tools = [
  { title: 'React', size: 18, pos: { x: -140, y: PLANE_HEIGHT / 2 } },
  { title: 'Next.js', size: 12, pos: { x: -140, y: PLANE_HEIGHT / 2 - 30 } },
  { title: 'Three.js', size: 12, pos: { x: -140, y: PLANE_HEIGHT / 2 - 60 } },
  { title: 'Angular', size: 12, pos: { x: -140, y: PLANE_HEIGHT / 2 + 30 } },
  { title: 'Typescript', size: 12, pos: { x: -140, y: PLANE_HEIGHT / 2 + 60 } },

  { title: 'Rust', size: 18, pos: { x: -50, y: PLANE_HEIGHT / 2 } },
  { title: 'Actix Web', size: 12, pos: { x: -50, y: PLANE_HEIGHT / 2 - 30 } },
  { title: 'Node.js', size: 12, pos: { x: -50, y: PLANE_HEIGHT / 2 - 60 } },
  { title: 'Diesel', size: 12, pos: { x: -50, y: PLANE_HEIGHT / 2 + 30 } },
  { title: 'Prisma', size: 12, pos: { x: -50, y: PLANE_HEIGHT / 2 + 60 } },

  { title: 'Docker', size: 18, pos: { x: 50, y: PLANE_HEIGHT / 2 } },
  { title: 'AWS', size: 12, pos: { x: 50, y: PLANE_HEIGHT / 2 - 30 } },
  { title: 'Terraform', size: 12, pos: { x: 50, y: PLANE_HEIGHT / 2 - 60 } },
  {
    title: 'Github Action',
    size: 12,
    pos: { x: 50, y: PLANE_HEIGHT / 2 + 30 }
  },
  { title: 'Kubernetes', size: 12, pos: { x: 50, y: PLANE_HEIGHT / 2 + 60 } },

  { title: 'MySQL', size: 12, pos: { x: 150, y: PLANE_HEIGHT / 2 } },
  { title: 'PostgreSQL', size: 12, pos: { x: 150, y: PLANE_HEIGHT / 2 - 30 } },
  { title: 'Redis', size: 12, pos: { x: 150, y: PLANE_HEIGHT / 2 - 60 } },
  { title: 'Stripe', size: 12, pos: { x: 150, y: PLANE_HEIGHT / 2 + 30 } },
  {
    title: 'gRPC',
    size: 12,
    pos: { x: 150, y: PLANE_HEIGHT / 2 + 60 }
  }
]

export const addToolsContent = async (viewport: Viewport) => {
  const font = await loadFont('/fonts/helvetiker_regular.typeface.json')

  const nodes = tools.map((s) => {
    const { x, y } = s.pos
    const t = createStandardText(font, s.title, { size: s.size })
    t.object.add(TransparentBox(t))
    t.calculateWireframe(new Vector3(3, 3, 1))
    t.onRayCasted = (rayCasted) => {
      t.wire!.visible = rayCasted
    }
    createTranslationAnimation({
      object: t.object,
      start: {
        x: getRandomPointInInterval(-500, 500) - x,
        y: y + getRandomPointInInterval(-300, 300),
        z: 200
      },
      end: { x: x, y: y, z: 0 },
      easing: Easing.Linear.None,
      duration: getRandomPointInInterval(500, 800),
      group: viewport.tweenGroup
    }).start()

    return t
  })

  viewport.addToContentGroup(...nodes)
}
