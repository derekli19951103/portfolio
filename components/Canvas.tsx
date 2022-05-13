import { useEffect, useRef } from "react";
import { PlaneBufferGeometry } from "three";
import Stats from "three/examples/jsm/libs/stats.module";
import { Reflector } from "three/examples/jsm/objects/Reflector";
import { loadFont } from "../engine/loaders/font-loader";
import { createBreakingText } from "../engine/objects/BreakingText";
import ThreeDNode from "../engine/ThreeDNode";
import Viewport from "../engine/Viewport";
import { useViewports } from "../store/viewports";

export const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const statsRef = useRef<HTMLDivElement>(null);

  const { viewports, setViewports } = useViewports();
  const gl = viewports.viewport1;

  const addName = async (gl: Viewport) => {
    const font = await loadFont(
      "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json"
    );
    const frag = await (await fetch("/shaders/frag.glsl")).text();
    const vert = await (await fetch("/shaders/vert.glsl")).text();
    const y = await createBreakingText(font, frag, vert, "Y");
    const u = await createBreakingText(font, frag, vert, "U");
    const f = await createBreakingText(font, frag, vert, "F");
    const e = await createBreakingText(font, frag, vert, "E");
    const n = await createBreakingText(font, frag, vert, "N");
    const g = await createBreakingText(font, frag, vert, "G");
    const l = await createBreakingText(font, frag, vert, "L");
    const i = await createBreakingText(font, frag, vert, "I");

    const height = 5;
    const start = -45;
    const gap = 11;

    y.object.position.set(start, height, 0);
    u.object.position.set(start + gap, height, 0);
    f.object.position.set(start + 2 * gap, height, 0);
    e.object.position.set(start + 3 * gap, height, 0);
    n.object.position.set(start + 4 * gap, height, 0);
    g.object.position.set(start + 5 * gap, height, 0);
    l.object.position.set(start + 7 * gap, height, 0);
    i.object.position.set(start + 8 * gap, height, 0);

    gl.add(y, u, f, e, n, g, l, i);
  };

  const addPlane = (gl: Viewport) => {
    const geometry = new PlaneBufferGeometry(400, 250);

    const mesh = new Reflector(geometry, {
      clipBias: 0.003,
      textureWidth: gl.width * window.devicePixelRatio,
      textureHeight: gl.height * window.devicePixelRatio,
      color: "black",
    });

    mesh.userData = { isPlane: true, needsRaising: false, raised: false };
    mesh.position.set(0, -125, 0);

    const node = new ThreeDNode(mesh);

    gl.add(node);
  };

  useEffect(() => {
    if (canvasRef.current) {
      //@ts-ignore
      const stats: Stats = new Stats();

      statsRef.current?.appendChild(stats.dom);

      const viewport = new Viewport({
        canvas: canvasRef.current,
        stats,
      });

      setViewports({
        viewport1: viewport,
      });

      addName(viewport);
      addPlane(viewport);
    }
  }, []);

  useEffect(() => {
    if (gl) {
      gl.render();
    }
  }, [gl]);

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
      <div style={{ width: "100vw", height: "100vh" }}>
        <nav style={{ position: "absolute" }}>
          <div ref={statsRef} className="statsContainer" />
        </nav>
        <canvas ref={canvasRef} tabIndex={1} />
      </div>
    </>
  );
};
