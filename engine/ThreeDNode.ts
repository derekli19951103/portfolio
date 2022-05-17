import { Box3, BoxBufferGeometry, LoadingManager, Mesh, Vector3 } from "three";

export default class ThreeDNode {
  object: Mesh;

  bbox: Box3;
  size = new Vector3();
  collisionBox: Mesh;

  private _isRayCasted: boolean = false;
  private onRayCasted?: (rayCasted: boolean) => void;

  private _isSelected: boolean = false;

  loadingManager: LoadingManager = new LoadingManager();

  constructor(
    object: Mesh,
    params?: { onRayCasted?: (rayCasted: boolean) => void }
  ) {
    this.object = object;

    this.onRayCasted = params?.onRayCasted;

    if (object.geometry.boundingBox) {
      this.bbox = object.geometry.boundingBox;
    } else {
      this.bbox = new Box3().setFromObject(object);
    }

    this.bbox.getSize(this.size);

    this.collisionBox = new Mesh(
      new BoxBufferGeometry(
        this.bbox.max.x - this.bbox.min.x,
        this.bbox.max.y - this.bbox.min.y,
        this.bbox.max.z - this.bbox.min.z
      )
    );
    this.collisionBox.visible = false;
    this.object.add(this.collisionBox);
  }

  get isSelected() {
    return this._isSelected;
  }

  setSelected(selected: boolean) {
    this._isSelected = selected;
  }

  get isRayCasted() {
    return this._isRayCasted;
  }

  setRayCasted(rayCasted: boolean) {
    this._isRayCasted = rayCasted;
    if (this.onRayCasted) {
      this.onRayCasted(rayCasted);
    }
  }
}
