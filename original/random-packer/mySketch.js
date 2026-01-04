
// enable to see the underlying circles
const debug = false;
const debugLines = false;
const debugPoints = false;
const doRemoveOfTestBranch = true;

const onlyUseSomeShapes = true;
const minSomeShapes = 1;
const maxSomeShapes = 3;

const rotateUsingChoices = ['screen-x', 'screen-y', 'random', 'noise', 'screen-c', 'angle-from-center', '']
const rotateUsing = rotateUsingChoices[Math.floor(Math.random() * rotateUsingChoices.length)]
const rotateMin = 0
const rotateMax = 2 * Math.PI

const maxUsingChoices = ['screen-x', 'screen-y', 'random', 'noise', 'distance-from-center', '']
const maxSizeUsing = maxUsingChoices[Math.floor(Math.random() * maxUsingChoices.length)]
const maxSizeMin = 120
const maxSizeMax = 300

const R_SEED = 0;

const artWidth = Math.ceil(window.innerWidth)
const artHeight = Math.ceil(window.innerHeight)

// const artWidth = 800
// const artHeight = 800

const renderMultiplier = 4
const backgroundColor = 40

// my circle packing library
// (width, height, numberOfSections, padding)
// you can change the padding
// numberOfSections is how many boxes to cut the screen up into both x and y for optimization
// normally I use something like 15, but more worked better here
const PACKER_PADDING = 2
const packer = new CirclePacker(artWidth, artHeight, Math.round(Math.max(artWidth, artHeight) / 1600 * 200), PACKER_PADDING);
const poissonPacker = new CirclePacker(artWidth, artHeight, Math.round(Math.max(artWidth, artHeight) / 1600 * 100), 1);

// change these to change the number of items and their scale
const MIN_SCALE = 5
const MAX_SCALE = 300
// const MAX_SCALE = 100
const SCALE_INCREMENT = 5
const NUM_ITEM_PLACE_TRIES_PER_FRAME = 10000
const NUM_ITEM_PLACE_TRIES_TOTAL = 20000
const NUM_POINT_TRIES = 5

// final circles that have been added
const circles = []
// final images to draw
const images = []

import ShapesBase from './img/base.mjs'

// for lookup
let shapes = ShapesBase
let shapesFiltered = []

// ================================================================================================
// actual processing stuff

window.preload = function() {
	if (random() > 0.2 || onlyUseSomeShapes) {
		for (let i=0; i<floor(random(minSomeShapes, min(maxSomeShapes + 1, shapes.length))); i++) {
			shapesFiltered.push(random(shapes))
		}
	} else {
		shapesFiltered = shapes
	}
	// shapesFiltered = [shapes[0]]

	for (let shape of shapesFiltered) {
		shape.image = loadImage(`./img/${shape.src}`)
	}
}

const pointsTried = []
const pointsUsed = []
const pointUseTried = []
const pointUseTriedTooMuch = []
let points = []
let numItemsAdded = 0

let timeSpendRemoving = 0

