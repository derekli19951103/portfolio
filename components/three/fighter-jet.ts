import { Easing, Tween } from '@tweenjs/tween.js'
import { PLANE_HEIGHT, PLANE_WIDTH } from 'constant'
import { createTranslationAnimation } from 'engine/animations/text-animations'
import { loadFont } from 'engine/loaders/font-loader'
import { loadObj } from 'engine/loaders/OBJLoader'
import { createBreakingText } from 'engine/objects/BreakingText'
import { createStandardText } from 'engine/objects/StandardText'
import ThreeDNode from 'engine/ThreeDNode'
import { getRandomPointInInterval } from 'engine/utils/math'
import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  Shape,
  SphereGeometry,
  Vector3
} from 'three'
import { Font } from 'three/examples/jsm/loaders/FontLoader'
import Viewport from '../../engine/Viewport'
import { tools } from './tools-section'

export const spawnExplosion = (viewport: Viewport, position: Vector3) => {
  const particleCount = 8
  const particleGeo = new SphereGeometry(1.5, 6, 6)
  for (let i = 0; i < particleCount; i++) {
    const mat = new MeshBasicMaterial({
      color: i % 2 === 0 ? 0xff4400 : 0xffaa00
    })
    const particle = new ThreeDNode(new Mesh(particleGeo.clone(), mat))
    particle.object.userData = { isExplosion: true }
    const angle = (i / particleCount) * Math.PI * 2
    const speed = 20 + Math.random() * 15
    const endX = position.x + Math.cos(angle) * speed
    const endY = position.y + Math.sin(angle) * speed
    createTranslationAnimation({
      object: particle.object,
      start: { x: position.x, y: position.y, z: position.z },
      end: { x: endX, y: endY, z: position.z },
      easing: Easing.Quadratic.Out,
      duration: 400,
      group: viewport.tweenGroup
    })
      .onComplete(() => {
        viewport.removeNodeFromContentGroup(particle)
      })
      .start()
    viewport.addToContentGroup(particle)
  }
}

const words = ['UofT', 'Yufeng', 'Fullstack'].concat(
  ...tools.map((t) => t.title)
)
const wordDropSpeed = 8000
const bulletFiringSpeed = 400

const fireBullet = (
  viewport: Viewport,
  bulletMesh: Mesh,
  jetPos: Vector3,
  angleOffset: number
) => {
  const bullet = new ThreeDNode(bulletMesh.clone())
  bullet.object.userData = { isBullet: true }
  const rad = (angleOffset * Math.PI) / 180
  const endX = jetPos.x + Math.sin(rad) * 200
  const endY = jetPos.y + Math.cos(rad) * 200
  createTranslationAnimation({
    object: bullet.object,
    start: { x: jetPos.x, y: jetPos.y, z: jetPos.z },
    end: { x: endX, y: endY, z: jetPos.z },
    easing: Easing.Linear.None,
    duration: bulletFiringSpeed,
    group: viewport.tweenGroup
  })
    .onComplete(() => {
      viewport.removeNodeFromContentGroup(bullet)
    })
    .start()
  viewport.addToContentGroup(bullet)
}

