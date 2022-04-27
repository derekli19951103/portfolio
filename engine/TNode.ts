import { extname } from "path";
import {
  Box3,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  LoadingManager,
  Matrix4,
  Mesh,
  Object3D,
  Vector3,
} from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import Viewport from "./Viewport";

export default class TNode {
  viewport: Viewport;

  parentNode: TNode | undefined;
  url: string | undefined;
  children: TNode[] | undefined;

  object: Mesh;

  bbox: Box3;
  bboxWire: LineSegments<BufferGeometry, LineBasicMaterial>;

  private _isRayCasted: boolean = false;
  private _isHovered: boolean = false;
  private _isSelected: boolean = false;

  loadingManager: LoadingManager = new LoadingManager();

  private hoverColor = new LineBasicMaterial({
    color: "green",
  });
  private selectedColor = new LineBasicMaterial({
    color: "red",
  });

  constructor(
    viewport: Viewport,
    object?: Mesh,
    parentNode?: TNode,
    children?: TNode[]
  ) {
    this.parentNode = parentNode;
    this.children = children;
    this.object = object || new Mesh();
    this.viewport = viewport;

    this.bbox = new Box3();
    this.bboxWire = new LineSegments();

    if (object) {
      this.addBoundingBox();
    }
  }

  load(url: string) {
    return new Promise<void>((resolve, reject) => {
      this.url = url;

      let loader = null;

      let ext = extname(url).toLowerCase();

      switch (ext) {
        // case ".fbx":
        //   loader = new FBXLoader(this.loadingManager);
        //   break;
        case ".gltf":
          loader = new GLTFLoader(this.loadingManager);
          break;
        case ".glb":
          loader = new GLTFLoader(this.loadingManager);
          break;
      }
      if (loader) {
        loader.crossOrigin = "*";
        loader.load(
          url,
          (object) => {
            const mesh = new Mesh();
            const meshes: Mesh[] = [];
            switch (ext) {
              // case ".fbx":
              //   this.object = object as Group;
              //   break;
              case ".gltf":
                (object as GLTF).scene.traverse((child) => {
                  //@ts-ignore
                  if (child.isMesh) {
                    meshes.push(child as Mesh);
                  }
                });

                mesh.add(...meshes);
                this.object.add(mesh);

                break;
              case ".glb":
                (object as GLTF).scene.traverse((child) => {
                  //@ts-ignore
                  if (child.isMesh) {
                    meshes.push(child as Mesh);
                  }
                });

                mesh.add(...meshes);

                mesh.traverse((c) => {
                  const matrix = new Matrix4().makeRotationX(-Math.PI / 2);
                  (c as Mesh).geometry.applyMatrix4(matrix);
                });

                this.object = mesh;

                break;
            }

            this.addBoundingBox();

            resolve();
          },
          (xhr) => {},
          (err) => {
            reject(err);
          }
        );
      }
    });
  }

  private addBoundingBox() {
    this.bbox = this.bbox.setFromObject(this.object);
    const bboxMin = this.bbox.min;
    const bboxMax = this.bbox.max;

    const wireGeo = new BufferGeometry().setFromPoints([
      new Vector3(bboxMin.x, bboxMin.y, bboxMin.z),
      new Vector3(bboxMin.x, bboxMin.y, bboxMax.z),
      new Vector3(bboxMin.x, bboxMax.y, bboxMax.z),
      new Vector3(bboxMin.x, bboxMax.y, bboxMin.z),
      new Vector3(bboxMax.x, bboxMin.y, bboxMin.z),
      new Vector3(bboxMax.x, bboxMin.y, bboxMax.z),
      new Vector3(bboxMax.x, bboxMax.y, bboxMax.z),
      new Vector3(bboxMax.x, bboxMax.y, bboxMin.z),
    ]);

    wireGeo.setIndex([
      0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7,
    ]);

    const bboxWire = new LineSegments(wireGeo, this.hoverColor);

    this.bboxWire = bboxWire;

    this.bboxWire.visible = false;

    this.object.add(this.bboxWire);
  }

  get isHovered() {
    return this._isHovered;
  }

  set isHovered(hovered: boolean) {
    this._isHovered = hovered;

    if (hovered === true) {
      this.bboxWire.visible = true;
    } else {
      this.bboxWire.visible = false;
    }
  }

  get isSelected() {
    return this._isSelected;
  }

  set isSelected(selected: boolean) {
    this._isSelected = selected;

    if (selected === true) {
      this.bboxWire.material = this.selectedColor;
      this.viewport.disableTransformControls();
      this.viewport.enableTransformControls(this);
    } else {
      this.bboxWire.material = this.hoverColor;
      this.viewport.disableTransformControls();
    }
  }

  get isRayCasted() {
    return this._isRayCasted;
  }

  set isRayCasted(rayCasted: boolean) {
    this._isRayCasted = rayCasted;
  }
}