window.setup = function() {
	if (R_SEED) {
		randomSeed(R_SEED)
		Math.random = random
	}

	createCanvas(artWidth*renderMultiplier, artHeight*renderMultiplier);
	background(color(backgroundColor));
	noLoop()
	
	const poisson = new PoissonDiskSampling({
			shape: [artWidth, artHeight],
			minDistance: MIN_SCALE/2,
			maxDistance: MIN_SCALE/2*1.5,
			tries: 10
	});
	points = poisson.fill().map((p, indx) => ({x:p[0], y:p[1], r:1, id:indx})).sort((a, b) => random() > 0.5 ? 1 : -1);
	points.forEach(p => poissonPacker.addCircle(p))
	
	let pointsNotUsed = [...points]
	let pointCounter = 0
	
	const MIN_Q_SCALE = sqrt(2) * MIN_SCALE
	const MAN_Q_SCALE = sqrt(2) * MAX_SCALE
	
	const testTimeStart = Date.now()
	for (let i=0; i<NUM_ITEM_PLACE_TRIES_PER_FRAME; i++) {
		if (pointCounter > pointsNotUsed.length - 1) {
			pointCounter = 0
			// pointsNotUsed = poissonPacker.getItems()
		}
		const p = pointsNotUsed[pointCounter]
		pointCounter++
		if (!pointUseTried[p.id]) {
			pointUseTried[p.id] = 1
			pointsTried.push(p)
		} else {
			pointUseTried[p.id]++
			if (pointUseTried[p.id] > NUM_POINT_TRIES) {
				pointUseTriedTooMuch.push(pointUseTried[p.id])
				continue
			}
		}
			
		let x = p.x
		let y = p.y
		// ----------------------------------------
		
		// do a quick test to work out min scale
		let qtScale = MIN_Q_SCALE
		const quickAdd = packer.tryToAddCircle(x, y, MIN_Q_SCALE, MAN_Q_SCALE, false)
		if (quickAdd) {
			qtScale = quickAdd.r
		}
		
		// ----------------------------------------
		
		let currentScale = max(MIN_SCALE, qtScale)
		
		let rotateRadians = random(0, PI*2)
		if (rotateUsing === 'screen-x') {
			const screenPercent = (x / artWidth) - 0.5
			rotateRadians = 1*screenPercent*PI
		} else if (rotateUsing === 'screen-y') {
			const screenPercent = (y / artHeight) - 0.5
			rotateRadians = 1*screenPercent*PI
		} else if (rotateUsing === 'screen-c') {
			const distance = Math.hypot(Math.abs(artWidth/2-x), Math.abs(artHeight/2-y))
			const maxDistance = Math.min(artWidth, artHeight)
			rotateRadians = (distance/maxDistance)*PI*2
		} else if (rotateUsing === 'angle-from-center') {
			const angle = Math.atan2(artHeight/2-y, artWidth/2-x)
			rotateRadians = angle
		} else if (rotateUsing === 'random') {
			rotateRadians = random(rotateMin, rotateMax)
		} else if (rotateUsing === 'noise') {
			const n = noise(x * 0.01, y * 0.01)
			rotateRadians = (n - 0.5) * PI
		} else { //  none
			rotateRadians = 0
		}
		
		let lastAdded = null
		let lastAddedImage = null
		
		// get a shape to draw
		let currentShape = random(shapesFiltered)
		
		let localMaxScale = MAX_SCALE
		if (maxSizeUsing === 'screen-x') {
			const screenPercent = (x / artWidth) - 0.5
			localMaxScale = max(MIN_SCALE, maxSizeMin + (maxSizeMax - maxSizeMin) * screenPercent)
		} else if (maxSizeUsing === 'screen-y') {
			const screenPercent = (y / artHeight) - 0.5
			localMaxScale = max(MIN_SCALE, maxSizeMin + (maxSizeMax - maxSizeMin) * screenPercent)
		} else if (maxSizeUsing === 'noise') {
			const n = noise(x * 0.01, y * 0.01)
			localMaxScale = max(MIN_SCALE, maxSizeMin + (maxSizeMax - maxSizeMin) * n)
		} else if (rotateUsing === 'distance-from-center') {
			const distance = Math.hypot(Math.abs(artWidth/2-x), Math.abs(artHeight/2-y))
			const minDistance = Math.min(artWidth/2, artHeight/2)
			localMaxScale = max(MIN_SCALE, distance/minDistance)
		}
		
		while(currentScale < localMaxScale) {
			currentShape.shape.scaleRotateTranslate(currentScale, rotateRadians, x, y)
			const added = packer.tryToAddShape(currentShape.shape.circles, false)
			if (added) added.col = currentShape.col
			
			// never added
			if (!added && !lastAdded) break

			// wasn't added, but could add at last test
			if (!added && lastAdded && lastAddedImage) {
				const col = currentShape.col
				lastAdded.forEach(c => {
					circles.push({ x: c.x, y: c.y, r: c.r, col: col })
					c.col = col
				})
				
				lastAdded.forEach(c => packer.addCircle(c))
				images.push(lastAddedImage)
				
				// remove all poisson points under shape
				if (doRemoveOfTestBranch) {
					const ss = Date.now()
					lastAdded.forEach(c => poissonPacker.removeCircles(c.x, c.y, c.r+PACKER_PADDING))
					if (random() > 0.95) {
						pointsNotUsed = poissonPacker.getItems()
					}
					timeSpendRemoving += Date.now() - ss
				}
				
				numItemsAdded++
				
				break
				
			// can add at size
			} else if (added) {
				lastAdded = [...added]
				
				pointsUsed.push({ x, y, r:1 })
				
				lastAddedImage = {
					x,
					y,
					scale: currentScale,
					rotation: rotateRadians,
					image: currentShape.image,
					col: currentShape.color
				}
			}
			currentScale += SCALE_INCREMENT
		}
	}
	console.log(`SETUP TIME: ${(Date.now()-testTimeStart)/1000}`)
}

window.draw = function() {
	noStroke()

	console.log(`Number of Items Added: ${numItemsAdded}`)

	if (debug) {
		const m = renderMultiplier
		if (debugLines) {
			noFill()
			strokeWeight(1)
			stroke('white')
		}
		packer.items.forEach(c => {
		// circles.forEach(c => {
			if (c.col) {
				if (debugLines) {
					stroke(c.col)
				} else {
					fill(c.col)
				}
			}
			circle(c.x*m, c.y*m, c.r*2*m)
		})
	} else {
		const testTimeStart = Date.now()
		const m = renderMultiplier
		images.forEach(img => {
			let imgScale = 1/max(img.image.width, img.image.height)
			push();
			translate(img.x*m, img.y*m);
			rotate(img.rotation);
			imageMode(CENTER);
			scale(img.scale * imgScale * m);
			image(img.image, 0, 0);
			pop();
		})
		console.log(`DRAW TIME: ${(Date.now()-testTimeStart)/1000}`)
	}
	
	if (debugPoints) {
		const m = renderMultiplier
		
		// points that still exist to try
		stroke('red')
		poissonPacker.getItems().forEach(c => circle(c.x*m, c.y*m, c.r*m))

		// those that were tested
		stroke('green')
		pointsTried.forEach(c => circle(c.x*m, c.y*m, c.r*m))

		// ones that were actually placed
		stroke('blue')
		pointsUsed.forEach(c => circle(c.x*m, c.y*m, 5*m))
		
		// used too much, ignored
		stroke('orange')
		fill('orange')
		const pointsUsedTooMuchIv = pointUseTried.map((v, i) => ({...v, i, v})).filter(p => p.v > NUM_POINT_TRIES).map(p => p.i)
		const pointsUsedTooMuchC = pointsTried.filter(c => pointsUsedTooMuchIv.includes(c.id))
		
		pointsUsedTooMuchC.forEach(c => circle(c.x*m, c.y*m, 5*m))
		
		console.log(`Used too much: ${pointsUsedTooMuchC.length}`)
	}
	console.log(`Time Spent Removing: ${timeSpendRemoving/1000}`)
}