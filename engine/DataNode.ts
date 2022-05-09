import { Vector3 } from "three";

export default class DataNode {
  position: Vector3;
  dimension: Vector3;

  constructor(props: { position: Vector3; dimension: Vector3 }) {
    const { position, dimension } = props;

    this.position = position;
    this.dimension = dimension;
  }
}
