import { useEffect, useRef, useState } from "react";
import Stats from "three/examples/jsm/libs/stats.module";
import Viewport from "../engine/Viewport";
import { useViewports } from "../store/viewports";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { Mesh, MeshStandardMaterial, Vector3 } from "three";
import ThreeDNode from "../engine/ThreeDNode";

export const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const statsRef = useRef<HTMLDivElement>(null);

  const { viewports, setViewports } = useViewports();
  const gl = viewports.viewport1;

  useEffect(() => {
    if (canvasRef.current) {
      //@ts-ignore
      const stats: Stats = new Stats();

      statsRef.current?.appendChild(stats.dom);

      setViewports({
        viewport1: new Viewport({ canvas: canvasRef.current, stats }),
      });
    }
  }, []);

  useEffect(() => {
    if (gl) {
      const loader = new FontLoader();
      loader.load(
        "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
        (font) => {
          const textGeo = new TextGeometry("YUFENG LI", {
            font,
            size: 10,
            height: 3,
            curveSegments: 4,
            bevelThickness: 1,
            bevelSize: 0.5,
            bevelEnabled: true,
          });

          const mesh = new Mesh(textGeo, new MeshStandardMaterial());

          const node = new ThreeDNode(mesh);

          const size = new Vector3();

          node.bbox.getSize(size);

          node.object.position.set(-size.x / 2, 5, 0);

          console.log(size);

          gl.add(node);
        }
      );

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
