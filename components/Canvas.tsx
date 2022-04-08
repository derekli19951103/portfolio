import { LegacyRef, useEffect, useRef, useState } from "react";
import {
  AmbientLight,
  BoxGeometry,
  CapsuleGeometry,
  Color,
  Loader,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PointLight,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  sRGBEncoding,
  TorusKnotGeometry,
  Vector3,
  WebGLRenderer,
} from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import ViewGL from "../engine/ViewGL";

export const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gl, setGl] = useState<ViewGL>();

  /**
   * Add 3d cube
   */
  const add3dCube = async () => {
    if (gl) {
      const geometry = new CapsuleGeometry(1, 1, 30, 50);

      let uniforms = {
        Ka: { type: "float", value: 1.0 },
        Kd: { type: "float", value: 1.0 },
        Ks: { type: "float", value: 1.0 },
        shininess: { type: "float", value: 80.0 },
        lightPos: { type: "vec3", value: new Vector3(4, 1, 0) },
        ambientColor: { type: "vec3", value: new Color("#341900") },
        diffuseColor: { type: "vec3", value: new Color("#00ccc2") },
        specularColor: { type: "vec3", value: new Color("#ffffff") },
      };
      const material = new ShaderMaterial({
        uniforms: uniforms,
        fragmentShader: await fetch("/shaders/cel_frag.glsl").then(
          async (res) => await res.text()
        ),
        vertexShader: await fetch("/shaders/cel_vert.glsl").then(
          async (res) => await res.text()
        ),
      });
      const cube = new Mesh(geometry, material);
      cube.position.x = 4;

      const sphere = new SphereGeometry(1, 50, 50);

      const sphereMesh = new Mesh(sphere, material);

      sphereMesh.position.x = -4;

      const torus = new TorusKnotGeometry(1, 0.2, 100, 16);

      const torusKnot = new Mesh(torus, material);

      torusKnot.position.y = -4;

      const g = new BoxGeometry();
      const m = new MeshBasicMaterial({ color: 0x00ff00 });
      const c = new Mesh(g, m);
      gl.add(c, cube, sphereMesh, torusKnot);

      gl.camera.position.set(0, 0, 10);

      // let pointLight = new PointLight(0xdddddd);
      // pointLight.position.set(-5, -3, 3);
      // gl.scene.add(pointLight);

      // let ambientLight = new AmbientLight(0x505050);
      // gl.scene.add(ambientLight);

      gl.render();
    }
  };

  const addGLB = () => {
    if (gl) {
      const loader = new GLTFLoader();

      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("three/examples/js/libs/draco/");
      loader.setDRACOLoader(dracoLoader);

      loader.load("/models/LCSHF30.glb", (gltf) => {
        gltf.scene.position.set(0, 4, 0);

        gl.add(gltf.scene);
        gl.camera.position.set(0, 0, 10);

        const light = new PointLight(0xffffff, 1, 100);
        light.position.set(10, 10, 10);
        const ambientLight = new AmbientLight();
        gl.add(light, ambientLight);

        gl.render();
      });
    }
  };

  // function adjustLighting() {
  //   let pointLight = new PointLight(0xdddddd);
  //   pointLight.position.set(-5, -3, 3);
  //   gl.scene.add(pointLight);

  //   let ambientLight = new AmbientLight(0x505050);
  //   gl.scene.add(ambientLight);
  // }

  // function animationLoop() {
  //   const camera = new PerspectiveCamera(
  //     75,
  //     window.innerWidth / window.innerHeight,
  //     0.1,
  //     1000
  //   );
  //   gl.renderer.render(gl.scene, camera);

  //   requestAnimationFrame(animationLoop);
  // }

  useEffect(() => {
    if (canvasRef.current) {
      setGl(new ViewGL(canvasRef.current));
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
      <nav className="nav">
        <button className="btn" onClick={add3dCube}>
          Add 3D Cube
        </button>
        <button className="btn" onClick={addGLB}>
          Add GLB
        </button>
      </nav>
      <canvas ref={canvasRef} style={{ width: "100vw", height: "100vh" }} />
    </div>
  );
};
