import { useEffect, useRef } from "react";
import { Mesh, Vector3 } from "three";
import Stats from "three/examples/jsm/libs/stats.module";
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
    const y = await createBreakingText(font, "Y");
    const u = await createBreakingText(font, "U");
    const f = await createBreakingText(font, "F");
    const e = await createBreakingText(font, "E");
    const n = await createBreakingText(font, "N");
    const g = await createBreakingText(font, "G");
    const l = await createBreakingText(font, "L");
    const i = await createBreakingText(font, "I");

    const height = 5;
    const start = -30;
    const gap = 10;

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

  useEffect(() => {
    if (canvasRef.current) {
      //@ts-ignore
      const stats: Stats = new Stats();

      statsRef.current?.appendChild(stats.dom);

      const viewport = new Viewport({ canvas: canvasRef.current, stats });

      setViewports({
        viewport1: viewport,
      });

      addName(viewport);
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
        <nav className="nav" style={{ position: "absolute" }}>
          <div ref={statsRef} className="statsContainer" />
        </nav>
        <canvas ref={canvasRef} tabIndex={1} />
      </div>
    </>
  );
};
