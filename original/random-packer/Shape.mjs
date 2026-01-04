// holds the data about the geomety of shapes ie bananas etc
export default function(type) {
  this.original = []
  this.circles = []
  
  this.fromArray = (arr, scale=1) => {
    
    // sorting order doesn't seem to matter which is weird
    // sort big to small
    arr.sort((a, b) => b[2] - a[2])
    // sort small to big
    // arr.sort((a, b) => a[2] - b[2])
    
    this.original = arr.map(c => ({x:c[0], y:c[1], r:c[2]*scale}))
    this.circles = this.original.map(c => ({...c}))
  }
  
  // takes the original data and transforms it
  this.scaleRotateTranslate = (scale, rotateRadians, translateX, translateY) => {
    this.circles = []
    this.original.forEach(c => {
      const x = c.x * scale
      const y = c.y * scale
      const r = c.r * scale
      // rotate and translate each x and y
      const x2 = x * cos(rotateRadians) - y * sin(rotateRadians) + translateX
      const y2 = x * sin(rotateRadians) + y * cos(rotateRadians) + translateY

      this.circles.push({x:x2, y:y2, r})
    })
  }
  
  this.fromString = (str) => {
    let out = str
    out = out.split(/(.{2})/).filter(_ => _.length === 2)
    out = out.map(n => parseFloat((parseInt(n, 36) / 1000 - 0.5).toFixed(3)))
    const outA = []
    while(out.length) outA.push(out.splice(0,3))
    return outA
  }
  
  if (type) {
    if (typeof type === 'string') {
      type = this.fromString(type)
    }
    // set circles [x, y, radius]
    // these are created in illustrator (drawn over images), exported as SVG, and then processed to be 0->1
    // the data being between 0->1 means you can scale to get X pixels size
    if (Array.isArray(type)) {
      this.fromArray(type)
    }
  }
}