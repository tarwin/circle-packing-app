import type Shape from './Shape'

export interface ShapeDefinition {
  src: string
  col: string
  shape: Shape
  image?: HTMLImageElement
}

export interface Point {
  x: number
  y: number
  r: number
  id: number
}

export interface PlacedImage {
  x: number
  y: number
  scale: number
  rotation: number
  image: HTMLImageElement
  col: string
}

export type RotateMode = 'screen-x' | 'screen-y' | 'random' | 'noise' | 'screen-c' | 'angle-from-center' | ''
export type MaxSizeMode = 'screen-x' | 'screen-y' | 'random' | 'noise' | 'distance-from-center' | ''
