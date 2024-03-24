import TWEEN from '@tweenjs/tween.js'
import { PLANE_HEIGHT, PLANE_WIDTH } from 'constant'
import { createTranslationAnimation } from 'engine/animations/text-animations'
import { loadFont } from 'engine/loaders/font-loader'
import { loadObj } from 'engine/loaders/OBJLoader'
import { createBreakingText } from 'engine/objects/BreakingText'
import { createStandardText } from 'engine/objects/StandardText'
import ThreeDNode from 'engine/ThreeDNode'
import { getRandomPointInInterval } from 'engine/utils/math'
import { BoxGeometry, Mesh, MeshBasicMaterial, Vector3 } from 'three'
import { Font } from 'three/examples/jsm/loaders/FontLoader'
import Viewport from '../../engine/Viewport'
import { tools } from './tools-section'

const words = ['UofT', 'Yufeng', 'Fullstack'].concat(
  ...tools.map((t) => t.title)
)
const wordDropSpeed = 5000
const bulletFiringSpeed = 200

export const addFighterJetGame = async (viewport: Viewport) => {
  const font = await loadFont('/fonts/helvetiker_regular.typeface.json')
  const frag = await (await fetch('/shaders/frag.glsl')).text()
  const vert = await (await fetch('/shaders/vert.glsl')).text()

  const mesh = new Mesh()
  mesh.add(await loadObj('/models/jet.obj'))
  mesh.rotation.set(Math.PI / 2, 0, 0)
  mesh.scale.set(1.5, 1.5, 1.5)
  const jet = new ThreeDNode(mesh)
  jet.object.userData = { isFightJet: true }

  const bulletMesh = new Mesh(
    new BoxGeometry(2, 10, 1),
    new MeshBasicMaterial()
  )

  viewport.addToContentGroup(jet)

  const bulletIntervalId = window.setInterval(() => {
    const bullet = new ThreeDNode(bulletMesh.clone())
    bullet.object.userData = { isBullet: true }
    const jetPos = jet.object.position.clone()
    createTranslationAnimation({
      object: bullet.object,
      start: jetPos,
      end: { ...jetPos, y: jet.object.position.y + 200 },
      easing: TWEEN.Easing.Linear.None,
      duration: bulletFiringSpeed
    })
      .onComplete(() => {
        viewport.removeNodeFromContentGroup(bullet)
      })
      .start()

    viewport.addToContentGroup(bullet)
  }, bulletFiringSpeed)

  viewport.addToActiveIntervals(bulletIntervalId)

  const wordsIntervalId = window.setInterval(() => {
    const randint = getRandomPointInInterval(0, words.length - 1)
    const randX = getRandomPointInInterval(-PLANE_WIDTH / 2, PLANE_WIDTH / 2)
    const word = words[randint]
    const node = createBreakingText(font, frag, vert, word, {
      size: 12,
      bevelEnabled: false
    })
    node.object.userData = {
      isWord: true,
      impactCount: 0,
      armor: word.length - 1
    }

    createTranslationAnimation({
      object: node.object,
      start: { x: randX, y: PLANE_HEIGHT, z: 0 },
      end: { x: randX, y: -30, z: 0 },
      easing: TWEEN.Easing.Linear.None,
      duration: wordDropSpeed
    })
      .onComplete(() => {
        viewport.removeNodeFromContentGroup(node)
      })
      .start()

    viewport.addToContentGroup(node)
  }, 500)

  viewport.addToActiveIntervals(wordsIntervalId)
}

export const addGameCountdown = async (viewport: Viewport) => {
  const font = await loadFont('/fonts/helvetiker_regular.typeface.json')

  let i = 3

  const countdownIntervalId = window.setInterval(() => {
    if (i > 0) {
      const node = createStandardText(font, `${i}`, {
        size: 30
      })

      createTranslationAnimation({
        object: node.object,
        start: { x: 0, y: PLANE_HEIGHT / 2, z: 0 },
        end: { x: 0, y: PLANE_HEIGHT / 2, z: 0 },
        easing: TWEEN.Easing.Linear.None,
        duration: 500
      })
        .onComplete(() => {
          i -= 1
          viewport.removeNodeFromContentGroup(node)
        })
        .start()

      viewport.addToContentGroup(node)
    }
  }, 1000)

  viewport.addToActiveIntervals(countdownIntervalId)
}

export const addGameOver = async (viewport: Viewport) => {
  const font = await loadFont('/fonts/helvetiker_regular.typeface.json')

  const gameOver = createStandardText(font, 'Game Over', { size: 50 })
  gameOver.object.position.y = PLANE_HEIGHT / 2 + 25
  viewport.addToContentGroup(gameOver)

  const restart = createStandardText(font, 'Restart', { size: 25 })
  restart.calculateWireframe(new Vector3(4, 4, 1))
  restart.object.position.y = PLANE_HEIGHT / 4
  restart.onRayCasted = (rayCasted) => {
    restart.wire!.visible = rayCasted
  }
  restart.onSelected = () => {
    viewport.restartJetGame()
  }
  viewport.addToContentGroup(gameOver, restart)
}
