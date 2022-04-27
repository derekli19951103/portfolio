import { extname } from "path";
import {
  Box3,
  BoxBufferGeometry,
  BufferGeometry,
  Group,
  Line,
  LineBasicMaterial,
  LineSegments,
  LoadingManager,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Vector3,
} from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2";
import Viewport from "./Viewport";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry";
import ThreeMeshLine from "three.meshline";

export default class TNode {
  viewport: Viewport;

  parentNode: TNode | undefined;
  url: string | undefined;
  children: TNode[] | undefined;

  object: Mesh;

  bbox: Box3;
  bboxWire: any;

  collisionMesh: Mesh;

  private _isRayCasted: boolean = false;
  private _isHovered: boolean = false;
  private _isSelected: boolean = false;

  loadingManager: LoadingManager = new LoadingManager();

  // private hoverColor = new ThreeMeshLine.MeshLineMaterial({
  //   color: 0xecb82d,
  //   linewidth: 1,
  // });
  // private selectedColor = new ThreeMeshLine.MeshLineMaterial({
  //   color: 0xecb82d,
  //   linewidth: 4,
  //   depthTest: false,
  // });

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
    this.bboxWire = new Line2();

    this.collisionMesh = new Mesh();

    if (object) {
      this.addBoundingBox();
      this.addCollionMesh();
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
        case ".glb": {
          loader = new GLTFLoader(this.loadingManager);

          const dracoLoader = new DRACOLoader();
          dracoLoader.setDecoderPath("three/examples/js/libs/draco/gltf/");

          loader.setDRACOLoader(dracoLoader);
          break;
        }
      }
      if (loader) {
        loader.crossOrigin = "*";
        loader.load(
          url,
          (object) => {
            switch (ext) {
              // case ".fbx":
              //   this.object = object as Group;
              //   break;
              case ".gltf":
              case ".glb":
                (object as GLTF).scene.traverse((child) => {
                  const pos = child.position.clone();
                  const matrix = new Matrix4().makeTranslation(
                    -pos.x,
                    -pos.y,
                    -pos.z
                  );
                  child.applyMatrix4(matrix);
                });

                this.object.add(object.scene);

                break;
            }

            this.addBoundingBox();
            this.addCollionMesh();

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

    // const line = new ThreeMeshLine.MeshLine();
    // line.setGeometry(wireGeo);

    // this.bboxWire = new Mesh(line, this.hoverColor);

    const bboxWire = new LineSegments(wireGeo, this.hoverColor);

    this.bboxWire = bboxWire;

    this.bboxWire.visible = false;

    this.object.add(this.bboxWire);
  }

  private addCollionMesh() {
    const bboxMin = this.bbox.min;
    const bboxMax = this.bbox.max;

    const collionGeo = new BoxBufferGeometry(
      bboxMax.x - bboxMin.x,
      bboxMax.y - bboxMin.y,
      bboxMax.z - bboxMin.z
    );

    this.collisionMesh = new Mesh(collionGeo);

    this.collisionMesh.visible = false;
    this.object.add(this.collisionMesh);
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
