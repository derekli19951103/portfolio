import { extname } from "path";
import {
  Box3,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  LoadingManager,
  Object3D,
  Vector3,
} from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default class TNode {
  parentNode: TNode | undefined;
  url: string | undefined;
  object: Object3D;
  children: TNode[] | undefined;

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
    object?: Object3D | Group,
    parentNode?: TNode,
    children?: TNode[]
  ) {
    this.parentNode = parentNode;
    this.children = children;
    this.object = object || new Object3D();

    this.bbox = new Box3().setFromObject(this.object);
    this.bboxWire = new LineSegments();

    this.addBoundingBox();
  }

  load(url: string) {
    return new Promise<void>((resolve, reject) => {
      this.url = url;

      let loader = null;

      let ext = extname(url).toLowerCase();

      switch (ext) {
        case ".fbx":
          loader = new FBXLoader(this.loadingManager);
          break;
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
            switch (ext) {
              case ".fbx":
                this.object = object as Group;
                break;
              case ".gltf":
                this.object = (object as GLTF).scene;
                break;
              case ".glb":
                this.object = (object as GLTF).scene;
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

    this.object.add(this.bboxWire);
  }

  get isHovered() {
    return this._isHovered;
  }

  set isHovered(hovered: boolean) {
    this._isHovered = hovered;
    if (this.bboxWire) {
      if (hovered === true) {
        this.bboxWire.visible = true;
      } else {
        this.bboxWire.visible = false;
      }
    }
  }

  get isSelected() {
    return this._isSelected;
  }

  set isSelected(selected: boolean) {
    this._isSelected = selected;
    if (this.bboxWire) {
      if (selected === true) {
        this.bboxWire.material = this.selectedColor;
      } else {
        this.bboxWire.material = this.hoverColor;
      }
    }
  }

  get isRayCasted() {
    return this._isRayCasted;
  }

  set isRayCasted(rayCasted: boolean) {
    this._isRayCasted = rayCasted;
  }
}
