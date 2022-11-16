import { PLANE_HEIGHT, PLANE_WIDTH } from "constant";
import { TransparentBox } from "engine/objects/TransparentBox";
import { useEffect, useRef } from "react";
import { useMediaQuery } from "react-responsive";
import { DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry } from "three";
import Stats from "three/examples/jsm/libs/stats.module";
import { loadFont } from "../engine/loaders/font-loader";
import { loadObj } from "../engine/loaders/OBJLoader";
import { createBreakingText } from "../engine/objects/BreakingText";
import ThreeDNode from "../engine/ThreeDNode";
import { getRandomPointInInterval } from "../engine/utils/math";
import Viewport from "../engine/Viewport";
import { useViewports } from "../store/viewports";
import { HintOrientation } from "./HintOrientation";

export const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const statsRef = useRef<HTMLDivElement>(null);

  const { viewports, setViewports } = useViewports();
  const gl = viewports.viewport1;

  const isBigScreen = useMediaQuery({ query: "(min-width: 1824px)" });
  const isTabletOrMobile = useMediaQuery({ query: "(max-width: 1224px)" });
  const isPortrait = useMediaQuery({ query: "(orientation: portrait)" });

  const addName = async (gl: Viewport) => {
    const font = await loadFont("/fonts/helvetiker_regular.typeface.json");
    const frag = await (await fetch("/shaders/frag.glsl")).text();
    const vert = await (await fetch("/shaders/vert.glsl")).text();

    const height = 15;
    const start = -55;
    const gap = 20;

    const names = [];
    const nameSeg = "YUFENGLI".split("");
    for (let i = 0; i < nameSeg.length; i++) {
      const seg = createBreakingText(font, frag, vert, nameSeg[i]);
      seg.object.userData = { isName: true, nameIndex: i };
      seg.object.position.set(start + gap * (i > 5 ? i + 1 : i), height, 0);
      seg.object.add(TransparentBox(seg));
      names.push(seg);
    }

    gl.add(...names);
  };

  const addPlane = (gl: Viewport) => {
    const geometry = new PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT);

    const mesh = new Mesh(
      geometry,
      new MeshBasicMaterial({ color: "black", side: DoubleSide, opacity: 0.5 })
    );

    mesh.userData = { isPlane: true };

    const node = new ThreeDNode(mesh);

    node.object.position.set(0, -PLANE_HEIGHT / 2 - 1, 0);

    node.object.visible = false;

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
        innateRotationSpeed: getRandomPointInInterval(2, 5) * 0.01,
      };
      return node;
    };

    for (let i = 0; i < 30; i++) {
      nodes.push(
        generateRandom(
          getRandomPointInInterval(-1000, 1000),
          getRandomPointInInterval(-1000, -50)
        )
      );
    }
    for (let i = 0; i < 10; i++) {
      nodes.push(
        generateRandom(
          getRandomPointInInterval(200, 1000),
          getRandomPointInInterval(0, 1000)
        )
      );
    }
    for (let i = 0; i < 10; i++) {
      nodes.push(
        generateRandom(
          getRandomPointInInterval(-1000, -200),
          getRandomPointInInterval(0, 1000)
        )
      );
    }

    gl.add(...nodes);
  };

  useEffect(() => {
    if (canvasRef.current) {
      //@ts-ignore
      const stats: Stats = new Stats();

      if (process.env.NODE_ENV === "development") {
        statsRef.current?.appendChild(stats.dom);
      }

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
  }, [isTabletOrMobile, isPortrait]);

  useEffect(() => {
    window.addEventListener("keypress", (ev) => {
      if (ev.key === "p") {
        console.log(gl?.nodes.filter((n) => n.object.userData.isBullet));
      }
    });
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
      <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
        <nav style={{ position: "absolute" }}>
          <div ref={statsRef} className="statsContainer" />
        </nav>
        {isTabletOrMobile && isPortrait ? (
          <HintOrientation />
        ) : (
          <canvas ref={canvasRef} tabIndex={1} />
        )}
      </div>
    </>
  );
};
