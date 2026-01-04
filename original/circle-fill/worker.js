// min size a circle can be ie resolution
let MIN_CIRCLE_SIZE = 2
// higher treats the image as lower resolution ... kinda?
let PIXEL_JUMP = 3

// if there is a lot of empty space higher values will actually be slower
let RAYCAST_JUMP = 5
// if this is less than one the quality for smaller parts will be better
let RAYCAST_REVERSE_AMOUNT = 1
// max distance to cast a ray
let RAYCAST_MAX = 1500

// increase for more accuracy, but slower speed
let RAYCAST_NUM = 66
let RAYCAST_ANGLE = Math.PI*2/RAYCAST_NUM

let ALPHA_HIT = 1

function lengthUntilEmpty(fImg, x, y, w, h) {

	// if pixel is blank don't even try ..
	if (fImg[(x + y * w)] < ALPHA_HIT) {
		return 0
	}
	
	let shortest = -1
	
	// start facing towards closest edge?
	// should speed it up a tiny bit
	let startingAngle = 0
	if (x < w / 2) {
		startingAngle = Math.PI
		if (y < h / 4) startingAngle += Math.PI / 2
		if (y > (h / 4) * 3) startingAngle -= Math.PI / 2
	} else {
		if (y < h / 4) startingAngle -= Math.PI / 2
		if (y > (h / 4) * 3) startingAngle += Math.PI / 2
	}
	
	for (let angle=startingAngle; angle<Math.PI*2+startingAngle; angle+=RAYCAST_ANGLE) {

		let mag = 1
		let foundMag = null
		
		// mag of 1
		const vx = Math.cos(angle)
		const vy = Math.sin(angle)
		
		// mag 1
		let dx = vx
		let dy = vy
		
		while(mag < RAYCAST_MAX) {
			// break early: saves 1/6 time
			if (shortest !== -1 && mag > shortest) {
				foundMag = mag
				break
			}
			
			const x2 = Math.floor(x + dx)
			const y2 = Math.floor(y + dy)
			
			// outside area
			if (x2 < 0 || x2 > w || y2 < 0 || y2 > h) {
				foundMag = mag
				break
			}
			
			if (fImg[(x2 + y2 * w)] < ALPHA_HIT) {
				foundMag = mag
				break
			}
			
			dx += vx * RAYCAST_JUMP
			dy += vy * RAYCAST_JUMP
			mag += RAYCAST_JUMP
		}
		
		// if it's possible we went X pixels past an edge, lets rewind to find the actual edge
		if (foundMag) {
			for (let i=foundMag-1; i>foundMag-RAYCAST_JUMP; i-=1) {
				const x2 = Math.floor(x + vx * i)
				const y2 = Math.floor(y + vy * i)
				
				if (fImg[(x2 + y2 * w)] >= ALPHA_HIT) {
					foundMag = i
					break
				}
			}
		}

		if (shortest === -1 || foundMag !== null && foundMag < shortest) {
			shortest = foundMag
		}
	}
	return shortest
}

onmessage = function(e) {
	
  const allCircles = []
	const width = e.data.width
	const height = e.data.height
		
	RAYCAST_MAX = Math.max(width, height)
	
	ALPHA_HIT = e.data.alphaHit || ALPHA_HIT
	MIN_CIRCLE_SIZE = e.data.minCircleSize || MIN_CIRCLE_SIZE
	PIXEL_JUMP = e.data.pixelJump || PIXEL_JUMP
	RAYCAST_JUMP = e.data.raycastJump || RAYCAST_JUMP
	RAYCAST_REVERSE_AMOUNT = e.data.raycastReverseAmount || RAYCAST_REVERSE_AMOUNT
	RAYCAST_NUM = e.data.raycastNum || RAYCAST_NUM
	RAYCAST_ANGLE = Math.PI*2/RAYCAST_NUM
	
	// n of m parts
	let part = e.data.part || [1, 1]
	let partHeight = Math.ceil(height / part[1])
	let partStartHeight = partHeight * (part[0] - 1)
	
	let pCount = 0
	
	for (let y=partStartHeight; y<Math.min(height, partStartHeight+partHeight); y+=PIXEL_JUMP) {
		for (let x=0; x<width; x+=PIXEL_JUMP) {
			const shortest = lengthUntilEmpty(e.data.img, x, y, width, height)
			if (shortest > MIN_CIRCLE_SIZE) {
				allCircles.push([x, y, shortest])
			}
			// give progress each 1 percent
			const p = Math.round(((y * width + x) / (width * height)) * 100)
			if (p % 1 === 0 && p > pCount) {
				pCount = p
				postMessage({
					progress: p
				});
			}
		}
	}
	
	postMessage({
		complete: true,
		circles: allCircles
	});
}