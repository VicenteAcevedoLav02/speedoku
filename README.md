# speedoku

Easy sudoku speedrun playground.

## Local

```bash
pnpm install
pnpm dev
```

## Generate

Easy puzzles are built by:

1. filling a valid complete board with randomized backtracking
2. digging cells while keeping a unique solution
3. rejecting boards that need more than naked/hidden singles
4. always leaving exactly **38 clues** (sudoku.com Easy)
