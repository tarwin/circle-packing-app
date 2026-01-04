// copyright @tarwin
// please let me know if you use it !
class CirclePacker {
  constructor(width, height, numGrid = 15, padding = 1) {
    
    this.width = width
    this.height = height
    this.numGrid = numGrid
    this.padding = padding
    this.gridSizeX = this.width / this.numGrid
    this.gridSizeY = this.height / this.numGrid
    
    this.generateGrid()
    this.items = []

    this._itemsDirty = false
  }
  
  generateGrid() {
    const grid = []
    for (let x=0; x<this.numGrid; x++) {
      grid[x] = []
      for (let y=0; y<this.numGrid; y++) {
        grid[x][y] = {x, y, c: []}
      }
    }
    this.grid = grid
  }

  getGridTilesAround(x, y, r) {
    const tl = [
      Math.floor((x-r-this.padding)/this.gridSizeX),
      Math.floor((y-r-this.padding)/this.gridSizeY),
    ]

    const br = [
      Math.floor((x+r+this.padding)/this.gridSizeX),
      Math.floor((y+r+this.padding)/this.gridSizeY),
    ]

    const tiles = []
    for (let i=tl[0]; i<=br[0]; i++) {
      for (let j=tl[1]; j<=br[1]; j++) {
        if (i < 0 || j < 0 || i >= this.numGrid || j >= this.numGrid) continue
        tiles.push(this.grid[i][j])
      }
    }
    return tiles
  }
  
  getTile(x, y) {
    return this.grid
      [Math.floor(x/this.gridSizeX)]
      [Math.floor(y/this.gridSizeY)]
  }
  
  getCircles(x, y) {
    const tile = this.getTile(x, y)
    const circles = []
    tile.c.forEach(c => {
      if (this.distCirc(c, {x, y, r:0}) < 0) circles.push(c)
    })
    return circles
  }

  distCirc(c1, c2) {
    return Math.sqrt(Math.pow((c1.x-c2.x), 2) + Math.pow((c1.y-c2.y), 2)) - (c1.r + c2.r);
  }
  
  addCircle(c) {
    // break early if out of grid
    if (c.x-c.r < 0 ||
        c.x+c.r > this.width ||
        c.y-c.r < 0 ||
        c.y+c.r > this.height
    ) {
      return null
    }

    // get grid items it could intersect
    const gridTiles = this.getGridTilesAround(c.x, c.y, c.r)

    // add to tiles, and tiles to circles
    gridTiles.forEach(t => {
      this.grid[t.x][t.y].c.push(c)
      if (!c.t) c.t = []
      c.t.push(`${t.x},${t.y}`)
    })
    this.items.push(c)
    return c
  }

  tryToAddCircle(x, y, minRadius = 0, maxRadius = 900, actuallyAdd = true) {
    let c1 = { x, y, r: minRadius, t: [] }

    while (true) {
      
      // break early if out of grid
      if (c1.x-c1.r < 0 ||
          c1.x+c1.r > this.width ||
          c1.y-c1.r < 0 ||
          c1.y+c1.r > this.height
      ) {
        return null
      }
      
      // get grid items it could intersect
      const gridTiles = this.getGridTilesAround(x, y, c1.r)

      // check against all circles
      for (let tile of gridTiles) {
        for (let c2 of tile.c) {
          const d = this.distCirc(c1, c2)
          if (d - this.padding < 0) {
            if (c1.r === minRadius) {
              return null
            } else {
              if (actuallyAdd) {
                // add to tiles, and tiles to circles
                gridTiles.forEach(t => {
                  this.grid[t.x][t.y].c.push(c1)
                  c1.t.push(`${t.x},${t.y}`)
                })
                this.items.push(c1)
              }
              return c1
            }
          }
        }
      }

      c1.r += 1
      if (c1.r > maxRadius) {
				if (actuallyAdd) {
					// add to tiles, and tiles to circles
					gridTiles.forEach(t => {
						this.grid[t.x][t.y].c.push(c1)
						c1.t.push(`${t.x},${t.y}`)
					})
					this.items.push(c1)
				}
        return c1
      }
    }
  }

  tryToAddShape(circles, actuallyAdd = true) {
    for (let c of circles) {
      if (!this.tryToAddCircle(c.x, c.y, c.r, c.r, false)) {
        return null
      }
    }
    if (actuallyAdd) {
      circles.forEach(c => this.addCircle(c))
    }
    return circles
  }

  getItems() {
    if (this._itemsDirty) {
      this.items = this.items.filter(i => !i.__removed)
      this._itemsDirty = false
    }
    return this.items
  }

  removeCircles(x, y, radius) {
    const gridTiles = this.getGridTilesAround(x, y, radius)
    const c1 = { x, y, r: radius }
    
    let hasRemoved = false
    
    // check against all circles
    for (let tile of gridTiles) {
      // tilesLookedAt.push(`${tile.x},${tile.y}`)
      const toKeep = []
      for (let i=0; i<tile.c.length; i++) {
        const d = this.distCirc(c1, tile.c[i])
        if ((d - this.padding) > 0) {
          toKeep.push(this.grid[tile.x][tile.y].c[i])
        } else {
          this.grid[tile.x][tile.y].c[i].__removed = true
          hasRemoved = true
        }
      }
      this.grid[tile.x][tile.y].c = toKeep
    }

    if (hasRemoved) {
      this._itemsDirty = true
    }
    
    return hasRemoved
  }
}