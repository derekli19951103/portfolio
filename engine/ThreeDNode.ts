import { Box3, LoadingManager, Mesh, Vector3 } from "three";

export default class ThreeDNode {
  object: Mesh;

  bbox: Box3;
  size = new Vector3();
  isRayCasted: boolean = false;

  private _isSelected: boolean = false;

  loadingManager: LoadingManager = new LoadingManager();

  constructor(object: Mesh) {
    this.object = object;
    this.bbox = new Box3().setFromObject(object);
    this.bbox.getSize(this.size);
  }

  get isSelected() {
    return this._isSelected;
  }

  setSelected(selected: boolean) {
    this._isSelected = selected;
  }
}
