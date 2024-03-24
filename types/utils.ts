import { Tween } from '@tweenjs/tween.js'

export interface Coord3 {
  x: number
  y: number
  z: number
}

export interface Coord2 {
  x: number
  y: number
}

export interface TextAnimation {
  animation: Tween<Coord3>
  start: Coord3
  end: Coord3
}
