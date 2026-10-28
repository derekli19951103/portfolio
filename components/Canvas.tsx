import { PLANE_HEIGHT, PLANE_WIDTH } from 'constant'
import { createStandardText } from 'engine/objects/StandardText'
import { TransparentBox } from 'engine/objects/TransparentBox'
import { useEffect, useRef } from 'react'
import { DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import { loadFont } from '../engine/loaders/font-loader'
import { createBreakingText } from '../engine/objects/BreakingText'
import { createLightWaveText } from '../engine/objects/LightWaveText'
import ThreeDNode from '../engine/ThreeDNode'
import Viewport from '../engine/Viewport'
import { useViewports } from '../store/viewports'

// A trial of another way to get Safari to draw the scene under its toolbars,
// switched on with ?edge=fixed (see .edge-fixed in globals.css)
const edgeFixed =
  new URLSearchParams(window.location.search).get('edge') === 'fixed'

export const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const statsRef = useRef<HTMLDivElement>(null)

  const { viewports, setViewports } = useViewports()
  const gl = viewports.viewport1

  // The viewport places the letters and hint for the screen's shape
  const addName = async (gl: Viewport) => {
    const font = await loadFont('/fonts/helvetiker_regular.typeface.json')
    const frag = await (await fetch('/shaders/frag.glsl')).text()
    const vert = await (await fetch('/shaders/vert.glsl')).text()

    const names = []
    const nameSeg = 'YUFENGLI'.split('')
    // Each tab's label, and how far it leans off its letter. The labels are
    // wider than the gaps between the towering letters, so neighbours lean
    // apart to keep from touching: most of all around Project, the widest.
    const labels = [
      { text: 'Me', lean: 0 },
      { text: 'Edu', lean: -0.4 },
      { text: 'Ask', lean: -2.7 },
      { text: 'Tech', lean: -3.65 },
      { text: 'Project', lean: 1.6 },
      { text: 'Game', lean: 7.95 },
      { text: 'Links', lean: -2.5 },
      { text: 'Resume', lean: 2.5 }
    ]
    for (let i = 0; i < nameSeg.length; i++) {
      const seg = createBreakingText(font, frag, vert, nameSeg[i])
      seg.object.userData = {
        isName: true,
        nameIndex: i,
        hasTab: labels[i].text !== ''
      }
      // The viewport widens it to fill the letter's slot on the landing
      // view, so a slim letter (or the I) is still easy to tap
      const hitBox = TransparentBox(seg)
      hitBox.userData = { isHitBox: true }
      seg.object.add(hitBox)

      // Every label shows now, so they're smaller
      const label = createStandardText(font, labels[i].text, { size: 4.5 })
      label.object.position.set(labels[i].lean, 15, 0)
      const labelMaterial = label.object.material as MeshBasicMaterial
      labelMaterial.transparent = true
      labelMaterial.opacity = 0
      label.object.userData = {
        isNameLabelTag: true,
        restX: label.object.position.x,
        restY: label.object.position.y
      }

      seg.object.add(label.object)
      names.push(seg)
    }

    // Until the first letter click, a line above the name says what to do,
    // with a wave of light running through it. It fades in from dark.
    const verb = matchMedia('(pointer: coarse)').matches ? 'TAP' : 'CLICK'
    const hint = createLightWaveText(font, `${verb} A LETTER TO EXPLORE`, {
      size: 5,
      bandWidth: 4,
      lift: 1.1
    })
    hint.object.userData = { isHint: true }

    gl.add(...names, hint)
    gl.placeName()
  }

  const addPlane = (gl: Viewport) => {
    const geometry = new PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT)

    const mesh = new Mesh(
      geometry,
      new MeshBasicMaterial({ color: 'black', side: DoubleSide, opacity: 0.5 })
    )

    mesh.userData = { isPlane: true }

    const node = new ThreeDNode(mesh)

    node.object.position.set(0, -PLANE_HEIGHT / 2 - 1, 0)

    node.object.visible = false

    gl.addPlane(node)
  }

  // Made once: the viewport refits itself when the screen turns or resizes
  useEffect(() => {
    if (canvasRef.current) {
      const isDev = process.env.NODE_ENV === 'development'
      //@ts-ignore
      const stats: Stats | undefined = isDev ? new Stats() : undefined

      if (isDev && stats) {
        statsRef.current?.appendChild(stats.dom)
      }

      const viewport = new Viewport({
        canvas: canvasRef.current,
        stats
      })

      viewport.render()

      addName(viewport)
      addPlane(viewport)

      setViewports({
        viewport1: viewport
      })

      return () => {
        viewport.dispose()
        if (isDev && stats) {
          statsRef.current?.removeChild(stats.dom)
        }
      }
    }
  }, [])

  useEffect(() => {
    if (!gl) return
    const handler = (ev: KeyboardEvent) => {
      if (ev.key === 'p') {
        console.log(gl.nodes.filter((n) => n.object.userData.isBullet))
      }
    }
    window.addEventListener('keypress', handler)
    return () => window.removeEventListener('keypress', handler)
  }, [gl])

  /**
   * Render
   */
  return (
    <>
      <style>{`
        .statsContainer div {
         right: 0;
         left: unset !important;
        }
       
      `}</style>
      <div className={edgeFixed ? 'stage edge-fixed' : 'stage'}>
        <nav style={{ position: 'absolute' }}>
          <div ref={statsRef} className="statsContainer" />
        </nav>

        <canvas ref={canvasRef} tabIndex={1} />
      </div>
    </>
  )
}
