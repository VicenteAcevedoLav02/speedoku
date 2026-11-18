import {
  candidates,
  cloneBoard,
  emptyBoard,
  isValidPlacement,
} from "./board.ts"
import { CELL_COUNT, SIZE, type Board, type Digit } from "./types.ts"

function shuffle<T>(items: T[]): T[] {
  const next = items.slice()
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const a = next[i]
    const b = next[j]
    if (a === undefined || b === undefined) {
      continue
    }
    next[i] = b
    next[j] = a
  }
  return next
}

function digits(): Digit[] {
  return shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])
}

function firstEmpty(board: Board): number {
  for (let i = 0; i < CELL_COUNT; i += 1) {
    if (board[i] === 0) {
      return i
    }
  }
  return -1
}

/** Fill an empty board with a random complete valid solution. */
export function generateSolvedBoard(): Board {
  const board = emptyBoard()

  const fill = (): boolean => {
    const index = firstEmpty(board)
    if (index < 0) {
      return true
    }
    for (const value of digits()) {
      if (!isValidPlacement(board, index, value)) {
        continue
      }
      board[index] = value
      if (fill()) {
        return true
      }
      board[index] = 0
    }
    return false
  }

  if (!fill()) {
    throw new Error("Failed to generate a solved sudoku board")
  }
  return board
}

/**
 * Count solutions up to `limit` (usually 2 for uniqueness checks).
 * Mutates a working copy only.
 */
export function countSolutions(board: Board, limit = 2): number {
  const work = cloneBoard(board)
  let found = 0

  const search = (): boolean => {
    // Prefer the emptiest cell (MRV) for speed.
    let best = -1
    let bestOptions: Digit[] = []
    for (let i = 0; i < CELL_COUNT; i += 1) {
      if (work[i] !== 0) {
        continue
      }
      const options = candidates(work, i)
      if (options.length === 0) {
        return false
      }
      if (best < 0 || options.length < bestOptions.length) {
        best = i
        bestOptions = options
        if (options.length === 1) {
          break
        }
      }
    }

    if (best < 0) {
      found += 1
      return found >= limit
    }

    for (const value of bestOptions) {
      work[best] = value
      if (search()) {
        work[best] = 0
        return true
      }
      work[best] = 0
    }
    return false
  }

  search()
  return found
}

export function hasUniqueSolution(board: Board): boolean {
  return countSolutions(board, 2) === 1
}

/** Solve using only naked singles + hidden singles (easy human techniques). */
export function solveWithEasyTechniques(puzzle: Board): Board | null {
  const board = cloneBoard(puzzle)

  const applyNakedSingles = (): boolean => {
    let progressed = false
    for (let i = 0; i < CELL_COUNT; i += 1) {
      if (board[i] !== 0) {
        continue
      }
      const options = candidates(board, i)
      if (options.length === 1 && options[0] !== undefined) {
        board[i] = options[0]
        progressed = true
      } else if (options.length === 0) {
        return false
      }
    }
    return progressed
  }

  const applyHiddenSingles = (): boolean => {
    let progressed = false

    const placeHidden = (indices: number[]): boolean => {
      let changed = false
      for (let n = 1; n <= 9; n += 1) {
        const digit = n as Digit
        const spots: number[] = []
        for (const index of indices) {
          if (board[index] !== 0) {
            continue
          }
          if (isValidPlacement(board, index, digit)) {
            spots.push(index)
          }
        }
        if (spots.length === 1 && spots[0] !== undefined) {
          board[spots[0]] = digit
          changed = true
        }
      }
      return changed
    }

    for (let row = 0; row < SIZE; row += 1) {
      const indices = Array.from({ length: SIZE }, (_, col) => row * SIZE + col)
      if (placeHidden(indices)) {
        progressed = true
      }
    }
    for (let col = 0; col < SIZE; col += 1) {
      const indices = Array.from({ length: SIZE }, (_, row) => row * SIZE + col)
      if (placeHidden(indices)) {
        progressed = true
      }
    }
    for (let box = 0; box < SIZE; box += 1) {
      const boxRow = Math.floor(box / 3) * 3
      const boxCol = (box % 3) * 3
      const indices: number[] = []
      for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 3; c += 1) {
          indices.push((boxRow + r) * SIZE + (boxCol + c))
        }
      }
      if (placeHidden(indices)) {
        progressed = true
      }
    }
    return progressed
  }

  while (true) {
    const naked = applyNakedSingles()
    const hidden = applyHiddenSingles()
    if (!naked && !hidden) {
      break
    }
  }

  for (let i = 0; i < CELL_COUNT; i += 1) {
    if (board[i] === 0) {
      return null
    }
  }
  return board
}

export function isEasySolvable(puzzle: Board): boolean {
  return solveWithEasyTechniques(puzzle) !== null
}
