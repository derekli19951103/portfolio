import { extname } from "path";
import { Box3, LoadingManager, Matrix4, Mesh } from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

export default class ThreeDNode {
  object: Mesh;

  bbox: Box3;
  isRayCasted: boolean = false;

  private _isSelected: boolean = false;

  loadingManager: LoadingManager = new LoadingManager();

  constructor(object?: Mesh) {
    this.object = object || new Mesh();

    this.bbox = new Box3();

    if (object) {
      this.bbox = this.bbox.setFromObject(this.object);
    }
  }

  load(url: string) {
    return new Promise<void>((resolve, reject) => {
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

                this.bbox = this.bbox.setFromObject(this.object);

                break;
            }

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

  get isSelected() {
    return this._isSelected;
  }

  setSelected(selected: boolean) {
    this._isSelected = selected;
  }
}
