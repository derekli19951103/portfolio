export const getRandomPointInInterval = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min)

export const getRandomPointInOval = (weight: number, height: number) => {
  const x = Math.random() * weight
  const y = Math.random() * height
  const angle = Math.random() * 2 * Math.PI
  return {
    x: x * Math.cos(angle) + weight / 2,
    y: y * Math.sin(angle) + height / 2
  }
}
