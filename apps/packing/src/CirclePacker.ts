// copyright @tarwin
// please let me know if you use it !

export interface Circle {
  x: number
  y: number
  r: number
  t?: string[]
  __removed?: boolean
}

interface GridTile {
  x: number
  y: number
  c: Circle[]
}

export class CirclePacker {
  private width: number
  private height: number
  private numGrid: number
  private padding: number
  private paddingSq: number
  private gridSizeX: number
  private gridSizeY: number
  private grid: GridTile[][] = []
  private _itemsDirty: boolean = false
  items: Circle[] = []

  constructor(width: number, height: number, numGrid: number = 15, padding: number = 1) {
    this.width = width
    this.height = height
    this.numGrid = numGrid
    this.padding = padding
    this.paddingSq = padding * padding
    this.gridSizeX = this.width / this.numGrid
    this.gridSizeY = this.height / this.numGrid

    this.generateGrid()
  }

  private generateGrid(): void {
    const grid: GridTile[][] = []
    for (let x = 0; x < this.numGrid; x++) {
      grid[x] = []
      for (let y = 0; y < this.numGrid; y++) {
        grid[x]![y] = { x, y, c: [] }
      }
    }
    this.grid = grid
  }

  private getGridTilesAround(x: number, y: number, r: number): GridTile[] {
    // Pre-clamp bounds to avoid checks inside loop
    const minI = Math.max(0, Math.floor((x - r - this.padding) / this.gridSizeX))
    const minJ = Math.max(0, Math.floor((y - r - this.padding) / this.gridSizeY))
    const maxI = Math.min(this.numGrid - 1, Math.floor((x + r + this.padding) / this.gridSizeX))
    const maxJ = Math.min(this.numGrid - 1, Math.floor((y + r + this.padding) / this.gridSizeY))

    const tiles: GridTile[] = []
    for (let i = minI; i <= maxI; i++) {
      for (let j = minJ; j <= maxJ; j++) {
        tiles.push(this.grid[i]![j]!)
      }
    }
    return tiles
  }

  private getTile(x: number, y: number): GridTile {
    return this.grid[Math.floor(x / this.gridSizeX)]![Math.floor(y / this.gridSizeY)]!
  }

  getCircles(x: number, y: number): Circle[] {
    const tile = this.getTile(x, y)
    const circles: Circle[] = []
    const tileCircles = tile.c
    for (let i = 0; i < tileCircles.length; i++) {
      const c = tileCircles[i]!
      // Use squared distance, comparing against 0 (point has r=0)
      const dx = c.x - x
      const dy = c.y - y
      if (dx * dx + dy * dy < c.r * c.r) {
        circles.push(c)
      }
    }
    return circles
  }

  // Squared distance between circle centers
  private distSq(c1x: number, c1y: number, c2x: number, c2y: number): number {
    const dx = c1x - c2x
    const dy = c1y - c2y
    return dx * dx + dy * dy
  }

  // Check if two circles collide (with padding)
  private collides(c1x: number, c1y: number, c1r: number, c2: Circle): boolean {
    const combinedR = c1r + c2.r + this.padding
    return this.distSq(c1x, c1y, c2.x, c2.y) < combinedR * combinedR
  }

  private isOutOfBounds(x: number, y: number, r: number): boolean {
    return x - r < 0 || x + r > this.width || y - r < 0 || y + r > this.height
  }

  addCircle(c: Circle): Circle | null {
    if (this.isOutOfBounds(c.x, c.y, c.r)) {
      return null
    }

    const gridTiles = this.getGridTilesAround(c.x, c.y, c.r)

    // add to tiles, and tiles to circles
    if (!c.t) c.t = []
    for (let i = 0; i < gridTiles.length; i++) {
      const t = gridTiles[i]!
      this.grid[t.x]![t.y]!.c.push(c)
      c.t.push(`${t.x},${t.y}`)
    }
    this.items.push(c)
    return c
  }

  // Check if a circle at given position/radius collides with any existing circle
  private hasCollision(x: number, y: number, r: number): boolean {
    const gridTiles = this.getGridTilesAround(x, y, r)
    for (let i = 0; i < gridTiles.length; i++) {
      const tile = gridTiles[i]!
      const tileCircles = tile.c
      for (let j = 0; j < tileCircles.length; j++) {
        if (this.collides(x, y, r, tileCircles[j]!)) {
          return true
        }
      }
    }
    return false
  }

  tryToAddCircle(
    x: number,
    y: number,
    minRadius: number = 0,
    maxRadius: number = 900,
    actuallyAdd: boolean = true
  ): Circle | null {
    // Early bounds check at minimum radius
    if (this.isOutOfBounds(x, y, minRadius)) {
      return null
    }

    // Check if even minimum radius collides
    if (this.hasCollision(x, y, minRadius)) {
      return null
    }

    // Binary search for maximum valid radius
    let lo = minRadius
    let hi = maxRadius

    // Clamp hi to bounds (floor to ensure integer comparison works)
    hi = Math.floor(Math.min(hi, x, this.width - x, y, this.height - y))
    lo = Math.floor(lo)

    if (hi < lo) {
      return null
    }

    // Binary search to find max radius that doesn't collide
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2)
      if (this.hasCollision(x, y, mid)) {
        hi = mid - 1
      } else {
        lo = mid
      }
    }

    // Check if hi works, otherwise use lo
    let finalRadius = lo
    if (hi > lo && !this.hasCollision(x, y, hi)) {
      finalRadius = hi
    }

    const c1: Circle = { x, y, r: finalRadius, t: [] }

    if (actuallyAdd) {
      const gridTiles = this.getGridTilesAround(x, y, finalRadius)
      for (let i = 0; i < gridTiles.length; i++) {
        const t = gridTiles[i]!
        this.grid[t.x]![t.y]!.c.push(c1)
        c1.t!.push(`${t.x},${t.y}`)
      }
      this.items.push(c1)
    }

    return c1
  }

  tryToAddShape(circles: Circle[], actuallyAdd: boolean = true): Circle[] | null {
    for (let i = 0; i < circles.length; i++) {
      const c = circles[i]!
      if (this.hasCollision(c.x, c.y, c.r)) {
        return null
      }
      if (this.isOutOfBounds(c.x, c.y, c.r)) {
        return null
      }
    }
    if (actuallyAdd) {
      for (let i = 0; i < circles.length; i++) {
        this.addCircle(circles[i]!)
      }
    }
    return circles
  }

  getItems(): Circle[] {
    if (this._itemsDirty) {
      this.items = this.items.filter((i) => !i.__removed)
      this._itemsDirty = false
    }
    return this.items
  }

  removeCircles(x: number, y: number, radius: number): boolean {
    const gridTiles = this.getGridTilesAround(x, y, radius)

    let hasRemoved = false

    for (let t = 0; t < gridTiles.length; t++) {
      const tile = gridTiles[t]!
      const tileCircles = this.grid[tile.x]![tile.y]!.c
      const toKeep: Circle[] = []

      for (let i = 0; i < tileCircles.length; i++) {
        const c = tileCircles[i]!
        const combinedR = radius + c.r + this.padding
        const distSq = this.distSq(x, y, c.x, c.y)

        if (distSq > combinedR * combinedR) {
          toKeep.push(c)
        } else {
          c.__removed = true
          hasRemoved = true
        }
      }

      this.grid[tile.x]![tile.y]!.c = toKeep
    }

    if (hasRemoved) {
      this._itemsDirty = true
    }

    return hasRemoved
  }
}
