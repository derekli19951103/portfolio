import TWEEN from "@tweenjs/tween.js";
import { useEffect, useRef } from "react";
import {
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
} from "three";
import Stats from "three/examples/jsm/libs/stats.module";
import { createTranslationAnimation } from "../engine/animations/text-animations";
import { loadFont } from "../engine/loaders/font-loader";
import { loadObj } from "../engine/loaders/OBJLoader";
import { createBreakingText } from "../engine/objects/BreakingText";
import { createStandardText } from "../engine/objects/StandardText";
import ThreeDNode from "../engine/ThreeDNode";
import { inBetweenRandom } from "../engine/utils/math";
import Viewport from "../engine/Viewport";
import { useViewports } from "../store/viewports";

export const PLANE_HEIGHT = 120;

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
    const y = createBreakingText(font, frag, vert, "Y", 0);
    const u = createBreakingText(font, frag, vert, "U", 1);
    const f = createBreakingText(font, frag, vert, "F", 2);
    const e = createBreakingText(font, frag, vert, "E", 3);
    const n = createBreakingText(font, frag, vert, "N", 4);
    const g = createBreakingText(font, frag, vert, "G", 5);
    const l = createBreakingText(font, frag, vert, "L", 6);
    const i = createBreakingText(font, frag, vert, "I", 7);

    const height = 15;
    const start = -55;
    const gap = 20;

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
    const geometry = new PlaneBufferGeometry(400, PLANE_HEIGHT);

    const mesh = new Mesh(
      geometry,
      new MeshBasicMaterial({ color: "black", side: DoubleSide })
    );

    mesh.userData = { isPlane: true };

    const node = new ThreeDNode(mesh);

    node.object.position.set(0, -node.size.y / 2, 0);

    gl.addPlane(node);
  };

  const addDolphins = async (gl: Viewport) => {
    const mesh = new Mesh();
    const dolphin = await loadObj("/models/dolphin.obj");
    mesh.add(dolphin);

    mesh.scale.set(0.1, 0.1, 0.1);

    const nodes = [];

    const generateRandom = (x: number, z: number) => {
      const node = new ThreeDNode(mesh.clone());
      node.object.position.set(x, 0, z);
      node.object.rotation.x = Math.PI / 2 + Math.random() * 10;
      node.object.userData = {
        isDolphin: true,
        innateRotationSpeed: inBetweenRandom(2, 5) * 0.01,
      };
      return node;
    };

    for (let i = 0; i < 30; i++) {
      nodes.push(
        generateRandom(
          inBetweenRandom(-1000, 1000),
          inBetweenRandom(-1000, -50)
        )
      );
    }
    for (let i = 0; i < 10; i++) {
      nodes.push(
        generateRandom(inBetweenRandom(200, 1000), inBetweenRandom(0, 1000))
      );
    }
    for (let i = 0; i < 10; i++) {
      nodes.push(
        generateRandom(inBetweenRandom(-1000, -200), inBetweenRandom(0, 1000))
      );
    }

    gl.add(...nodes);
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

      viewport.render();

      addName(viewport);
      addPlane(viewport);

      addDolphins(viewport);

      setViewports({
        viewport1: viewport,
      });
    }
  }, []);

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
      <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
        <nav style={{ position: "absolute" }}>
          <div ref={statsRef} className="statsContainer" />
        </nav>
        <canvas ref={canvasRef} tabIndex={1} />
      </div>
    </>
  );
};
