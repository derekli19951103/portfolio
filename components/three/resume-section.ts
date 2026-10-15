import { Easing, Tween } from '@tweenjs/tween.js'
import { PLANE_HEIGHT } from 'constant'
import ThreeDNode from 'engine/ThreeDNode'
import { BoxGeometry, Mesh, MeshStandardMaterial, TextureLoader } from 'three'
import Viewport from '../../engine/Viewport'

const BoxDim = 60
// Heights the cube's centre passes as its top, then its bottom, clears the water
const SPLASH_HEIGHTS = [-BoxDim / 4, BoxDim / 2]

// A ring of ripples around the cube where it breaks the surface
const splash = (viewport: Viewport) => {
  const radius = BoxDim / 2 + 6
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    viewport.spawnRipple(Math.cos(angle) * radius, Math.sin(angle) * radius)
  }
}

export const addResumeContent = async (viewport: Viewport) => {
  const boxGeo = new BoxGeometry(BoxDim, BoxDim, BoxDim)
  const material = new MeshStandardMaterial({
    map: new TextureLoader().load('/textures/resume.png')
  })

  const cube = new Mesh(boxGeo, material)

  const node = new ThreeDNode(cube)

  node.onSelected = (selected) => {
    if (!selected) return
    window.open('/resume.html', '_blank')
    // Selection toggles, so clear it and let the next click open it again
    node.setSelected(false)
  }

  node.object.userData = { isRotatingCube: true }

  // Rises out of the water with a full turn, then settles into its slow spin
  const rise = { y: -BoxDim, turn: 0 }
  let turned = 0
  let splashes = 0
  node.object.position.set(0, rise.y, 0)
  node.object.scale.setScalar(0.6)
  new Tween(rise, viewport.tweenGroup)
    .to({ y: PLANE_HEIGHT / 2, turn: -Math.PI * 2 }, 1200)
    .easing(Easing.Back.Out)
    .onUpdate(() => {
      node.object.position.y = rise.y
      // Added to the idle rotation the viewport applies every frame
      node.object.rotation.y += rise.turn - turned
      turned = rise.turn
      while (
        splashes < SPLASH_HEIGHTS.length &&
        rise.y > SPLASH_HEIGHTS[splashes]
      ) {
        splash(viewport)
        splashes++
      }
    })
    .start()
  new Tween(node.object.scale, viewport.tweenGroup)
    .to({ x: 1, y: 1, z: 1 }, 1200)
    .easing(Easing.Back.Out)
    .start()

  viewport.addToContentGroup(node)
}