export const addFighterJetGame = async (viewport: Viewport) => {
  const font = await loadFont('/fonts/helvetiker_regular.typeface.json')
  const frag = await (await fetch('/shaders/frag.glsl')).text()
  const vert = await (await fetch('/shaders/vert.glsl')).text()

  const mesh = new Mesh()
  mesh.add(await loadObj('/models/jet.obj'))
  mesh.rotation.set(Math.PI / 2, 0, 0)
  mesh.scale.set(1.5, 1.5, 1.5)
  const jet = new ThreeDNode(mesh)
  jet.object.userData = { isFightJet: true, lives: 3, bulletCount: 1, immune: false, heartGeo: null, kills: 0 }

  // Immunity aura ring — attached to jet, hidden by default
  const auraMesh = new Mesh(
    new RingGeometry(12, 14, 32),
    new MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.5, side: DoubleSide })
  )
  auraMesh.userData = { isAura: true }
  auraMesh.rotation.x = Math.PI / 2
  auraMesh.visible = false
  jet.object.add(auraMesh)

  // Bullet — tapered cylinder (missile shape)
  const bulletMesh = new Mesh(
    new CylinderGeometry(0.5, 1.5, 10, 6),
    new MeshBasicMaterial({ color: 0xffaa00 })
  )

  viewport.addToContentGroup(jet)

  // Lives HUD — 3 heart shapes drawn with geometry
  const heartShape = new Shape()
  heartShape.moveTo(0, 4)
  heartShape.bezierCurveTo(0, 6, -3, 8, -5, 8)
  heartShape.bezierCurveTo(-8, 8, -8, 5, -8, 4)
  heartShape.bezierCurveTo(-8, 1, -5, -2, 0, -5)
  heartShape.bezierCurveTo(5, -2, 8, 1, 8, 4)
  heartShape.bezierCurveTo(8, 5, 8, 8, 5, 8)
  heartShape.bezierCurveTo(3, 8, 0, 6, 0, 4)
  const heartGeo = new ExtrudeGeometry(heartShape, {
    depth: 1,
    bevelEnabled: false
  })
  jet.object.userData.heartGeo = heartGeo
  for (let i = 0; i < 3; i++) {
    const heartMesh = new Mesh(heartGeo.clone(), new MeshBasicMaterial({ color: 0xff0000 }))
    const heart = new ThreeDNode(heartMesh)
    heart.object.userData = { isLifeHeart: true, heartIndex: i }
    heart.object.position.set(
      -PLANE_WIDTH / 2 + 20 + i * 20,
      PLANE_HEIGHT - 10,
      0
    )
    viewport.addToContentGroup(heart)
  }

  // Defeated counter HUD
  const killsHud = createStandardText(font, 'Defeated: 0', { size: 8 })
  killsHud.object.userData = { isKillsHud: true }
  killsHud.object.position.set(PLANE_WIDTH / 2 - 100, PLANE_HEIGHT - 10, 0)
  viewport.addToContentGroup(killsHud)

  // Bullet firing — redistributes bullets evenly within max 120° spread
  const maxSpreadDeg = 120
  const bulletIntervalId = window.setInterval(() => {
    const jetPos = jet.object.position.clone()
    const count = jet.object.userData.bulletCount as number
    if (count === 1) {
      fireBullet(viewport, bulletMesh, jetPos, 0)
    } else {
      const spread = Math.min(maxSpreadDeg, (count - 1) * 15)
      for (let b = 0; b < count; b++) {
        const angle = -spread / 2 + (spread / (count - 1)) * b
        fireBullet(viewport, bulletMesh, jetPos, angle)
      }
    }
  }, bulletFiringSpeed)

  viewport.addToActiveIntervals(bulletIntervalId)

  // Power-up spawn — star shape
  const starShape = new Shape()
  const outerRadius = 6
  const innerRadius = 3
  const points = 5
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius
    const angle = (i * Math.PI) / points - Math.PI / 2
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (i === 0) starShape.moveTo(x, y)
    else starShape.lineTo(x, y)
  }
  starShape.closePath()
  const powerUpMesh = new Mesh(
    new ExtrudeGeometry(starShape, { depth: 2, bevelEnabled: false }),
    new MeshBasicMaterial({ color: 0xffff00 })
  )
  const powerUpIntervalId = window.setInterval(() => {
    const randX = getRandomPointInInterval(-PLANE_WIDTH / 2, PLANE_WIDTH / 2)
    const powerUp = new ThreeDNode(powerUpMesh.clone())
    powerUp.object.userData = { isPowerUp: true }
    createTranslationAnimation({
      object: powerUp.object,
      start: { x: randX, y: PLANE_HEIGHT, z: 0 },
      end: { x: randX, y: -30, z: 0 },
      easing: Easing.Linear.None,
      duration: wordDropSpeed,
      group: viewport.tweenGroup
    })
      .onComplete(() => {
        viewport.removeNodeFromContentGroup(powerUp)
      })
      .start()
    viewport.addToContentGroup(powerUp)
  }, 8000)

  viewport.addToActiveIntervals(powerUpIntervalId)

  // Shield drop — shield shape
  const shieldShape = new Shape()
  shieldShape.moveTo(0, 6)
  shieldShape.lineTo(-5, 3)
  shieldShape.lineTo(-5, -2)
  shieldShape.quadraticCurveTo(-5, -6, 0, -8)
  shieldShape.quadraticCurveTo(5, -6, 5, -2)
  shieldShape.lineTo(5, 3)
  shieldShape.lineTo(0, 6)
  const shieldMesh = new Mesh(
    new ExtrudeGeometry(shieldShape, { depth: 1, bevelEnabled: false }),
    new MeshBasicMaterial({ color: 0x00ccff })
  )
  const shieldIntervalId = window.setInterval(() => {
    const randX = getRandomPointInInterval(-PLANE_WIDTH / 2, PLANE_WIDTH / 2)
    const shield = new ThreeDNode(shieldMesh.clone())
    shield.object.userData = { isShield: true }
    createTranslationAnimation({
      object: shield.object,
      start: { x: randX, y: PLANE_HEIGHT, z: 0 },
      end: { x: randX, y: -30, z: 0 },
      easing: Easing.Linear.None,
      duration: wordDropSpeed,
      group: viewport.tweenGroup
    })
      .onComplete(() => {
        viewport.removeNodeFromContentGroup(shield)
      })
      .start()
    viewport.addToContentGroup(shield)
  }, 12000)

  viewport.addToActiveIntervals(shieldIntervalId)

  // Heart drop — regain 1 life (max 3)
  const heartDropIntervalId = window.setInterval(() => {
    const randX = getRandomPointInInterval(-PLANE_WIDTH / 2, PLANE_WIDTH / 2)
    const dropMesh = new Mesh(heartGeo.clone(), new MeshBasicMaterial({ color: 0xff4488 }))
    const heartDrop = new ThreeDNode(dropMesh)
    heartDrop.object.userData = { isHeartDrop: true }
    createTranslationAnimation({
      object: heartDrop.object,
      start: { x: randX, y: PLANE_HEIGHT, z: 0 },
      end: { x: randX, y: -30, z: 0 },
      easing: Easing.Linear.None,
      duration: wordDropSpeed,
      group: viewport.tweenGroup
    })
      .onComplete(() => {
        viewport.removeNodeFromContentGroup(heartDrop)
      })
      .start()
    viewport.addToContentGroup(heartDrop)
  }, 15000)

  viewport.addToActiveIntervals(heartDropIntervalId)

  // Word spawning — gradual difficulty increase
  const gameStartTime = Date.now()
  const maxSpawnInterval = 2000 // start slow
  const minSpawnInterval = 300  // cap speed
  const rampDuration = 60000   // reach max difficulty over 60s

  const spawnWord = () => {
    const randint = getRandomPointInInterval(0, words.length - 1)
    const randX = getRandomPointInInterval(-PLANE_WIDTH / 2, PLANE_WIDTH / 2)
    const word = words[randint]
    const node = createBreakingText(font, frag, vert, word, {
      size: 12,
      bevelEnabled: false
    })

    const isZigzag = Math.random() < 0.4
    node.object.userData = {
      isWord: true,
      impactCount: 0,
      armor: word.length - 1,
      isZigzag,
      originalX: randX,
      zigzagSpeed: 2 + Math.random() * 3,
      zigzagAmplitude: 30 + Math.random() * 30
    }

    createTranslationAnimation({
      object: node.object,
      start: { x: randX, y: PLANE_HEIGHT, z: 0 },
      end: { x: randX, y: -30, z: 0 },
      easing: Easing.Linear.None,
      duration: wordDropSpeed,
      group: viewport.tweenGroup
    })
      .onComplete(() => {
        viewport.removeNodeFromContentGroup(node)
      })
      .start()

    viewport.addToContentGroup(node)

    // Schedule next spawn with decreasing interval
    const elapsed = Date.now() - gameStartTime
    const progress = Math.min(elapsed / rampDuration, 1)
    const interval = maxSpawnInterval - (maxSpawnInterval - minSpawnInterval) * progress
    const timeoutId = window.setTimeout(spawnWord, interval)
    viewport.addToActiveTimeouts(timeoutId)
  }

  const initialWordTimeout = window.setTimeout(spawnWord, maxSpawnInterval)
  viewport.addToActiveTimeouts(initialWordTimeout)
}

