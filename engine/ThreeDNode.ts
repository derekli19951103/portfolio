import { extname } from "path";
import {
  Box3,
  BoxBufferGeometry,
  BufferGeometry,
  LineSegments,
  LoadingManager,
  Matrix4,
  Mesh,
  Vector2,
  Vector3,
} from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import Viewport from "./Viewport";

export default class ThreeDNode {
  viewport: Viewport;

  parentNode: ThreeDNode | undefined;
  url: string | undefined;
  children: ThreeDNode[] | undefined;

  object: Mesh;

  bbox: Box3;
  bboxWire: any;

  collisionMesh: Mesh;

  isRayCasted: boolean = false;
  private _isHovered: boolean = false;
  private _isSelected: boolean = false;

  loadingManager: LoadingManager = new LoadingManager();

  private hoverColor: LineMaterial;
  private selectedColor: LineMaterial;

  constructor(
    viewport: Viewport,
    object?: Mesh,
    parentNode?: ThreeDNode,
    children?: ThreeDNode[]
  ) {
    this.parentNode = parentNode;
    this.children = children;
    this.object = object || new Mesh();
    this.viewport = viewport;

    this.hoverColor = new LineMaterial({
      color: 0x4080ff,
      linewidth: 2,
      resolution: new Vector2(this.viewport.width, this.viewport.height),
    });
    this.selectedColor = new LineMaterial({
      color: 0x4080ff,
      linewidth: 4,
      resolution: new Vector2(this.viewport.width, this.viewport.height),
    });

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
              case ".gltf":
              case ".glb":
                (object as GLTF).scene.traverse((child) => {
                  const pos = child.position;
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
      //1
      new Vector3(bboxMin.x, bboxMin.y, bboxMin.z),
      //2
      new Vector3(bboxMin.x, bboxMin.y, bboxMax.z),
      //3
      new Vector3(bboxMin.x, bboxMax.y, bboxMax.z),
      //4
      new Vector3(bboxMin.x, bboxMax.y, bboxMin.z),
      //1
      new Vector3(bboxMin.x, bboxMin.y, bboxMin.z),
      //5
      new Vector3(bboxMax.x, bboxMin.y, bboxMin.z),
      //6
      new Vector3(bboxMax.x, bboxMin.y, bboxMax.z),
      //7
      new Vector3(bboxMax.x, bboxMax.y, bboxMax.z),
      //8
      new Vector3(bboxMax.x, bboxMax.y, bboxMin.z),
      //4
      new Vector3(bboxMin.x, bboxMax.y, bboxMin.z),
      //3
      new Vector3(bboxMin.x, bboxMax.y, bboxMax.z),
      //7
      new Vector3(bboxMax.x, bboxMax.y, bboxMax.z),
      //6
      new Vector3(bboxMax.x, bboxMin.y, bboxMax.z),
      //2
      new Vector3(bboxMin.x, bboxMin.y, bboxMax.z),
      //1
      new Vector3(bboxMin.x, bboxMin.y, bboxMin.z),
      //5
      new Vector3(bboxMax.x, bboxMin.y, bboxMin.z),
      //8
      new Vector3(bboxMax.x, bboxMax.y, bboxMin.z),
    ]);

    const line = new LineSegments(wireGeo);
    const wire = new LineGeometry().fromLineSegments(line);

    this.bboxWire = new Line2(wire, this.hoverColor);

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
    // this.object.add(this.collisionMesh);
  }

  get isHovered() {
    return this._isHovered;
  }

  get isSelected() {
    return this._isSelected;
  }

  setHovered(hovered: boolean) {
    this._isHovered = hovered;

    if (hovered === true) {
      this.bboxWire.visible = true;
    } else {
      this.bboxWire.visible = false;
    }
  }

  setSelected(selected: boolean) {
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
}
