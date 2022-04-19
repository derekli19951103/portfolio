import { extname } from "path";
import {
  Box3,
  BoxBufferGeometry,
  BoxHelper,
  Group,
  LoadingManager,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Vector3,
} from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default class TNode {
  parentNode: TNode | undefined;
  url: string | undefined;
  object: Object3D | Group | undefined;
  children: TNode[] | undefined;

  boudingGroup: Group;
  boundingBox: BoxHelper | undefined;

  private _isRayCasted: boolean = false;
  private _isHovered: boolean = false;
  private _isSelected: boolean = false;

  loadingManager: LoadingManager = new LoadingManager();

  private hoverColor = new MeshBasicMaterial({ color: "green" });
  private selectedColor = new MeshBasicMaterial({ color: "red" });

  constructor(
    object?: Object3D | Group,
    parentNode?: TNode,
    children?: TNode[]
  ) {
    this.parentNode = parentNode;
    this.children = children;
    this.object = object;

    this.boudingGroup = new Group();

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
    if (this.object) {
      this.boudingGroup.add(this.object);
      this.boundingBox = new BoxHelper(this.object);
      this.boundingBox.material = this.hoverColor;
      this.boundingBox.visible = false;
      this.boudingGroup.add(this.boundingBox);
    }
  }

  get isHovered() {
    return this._isHovered;
  }

  set isHovered(hovered: boolean) {
    this._isHovered = hovered;
    if (this.boundingBox) {
      if (hovered === true) {
        this.boundingBox.visible = true;
      } else {
        this.boundingBox.visible = false;
      }
    }
  }

  get isSelected() {
    return this._isSelected;
  }

  set isSelected(selected: boolean) {
    this._isSelected = selected;
    if (this.boundingBox) {
      if (selected === true) {
        this.boundingBox.material = this.selectedColor;
      } else {
        this.boundingBox.material = this.hoverColor;
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