export const addGameCountdown = async (viewport: Viewport) => {
  const font = await loadFont('/fonts/helvetiker_regular.typeface.json')

  let i = 3
  const centerY = PLANE_HEIGHT / 2

  const countdownIntervalId = window.setInterval(() => {
    if (i > 0) {
      const text = i > 0 ? `${i}` : ''
      const node = createStandardText(font, text, { size: 10 })
      node.object.position.set(0, centerY, 0)
      node.object.scale.set(0.01, 0.01, 0.01)
      viewport.addToContentGroup(node)

      // Scale up with bounce
      new Tween({ s: 0.01 }, viewport.tweenGroup)
        .to({ s: 4 }, 400)
        .easing(Easing.Back.Out)
        .onUpdate(({ s }) => {
          node.object.scale.set(s, s, s)
        })
        .onComplete(() => {
          // Hold briefly, then explode outward and fade
          new Tween({ s: 4, opacity: 1 }, viewport.tweenGroup)
            .to({ s: 8, opacity: 0 }, 500)
            .easing(Easing.Quadratic.In)
            .onUpdate(({ s }) => {
              node.object.scale.set(s, s, s)
            })
            .onComplete(() => {
              viewport.removeNodeFromContentGroup(node)
            })
            .start()
        })
        .start()

      i -= 1
    } else if (i === 0) {
      // "GO!" text
      const goNode = createStandardText(font, 'GO!', { size: 10 })
      goNode.object.position.set(0, centerY, 0)
      goNode.object.scale.set(0.01, 0.01, 0.01)
      viewport.addToContentGroup(goNode)

      new Tween({ s: 0.01 }, viewport.tweenGroup)
        .to({ s: 5 }, 300)
        .easing(Easing.Back.Out)
        .onUpdate(({ s }) => {
          goNode.object.scale.set(s, s, s)
        })
        .onComplete(() => {
          spawnExplosion(viewport, goNode.object.position.clone())
          new Tween({ s: 5 }, viewport.tweenGroup)
            .to({ s: 10 }, 400)
            .easing(Easing.Quadratic.In)
            .onUpdate(({ s }) => {
              goNode.object.scale.set(s, s, s)
            })
            .onComplete(() => {
              viewport.removeNodeFromContentGroup(goNode)
            })
            .start()
        })
        .start()

      i -= 1
    }
  }, 1000)

  viewport.addToActiveIntervals(countdownIntervalId)
}

