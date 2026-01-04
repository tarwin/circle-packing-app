<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PoissonDiskSampling from 'poisson-disk-sampling'
import { CirclePacker, type Circle } from '../CirclePacker'
import type { ShapeDefinition, Point, PlacedImage, RotateMode, MaxSizeMode } from '../types'

import shapesBase from '../image-packs/base'
import shapesAlien from '../image-packs/alien'
import shapesBug from '../image-packs/bug'
import shapesShell from '../image-packs/shell'
import shapesHina from '../image-packs/hina'

const shapePacks: Record<string, ShapeDefinition[]> = {
  base: shapesBase,
  alien: shapesAlien,
  bug: shapesBug,
  shell: shapesShell,
  hina: shapesHina
}

// Config
const debug = false
const debugLines = false
// can be used by itself, doesn't need debug to be turned on
const debugPoints = false
const doRemoveOfTestBranch = true

const onlyUseSomeShapes = true
const minSomeShapes = 1
const maxSomeShapes = 3

const useSinglePack = false

const rotateUsingChoices: RotateMode[] = ['screen-x', 'screen-y', 'random', 'noise', 'screen-c', 'angle-from-center', '']
const maxUsingChoices: MaxSizeMode[] = ['screen-x', 'screen-y', 'random', 'noise', 'distance-from-center', '']

const rotateMin = 0
const rotateMax = 2 * Math.PI
const maxSizeMin = 120
const maxSizeMax = 300

const renderMultiplier = 2
let backgroundColor = '#000'
const possibleBackgroundColors = [
  '#000',
  '#1e1e1e',
  '#282828',
  '#ebe0d3',
  '#e6e6e6',
  '#fff',
]

const PACKER_PADDING = 2
const MIN_SCALE = 5
const MAX_SCALE = 300
const SCALE_INCREMENT = 5
const NUM_ITEM_PLACE_TRIES = 10000
const NUM_POINT_TRIES = 5

// Refs
const canvasRef = ref<HTMLCanvasElement | null>(null)
const isLoading = ref(true)
const status = ref('Loading images...')

// Simple seeded random (mulberry32)
function createRandom(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// Simple 2D noise approximation
function createNoise() {
  const permutation = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[permutation[i], permutation[j]] = [permutation[j]!, permutation[i]!]
  }
  const p = [...permutation, ...permutation]

  function fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10) }
  function lerp(a: number, b: number, t: number) { return a + t * (b - a) }
  function grad(hash: number, x: number, y: number) {
    const h = hash & 3
    const u = h < 2 ? x : y
    const v = h < 2 ? y : x
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }

  return function noise(x: number, y: number): number {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    x -= Math.floor(x)
    y -= Math.floor(y)
    const u = fade(x)
    const v = fade(y)
    const A = p[X]! + Y
    const B = p[X + 1]! + Y
    return (lerp(
      lerp(grad(p[A]!, x, y), grad(p[B]!, x - 1, y), u),
      lerp(grad(p[A + 1]!, x, y - 1), grad(p[B + 1]!, x - 1, y - 1), u),
      v
    ) + 1) / 2
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      console.log(`Loaded: ${src}`)
      resolve(img)
    }
    img.onerror = (e) => {
      console.error(`Failed to load: ${src}`, e)
      reject(new Error(`Failed to load image: ${src}`))
    }
    img.src = src
  })
}

function pickRandom<T>(arr: T[], random: () => number): T {
  return arr[Math.floor(random() * arr.length)]!
}

