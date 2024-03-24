import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader'

export const loadFont = (url: string) =>
  new Promise<Font>((resolve, reject) => {
    const loader = new FontLoader()
    loader.load(
      url,
      (font) => resolve(font),
      () => {},
      (err) => reject(err)
    )
  })
