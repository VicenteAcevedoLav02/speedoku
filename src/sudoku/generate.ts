import { cloneBoard, countClues } from "./board.ts"
import {
  generateSolvedBoard,
  hasUniqueSolution,
  isEasySolvable,
} from "./solver.ts"
import { CELL_COUNT, EASY_CLUES, type Board } from "./types.ts"

function shuffledIndices(): number[] {
  const indices = Array.from({ length: CELL_COUNT }, (_, i) => i)
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const a = indices[i]
    const b = indices[j]
    if (a === undefined || b === undefined) {
      continue
    }
    indices[i] = b
    indices[j] = a
  }
  return indices
}

export interface GeneratedPuzzle {
  puzzle: Board
  solution: Board
  clues: number
}

/**
 * Easy sudoku generator calibrated like sudoku.com Easy:
 * always leave exactly 38 clues, unique solution, naked/hidden singles only.
 */
export function generateEasyPuzzle(): GeneratedPuzzle {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const solution = generateSolvedBoard()
    const puzzle = cloneBoard(solution)
    const order = shuffledIndices()

    for (const index of order) {
      if (countClues(puzzle) <= EASY_CLUES) {
        break
      }
      const kept = puzzle[index]
      if (kept === 0) {
        continue
      }
      puzzle[index] = 0
      if (!hasUniqueSolution(puzzle) || !isEasySolvable(puzzle)) {
        puzzle[index] = kept
      }
    }

    if (
      countClues(puzzle) === EASY_CLUES &&
      hasUniqueSolution(puzzle) &&
      isEasySolvable(puzzle)
    ) {
      return { puzzle, solution, clues: EASY_CLUES }
    }
  }

  throw new Error("Could not generate an easy sudoku with exactly 38 clues")
}
