export type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export type CellValue = 0 | Digit
export type Board = CellValue[]

export const SIZE = 9
export const BOX = 3
export const CELL_COUNT = SIZE * SIZE

/** sudoku.com Easy clue count. */
export const EASY_CLUES = 38
