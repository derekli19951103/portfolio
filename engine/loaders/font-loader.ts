import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader'

const fontCache = new Map<string, Promise<Font>>()
const loader = new FontLoader()

export const loadFont = (url: string): Promise<Font> => {
  const cached = fontCache.get(url)
  if (cached) return cached

  const promise = new Promise<Font>((resolve, reject) => {
    loader.load(
      url,
      (font) => resolve(font),
      () => {},
      (err) => reject(err)
    )
  })

  fontCache.set(url, promise)
  return promise
}
