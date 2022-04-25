import { useEffect, useRef } from "react";
import {
  Color,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  SphereGeometry,
  Texture,
  TorusKnotGeometry,
  Vector3,
} from "three";
import TNode from "../engine/TNode";
import Viewport from "../engine/Viewport";
import { useViewports } from "../store/viewports";

export const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { viewports, setViewports } = useViewports();
  const gl = viewports.viewport1;

  const addCustomShaderObj = async () => {
    if (gl) {
      const geometry = new TorusKnotGeometry(1, 0.2, 100, 16);

      let uniforms = {
        Ka: { type: "float", value: 1.0 },
        Kd: { type: "float", value: 1.0 },
        Ks: { type: "float", value: 1.0 },
        shininess: { type: "float", value: 80.0 },
        lightPos: { type: "vec3", value: new Vector3(4, 4, 0) },
        ambientColor: { type: "vec3", value: new Color("#341900") },
        diffuseColor: { type: "vec3", value: new Color("#00ccc2") },
        specularColor: { type: "vec3", value: new Color("#ffffff") },
      };
      const material = new ShaderMaterial({
        uniforms: uniforms,
        fragmentShader: await fetch("/shaders/halftone_frag.glsl").then(
          async (res) => await res.text()
        ),
        vertexShader: await fetch("/shaders/halftone_vert.glsl").then(
          async (res) => await res.text()
        ),
      });

      const mesh = new Mesh(geometry, material);

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const node = new TNode(mesh);

      const size = new Vector3();

      node.bbox.getSize(size);

      node.object.translateY(size.y / 2);
      node.object.translateX(4);

      gl.add(node);
    }
  };

  const addNormalObj = () => {
    if (gl) {
      const geometry = new SphereGeometry(2, 32, 16);
      const material = new MeshBasicMaterial({
        envMap: gl.scene.background as Texture,
      });
      const sphere = new Mesh(geometry, material);

      const node = new TNode(sphere);

      const size = new Vector3();

      node.bbox.getSize(size);

      node.object.translateY(size.y / 2);

      gl.add(node);
    }
  };

  const addGLB = async () => {
    if (gl) {
      const node = new TNode();

      await node.load("/models/LCSHF30.glb");

      gl.add(node);
    }
  };

  useEffect(() => {
    if (canvasRef.current) {
      setViewports({ viewport1: new Viewport(canvasRef.current) });
    }
  }, [canvasRef]);

  useEffect(() => {
    if (gl) {
      gl.render();
    }
  }, [gl]);

  /**
   * Render
   */
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <nav className="nav" style={{ position: "absolute" }}>
        <button className="btn" onClick={addCustomShaderObj}>
          Add Custom Shader Obj
        </button>
        <button className="btn" onClick={addNormalObj}>
          Add Normal Obj
        </button>
        <button className="btn" onClick={addGLB}>
          Add GLB
        </button>
      </nav>
      <canvas ref={canvasRef} />
    </div>
  );
};
