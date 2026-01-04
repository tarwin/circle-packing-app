declare module 'poisson-disk-sampling' {
  interface PoissonDiskSamplingOptions {
    shape: [number, number]
    minDistance: number
    maxDistance: number
    tries?: number
    distanceFunction?: (point: number[]) => number
    bias?: number
  }

  class PoissonDiskSampling {
    constructor(options: PoissonDiskSamplingOptions)
    fill(): number[][]
    addPoint(point: number[]): number[] | undefined
    next(): number[] | undefined
    reset(): void
  }

  export default PoissonDiskSampling
}
