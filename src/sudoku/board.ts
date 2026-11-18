import { BOX, CELL_COUNT, SIZE, type Board, type CellValue, type Digit } from "./types.ts"

export function emptyBoard(): Board {
  return Array.from({ length: CELL_COUNT }, () => 0)
}

export function cloneBoard(board: Board): Board {
  return board.slice() as Board
}

export function rowOf(index: number): number {
  return Math.floor(index / SIZE)
}

export function colOf(index: number): number {
  return index % SIZE
}

export function boxOf(index: number): number {
  const row = rowOf(index)
  const col = colOf(index)
  return Math.floor(row / BOX) * BOX + Math.floor(col / BOX)
}

export function indexAt(row: number, col: number): number {
  return row * SIZE + col
}

export function isValidPlacement(board: Board, index: number, value: Digit): boolean {
  const row = rowOf(index)
  const col = colOf(index)
  const boxRow = Math.floor(row / BOX) * BOX
  const boxCol = Math.floor(col / BOX) * BOX

  for (let c = 0; c < SIZE; c += 1) {
    if (c !== col && board[indexAt(row, c)] === value) {
      return false
    }
  }
  for (let r = 0; r < SIZE; r += 1) {
    if (r !== row && board[indexAt(r, col)] === value) {
      return false
    }
  }
  for (let r = boxRow; r < boxRow + BOX; r += 1) {
    for (let c = boxCol; c < boxCol + BOX; c += 1) {
      const i = indexAt(r, c)
      if (i !== index && board[i] === value) {
        return false
      }
    }
  }
  return true
}

export function candidates(board: Board, index: number): Digit[] {
  if (board[index] !== 0) {
    return []
  }
  const options: Digit[] = []
  for (let n = 1; n <= 9; n += 1) {
    const digit = n as Digit
    if (isValidPlacement(board, index, digit)) {
      options.push(digit)
    }
  }
  return options
}

export function findConflicts(board: Board): Set<number> {
  const bad = new Set<number>()
  for (let i = 0; i < CELL_COUNT; i += 1) {
    const value = board[i]
    if (value === 0) {
      continue
    }
    if (!isValidPlacement(board, i, value)) {
      bad.add(i)
    }
  }
  return bad
}

export function isComplete(board: Board): boolean {
  for (let i = 0; i < CELL_COUNT; i += 1) {
    const value = board[i]
    if (value === 0 || !isValidPlacement(board, i, value)) {
      return false
    }
  }
  return true
}

export function countClues(board: Board): number {
  let count = 0
  for (const cell of board) {
    if (cell !== 0) {
      count += 1
    }
  }
  return count
}

export function asDigit(value: CellValue): Digit | null {
  return value === 0 ? null : value
}
