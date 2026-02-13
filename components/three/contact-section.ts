import { Easing } from '@tweenjs/tween.js'
import { PLANE_HEIGHT, PLANE_WIDTH } from 'constant'
import { createTranslationAnimation } from 'engine/animations/text-animations'
import { TransparentBox } from 'engine/objects/TransparentBox'
import { createWireframeText } from 'engine/objects/WireframeText'
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

export const addContactContent = async (viewport: Viewport) => {
  const font = await loadFont('/fonts/helvetiker_regular.typeface.json')

  const linkedInMesh = new Mesh(
    new PlaneGeometry(40, 40),
    new MeshStandardMaterial({
      map: new TextureLoader().load('/textures/linkedin.jpg'),
      blending: AdditiveBlending
    })
  )

  const linkedInPic = new ThreeDNode(linkedInMesh)

  const githubMesh = new Mesh(
    new PlaneGeometry(40, 40),
    new MeshStandardMaterial({
      map: new TextureLoader().load('/textures/github.jpg'),
      blending: AdditiveBlending
    })
  )

  const githubPic = new ThreeDNode(githubMesh)

  const linkedinLink = createWireframeText(
    font,
    'https://www.linkedin.com/in/yufeng-li-567a3517a/',
    {
      size: 8
    }
  )
  const githubLink = createWireframeText(
    font,
    'https://github.com/derekli19951103',
    {
      size: 8
    }
  )
  linkedinLink.object.add(TransparentBox(linkedinLink))
  githubLink.object.add(TransparentBox(githubLink))

  linkedinLink.onSelected = (selected) => {
    if (selected) {
      window.open('https://www.linkedin.com/in/yufeng-li-567a3517a/')
    }
  }
  githubLink.onSelected = (selected) => {
    if (selected) {
      window.open('https://github.com/derekli19951103')
    }
  }

  createTranslationAnimation({
    object: linkedInPic.object,
    start: {
      x: -PLANE_WIDTH / 2 - 80,
      y: PLANE_HEIGHT / 2 + 40,
      z: 1
    },
    end: { x: -PLANE_WIDTH / 2 + 60, y: PLANE_HEIGHT / 2 + 40, z: 1 },
    easing: Easing.Linear.None,
    duration: 500,
    group: viewport.tweenGroup
  }).start()

  createTranslationAnimation({
    object: linkedinLink.object,
    start: {
      x: 200,
      y: PLANE_HEIGHT / 2 + 40,
      z: 0
    },
    end: { x: -PLANE_WIDTH / 2 + 220, y: PLANE_HEIGHT / 2 + 40, z: 0 },
    easing: Easing.Linear.None,
    duration: 500,
    group: viewport.tweenGroup
  }).start()

  createTranslationAnimation({
    object: githubPic.object,
    start: {
      x: -PLANE_WIDTH / 2 - 80,
      y: PLANE_HEIGHT / 2 - 40,
      z: 1
    },
    end: { x: -PLANE_WIDTH / 2 + 60, y: PLANE_HEIGHT / 2 - 40, z: 1 },
    easing: Easing.Linear.None,
    duration: 500,
    group: viewport.tweenGroup
  }).start()

  createTranslationAnimation({
    object: githubLink.object,
    start: {
      x: 200,
      y: PLANE_HEIGHT / 2 - 40,
      z: 0
    },
    end: { x: -PLANE_WIDTH / 2 + 220, y: PLANE_HEIGHT / 2 - 40, z: 0 },
    easing: Easing.Linear.None,
    duration: 500,
    group: viewport.tweenGroup
  }).start()

  viewport.addToContentGroup(linkedInPic, linkedinLink, githubPic, githubLink)
}