export const addGameOver = async (viewport: Viewport) => {
  const font = await loadFont('/fonts/helvetiker_regular.typeface.json')
  const targetY = PLANE_HEIGHT / 2 + 25

  // "Game Over" slams down from above
  const gameOver = createStandardText(font, 'Game Over', { size: 10 })
  gameOver.object.position.set(0, PLANE_HEIGHT + 80, 0)
  gameOver.object.scale.set(5, 5, 5)
  viewport.addToContentGroup(gameOver)

  new Tween(
    { y: PLANE_HEIGHT + 80, s: 5 },
    viewport.tweenGroup
  )
    .to({ y: targetY, s: 5 }, 600)
    .easing(Easing.Bounce.Out)
    .onUpdate(({ y, s }) => {
      gameOver.object.position.y = y
      gameOver.object.scale.set(s, s, s)
    })
    .onComplete(() => {
      // Screen-shake effect
      spawnExplosion(viewport, new Vector3(0, targetY, 0))
      let shakeCount = 0
      const origX = gameOver.object.position.x
      const shakeInterval = window.setInterval(() => {
        const offsetX = (Math.random() - 0.5) * 10
        const offsetY = (Math.random() - 0.5) * 6
        gameOver.object.position.x = origX + offsetX
        gameOver.object.position.y = targetY + offsetY
        shakeCount++
        if (shakeCount >= 10) {
          window.clearInterval(shakeInterval)
          gameOver.object.position.set(origX, targetY, 0)
        }
      }, 40)
      viewport.addToActiveIntervals(shakeInterval)

      // Restart button scales in after delay
      const restartTimeout = window.setTimeout(() => {
        const restart = createStandardText(font, 'Restart', { size: 25 })
        restart.calculateWireframe(new Vector3(4, 4, 1))
        restart.object.position.set(0, PLANE_HEIGHT / 4, 0)
        restart.object.scale.set(0.01, 0.01, 0.01)
        restart.onRayCasted = (rayCasted) => {
          restart.wire!.visible = rayCasted
        }
        restart.onSelected = () => {
          viewport.restartJetGame()
        }
        viewport.addToContentGroup(restart)

        new Tween({ s: 0.01 }, viewport.tweenGroup)
          .to({ s: 1 }, 400)
          .easing(Easing.Back.Out)
          .onUpdate(({ s }) => {
            restart.object.scale.set(s, s, s)
          })
          .start()
      }, 1000)
      viewport.addToActiveTimeouts(restartTimeout)
    })
    .start()
}