async function run() {
  const canvas = canvasRef.value
  if (!canvas) return

  const artWidth = Math.ceil(window.innerWidth)
  const artHeight = Math.ceil(window.innerHeight)

  canvas.width = artWidth * renderMultiplier
  canvas.height = artHeight * renderMultiplier
  canvas.style.width = `${artWidth}px`
  canvas.style.height = `${artHeight}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const random = createRandom(Date.now())
  const noise = createNoise()

  // set background color
  backgroundColor = pickRandom(possibleBackgroundColors, random)

  // Fill background
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Pick rotation and size modes
  const rotateUsing = pickRandom(rotateUsingChoices, random)
  const maxSizeUsing = pickRandom(maxUsingChoices, random)

  const packsToUse = useSinglePack ? [pickRandom(Object.keys(shapePacks), random)] : Object.keys(shapePacks)
  const shapesCanUse:ShapeDefinition[] = packsToUse.map(pack => shapePacks[pack]!).flat()

  // Filter shapes
  let shapesFiltered: ShapeDefinition[]
  if (random() > 0.2 || onlyUseSomeShapes) {
    const count = Math.floor(random() * (Math.min(maxSomeShapes + 1, shapesCanUse.length) - minSomeShapes)) + minSomeShapes
    shapesFiltered = []
    for (let i = 0; i < count; i++) {
      shapesFiltered.push(pickRandom(shapesCanUse, random))
    }
  } else {
    shapesFiltered = [...shapesCanUse]
  }

  // Load images
  status.value = `Loading ${shapesFiltered.length} images...`
  await Promise.all(
    shapesFiltered.map(async (shape) => {
      shape.image = await loadImage(`/img/${shape.src}`)
    })
  )

  status.value = 'Generating points...'
  isLoading.value = false

  // Create packers
  const packer = new CirclePacker(
    artWidth,
    artHeight,
    Math.round(Math.max(artWidth, artHeight) / 1600 * 200),
    PACKER_PADDING
  )
  const poissonPacker = new CirclePacker(
    artWidth,
    artHeight,
    Math.round(Math.max(artWidth, artHeight) / 1600 * 100),
    1
  )

  // Generate poisson points
  status.value = 'Generating points...'
  await new Promise(r => setTimeout(r, 0)) // yield to UI

  const poisson = new PoissonDiskSampling({
    shape: [artWidth, artHeight],
    minDistance: MIN_SCALE / 2,
    maxDistance: MIN_SCALE / 2 * 1.5,
    tries: 10
  })

  const points: Point[] = poisson.fill()
    .map((p: number[], idx: number) => ({ x: p[0]!, y: p[1]!, r: 1, id: idx }))
    .sort(() => random() > 0.5 ? 1 : -1)

  console.log(`Generated ${points.length} poisson points`)
  points.forEach(p => poissonPacker.addCircle(p))

  let pointsNotUsed = [...points]
  let pointCounter = 0
  const pointUseTried: Record<number, number> = {}
  const pointsTried: Point[] = []
  const pointsUsed: Point[] = []

  const MIN_Q_SCALE = Math.sqrt(2) * MIN_SCALE
  const MAX_Q_SCALE = Math.sqrt(2) * MAX_SCALE

  const images: PlacedImage[] = []
  const circles: (Circle & { col?: string })[] = []
  let numItemsAdded = 0
  let timeSpendRemoving = 0

  status.value = 'Packing shapes...'
  await new Promise(r => setTimeout(r, 0)) // yield to UI

  const startTime = Date.now()
  console.log('Starting packing loop...')

  for (let i = 0; i < NUM_ITEM_PLACE_TRIES; i++) {
    // Yield every 50 iterations to prevent UI blocking
    if (i % 50 === 0) {
      status.value = `Packing... ${i}/${NUM_ITEM_PLACE_TRIES} (${numItemsAdded} placed)`
      await new Promise(r => setTimeout(r, 0))
    }
    if (pointCounter > pointsNotUsed.length - 1) {
      pointCounter = 0
    }
    const p = pointsNotUsed[pointCounter]!
    pointCounter++

    if (!pointUseTried[p.id]) {
      pointUseTried[p.id] = 1
      pointsTried.push(p)
    } else {
      pointUseTried[p.id] = pointUseTried[p.id]! + 1
      if (pointUseTried[p.id]! > NUM_POINT_TRIES) {
        continue
      }
    }

    const x = p.x
    const y = p.y

    // Quick test for min scale
    let qtScale = MIN_Q_SCALE
    const quickAdd = packer.tryToAddCircle(x, y, MIN_Q_SCALE, MAX_Q_SCALE, false)
    if (quickAdd) {
      qtScale = quickAdd.r
    }

    let currentScale = Math.max(MIN_SCALE, qtScale)

    // Calculate rotation
    let rotateRadians = random() * Math.PI * 2
    if (rotateUsing === 'screen-x') {
      const screenPercent = (x / artWidth) - 0.5
      rotateRadians = screenPercent * Math.PI
    } else if (rotateUsing === 'screen-y') {
      const screenPercent = (y / artHeight) - 0.5
      rotateRadians = screenPercent * Math.PI
    } else if (rotateUsing === 'screen-c') {
      const distance = Math.hypot(artWidth / 2 - x, artHeight / 2 - y)
      const maxDistance = Math.min(artWidth, artHeight)
      rotateRadians = (distance / maxDistance) * Math.PI * 2
    } else if (rotateUsing === 'angle-from-center') {
      rotateRadians = Math.atan2(artHeight / 2 - y, artWidth / 2 - x)
    } else if (rotateUsing === 'random') {
      rotateRadians = random() * (rotateMax - rotateMin) + rotateMin
    } else if (rotateUsing === 'noise') {
      const n = noise(x * 0.01, y * 0.01)
      rotateRadians = (n - 0.5) * Math.PI
    } else {
      rotateRadians = 0
    }

    // Calculate max scale
    let localMaxScale = MAX_SCALE
    if (maxSizeUsing === 'screen-x') {
      const screenPercent = (x / artWidth) - 0.5
      localMaxScale = Math.max(MIN_SCALE, maxSizeMin + (maxSizeMax - maxSizeMin) * screenPercent)
    } else if (maxSizeUsing === 'screen-y') {
      const screenPercent = (y / artHeight) - 0.5
      localMaxScale = Math.max(MIN_SCALE, maxSizeMin + (maxSizeMax - maxSizeMin) * screenPercent)
    } else if (maxSizeUsing === 'noise') {
      const n = noise(x * 0.01, y * 0.01)
      localMaxScale = Math.max(MIN_SCALE, maxSizeMin + (maxSizeMax - maxSizeMin) * n)
    } else if (maxSizeUsing === 'distance-from-center') {
      const distance = Math.hypot(artWidth / 2 - x, artHeight / 2 - y)
      const minDistance = Math.min(artWidth / 2, artHeight / 2)
      localMaxScale = Math.max(MIN_SCALE, distance / minDistance * MAX_SCALE)
    }

    let lastAdded: Circle[] | null = null
    let lastAddedImage: PlacedImage | null = null
    const currentShape = pickRandom(shapesFiltered, random)

    while (currentScale < localMaxScale) {
      currentShape.shape.scaleRotateTranslate(currentScale, rotateRadians, x, y)
      const added = packer.tryToAddShape(currentShape.shape.circles, false)

      if (!added && !lastAdded) break

      if (!added && lastAdded && lastAddedImage) {
        lastAdded.forEach(c => {
          const circleWithCol = c as Circle & { col?: string }
          circleWithCol.col = currentShape.col
          circles.push(circleWithCol)
          packer.addCircle(c)
        })
        images.push(lastAddedImage)

        if (doRemoveOfTestBranch) {
          const ss = Date.now()
          lastAdded.forEach(c => poissonPacker.removeCircles(c.x, c.y, c.r + PACKER_PADDING))
          if (random() > 0.95) {
            pointsNotUsed = poissonPacker.getItems() as Point[]
          }
          timeSpendRemoving += Date.now() - ss
        }

        pointsUsed.push(p)
        numItemsAdded++
        break
      } else if (added) {
        lastAdded = [...added]
        lastAddedImage = {
          x,
          y,
          scale: currentScale,
          rotation: rotateRadians,
          image: currentShape.image!,
          col: currentShape.col
        }
      }
      currentScale += SCALE_INCREMENT
    }
  }

  const packingTime = Date.now() - startTime

  // Draw
  status.value = 'Drawing...'
  const drawStartTime = Date.now()
  const m = renderMultiplier

  if (debug) {
    for (const c of packer.items) {
      const circleWithCol = c as Circle & { col?: string }
      ctx.beginPath()
      ctx.arc(c.x * m, c.y * m, c.r * m, 0, Math.PI * 2)
      if (debugLines) {
        ctx.strokeStyle = circleWithCol.col || 'white'
        ctx.lineWidth = 1
        ctx.stroke()
      } else {
        ctx.fillStyle = circleWithCol.col || 'white'
        ctx.fill()
      }
    }
  } else {
    for (const img of images) {
      const imgScale = 1 / Math.max(img.image.width, img.image.height)
      ctx.save()
      ctx.translate(img.x * m, img.y * m)
      ctx.rotate(img.rotation)
      ctx.scale(img.scale * imgScale * m, img.scale * imgScale * m)
      ctx.drawImage(img.image, -img.image.width / 2, -img.image.height / 2)
      ctx.restore()
    }
  }

  if (debugPoints) {
    // points that still exist to try
    ctx.strokeStyle = 'red'
    ctx.lineWidth = 1
    for (const c of poissonPacker.getItems()) {
      ctx.beginPath()
      ctx.arc(c.x * m, c.y * m, c.r * m, 0, Math.PI * 2)
      ctx.stroke()
    }

    // those that were tested
    ctx.strokeStyle = 'green'
    for (const c of pointsTried) {
      ctx.beginPath()
      ctx.arc(c.x * m, c.y * m, c.r * m, 0, Math.PI * 2)
      ctx.stroke()
    }

    // ones that were actually placed
    ctx.strokeStyle = 'blue'
    for (const c of pointsUsed) {
      ctx.beginPath()
      ctx.arc(c.x * m, c.y * m, 5 * m, 0, Math.PI * 2)
      ctx.stroke()
    }

    // used too much, ignored
    ctx.strokeStyle = 'orange'
    ctx.fillStyle = 'orange'
    const pointsUsedTooMuchIds = Object.entries(pointUseTried)
      .filter(([_, v]) => v > NUM_POINT_TRIES)
      .map(([id]) => parseInt(id))
    const pointsUsedTooMuchC = pointsTried.filter(c => pointsUsedTooMuchIds.includes(c.id))

    for (const c of pointsUsedTooMuchC) {
      ctx.beginPath()
      ctx.arc(c.x * m, c.y * m, 5 * m, 0, Math.PI * 2)
      ctx.fill()
    }

    console.log(`Used too much: ${pointsUsedTooMuchC.length}`)
  }

  const drawTime = Date.now() - drawStartTime

  // status.value = `Done! ${numItemsAdded} items placed`
  console.log(`Items added: ${numItemsAdded}`)
  console.log(`Packing time: ${packingTime / 1000}s`)
  console.log(`Time Spent Removing: ${timeSpendRemoving / 1000}s`)
  console.log(`Draw time: ${drawTime / 1000}s`)
  console.log(`Total time: ${(Date.now() - startTime) / 1000}s`)
}

onMounted(() => {
  run()
})
</script>

<template>
  <div class="sketch-container">
    <canvas ref="canvasRef"></canvas>
    <div v-if="isLoading" class="loading">{{ status }}</div>
  </div>
</template>

<style scoped>
.sketch-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

canvas {
  display: block;
}

.loading {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-family: monospace;
  font-size: 14px;
  background: rgba(0, 0, 0, 0.7);
  padding: 12px 24px;
  border-radius: 4px;
}
</style>
