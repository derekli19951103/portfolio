import { useEffect, useRef, useState } from "react";
import {
  AmbientLight,
  BoxHelper,
  CapsuleGeometry,
  Color,
  Group,
  Mesh,
  MeshPhongMaterial,
  PointLight,
  ShaderMaterial,
  SphereGeometry,
  TorusKnotGeometry,
  Vector3,
} from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import Viewport from "../engine/Viewport";

export const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gl, setGl] = useState<Viewport>();

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

      torusKnot.position.z = -4;

      const group = new Group();
      group.add(cube, sphereMesh);
      const box = new BoxHelper(group, 0xffff00);
      box.updateMatrixWorld(true);
      const boxGroup = new Group();
      boxGroup.add(group, box);
      gl.add(boxGroup);
      gl.add(torusKnot);

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
        gltf.scene.onBeforeRender = (
          renderer,
          scene,
          camera,
          geometry,
          material,
          group
        ) => {
          material = new MeshPhongMaterial({});
        };
        const box = new BoxHelper(gltf.scene, 0xffff00);
        const boxGroup = new Group();
        boxGroup.add(gltf.scene, box);
        gl.add(boxGroup);

        // const light = new PointLight(0xffffff, 1, 100);
        // light.position.set(0, 10, 0);
        // const ambientLight = new AmbientLight();
        // gl.add(light, ambientLight);

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
      setGl(new Viewport(canvasRef.current));
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
