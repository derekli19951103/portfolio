import {
  Box3,
  BoxBufferGeometry,
  LineSegments,
  LoadingManager,
  Mesh,
  Vector2,
  Vector3,
} from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { ThickWireframe } from "./utils/geometries";

export default class ThreeDNode {
  object: Mesh;

  bbox: Box3;
  size = new Vector3();
  collisionBox: Mesh;
  wire?: Line2;

  private _isRayCasted: boolean = false;
  onRayCasted?: (rayCasted: boolean) => void;

  private _isSelected: boolean = false;
  onSelected?: (selected: boolean) => void;

  loadingManager: LoadingManager = new LoadingManager();

  constructor(
    object: Mesh,
    params?: {
      onRayCasted?: (rayCasted: boolean) => void;
      onSelected?: (selected: boolean) => void;
    }
  ) {
    this.object = object;

    this.onRayCasted = params?.onRayCasted;
    this.onSelected = params?.onSelected;

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

  calculateWireframe(offset?: Vector3) {
    const wire = new LineGeometry().fromLineSegments(
      new LineSegments(ThickWireframe(this.bbox, offset || new Vector3()))
    );

    this.wire = new Line2(
      wire,
      new LineMaterial({
        color: 0xffffff,
        linewidth: 4,
        resolution: new Vector2(window.innerWidth, window.innerHeight),
      })
    );

    this.wire.visible = false;

    this.object.add(this.wire);
  }

  get isSelected() {
    return this._isSelected;
  }

  setSelected(selected: boolean) {
    this._isSelected = selected;
    if (this.onSelected) {
      this.onSelected(selected);
    }
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
