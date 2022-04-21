import { extname } from "path";
import {
  Box3,
  BoxHelper,
  Group,
  LoadingManager,
  MeshBasicMaterial,
  Object3D,
} from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default class TNode {
  parentNode: TNode | undefined;
  url: string | undefined;
  object: Object3D | Group | undefined;
  children: TNode[] | undefined;

  boudingGroup: Group;
  boundingBoxHelper: BoxHelper | undefined;
  boundingBox: Box3 | undefined;

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
      this.boundingBoxHelper = new BoxHelper(this.object);
      this.boundingBoxHelper.material = this.hoverColor;
      this.boundingBoxHelper.visible = false;

      this.boundingBox = new Box3().setFromObject(this.object);

      this.boudingGroup.add(this.boundingBoxHelper);
    }
  }

  get isHovered() {
    return this._isHovered;
  }

  set isHovered(hovered: boolean) {
    this._isHovered = hovered;
    if (this.boundingBoxHelper) {
      if (hovered === true) {
        this.boundingBoxHelper.visible = true;
      } else {
        this.boundingBoxHelper.visible = false;
      }
    }
  }

  get isSelected() {
    return this._isSelected;
  }

  set isSelected(selected: boolean) {
    this._isSelected = selected;
    if (this.boundingBoxHelper) {
      if (selected === true) {
        this.boundingBoxHelper.material = this.selectedColor;
      } else {
        this.boundingBoxHelper.material = this.hoverColor;
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
