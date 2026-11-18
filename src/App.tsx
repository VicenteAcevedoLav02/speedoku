import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import {
  insertRecord,
  loadRecords,
  qualifiesForRecord,
  saveRecords,
  type TimeRecord,
} from "./records"
import {
  cloneBoard,
  findConflicts,
  generateEasyPuzzle,
  isComplete,
  SIZE,
  type Board,
  type CellValue,
  type Digit,
} from "./sudoku"
import "./App.css"

const HOLD_RESET_MS = 2000

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export default function App() {
  const [given, setGiven] = useState<Board>(() => Array.from({ length: 81 }, () => 0))
  const [board, setBoard] = useState<Board>(() => Array.from({ length: 81 }, () => 0))
  const [history, setHistory] = useState<Board[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [generating, setGenerating] = useState(true)
  const [countdown, setCountdown] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [paused, setPaused] = useState(false)
  const [showMistakes, setShowMistakes] = useState(true)
  const [lineHelp, setLineHelp] = useState(false)
  const [boxHelp, setBoxHelp] = useState(false)
  const [focusDigit, setFocusDigit] = useState<Digit | 0>(0)
  const [records, setRecords] = useState<TimeRecord[]>(() => loadRecords())
  const [recordName, setRecordName] = useState("")
  const [pendingRecordSeconds, setPendingRecordSeconds] = useState<number | null>(
    null,
  )
  const [holdReset, setHoldReset] = useState(0)
  const timerRef = useRef<number | null>(null)
  const countdownRef = useRef<number | null>(null)
  const recordHandledRef = useRef(false)
  const holdRafRef = useRef<number | null>(null)
  const holdStartRef = useRef<number | null>(null)
  const newGameRef = useRef<() => void>(() => undefined)

  const conflicts = useMemo(() => findConflicts(board), [board])
  const locked = generating || countdown > 0 || paused
  const won = !generating && countdown === 0 && isComplete(board) && conflicts.size === 0

  const filledCount = useMemo(() => {
    let count = 0
    for (const value of board) {
      if (value !== 0) {
        count += 1
      }
    }
    return count
  }, [board])
  const overallProgress = (filledCount / 81) * 100

  const digitCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0, 0, 0]
    for (const value of board) {
      if (value !== 0) {
        counts[value - 1] += 1
      }
    }
    return counts
  }, [board])

  const selectedValue = selected === null ? 0 : board[selected]
  const activeDigit: Digit | 0 =
    selectedValue !== 0 ? selectedValue : focusDigit

  const helpZones = useMemo(() => {
    const rows = new Set<number>()
    const cols = new Set<number>()
    const boxes = new Set<number>()
    if (activeDigit === 0) {
      return { rows, cols, boxes }
    }
    for (let i = 0; i < board.length; i += 1) {
      if (board[i] !== activeDigit) {
        continue
      }
      const row = Math.floor(i / SIZE)
      const col = i % SIZE
      rows.add(row)
      cols.add(col)
      boxes.add(Math.floor(row / 3) * 3 + Math.floor(col / 3))
    }
    return { rows, cols, boxes }
  }, [board, activeDigit])

  const stopTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const clearCountdown = () => {
    if (countdownRef.current !== null) {
      window.clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }

  const startTimer = () => {
    stopTimer()
    timerRef.current = window.setInterval(() => {
      setSeconds((current) => current + 1)
    }, 1000)
  }

  const startCountdown = () => {
    clearCountdown()
    stopTimer()
    setCountdown(3)
    let remaining = 3
    countdownRef.current = window.setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        clearCountdown()
        setCountdown(0)
        startTimer()
        return
      }
      setCountdown(remaining)
    }, 1000)
  }

  const cancelHoldReset = () => {
    if (holdRafRef.current !== null) {
      window.cancelAnimationFrame(holdRafRef.current)
      holdRafRef.current = null
    }
    holdStartRef.current = null
    setHoldReset(0)
  }

  const newGame = () => {
    cancelHoldReset()
    clearCountdown()
    setGenerating(true)
    setCountdown(0)
    setSelected(null)
    setFocusDigit(0)
    setHistory([])
    setSeconds(0)
    setPaused(false)
    setPendingRecordSeconds(null)
    setRecordName("")
    recordHandledRef.current = false
    stopTimer()
    window.setTimeout(() => {
      const generated = generateEasyPuzzle()
      setGiven(generated.puzzle)
      setBoard(cloneBoard(generated.puzzle))
      setGenerating(false)
      startCountdown()
    }, 30)
  }

  newGameRef.current = newGame

  useEffect(() => {
    newGame()
    return () => {
      stopTimer()
      clearCountdown()
      cancelHoldReset()
    }
  }, [])

  useEffect(() => {
    if (won || paused || generating || countdown > 0) {
      stopTimer()
      return
    }
    if (timerRef.current === null) {
      startTimer()
    }
  }, [won, paused, generating, countdown])

  useEffect(() => {
    if (!won || recordHandledRef.current) {
      return
    }
    recordHandledRef.current = true
    if (qualifiesForRecord(seconds, records)) {
      setPendingRecordSeconds(seconds)
    }
  }, [won, seconds, records])

  const place = (index: number, value: CellValue) => {
    if (value !== 0) {
      setFocusDigit(value)
    }
    if (locked || given[index] !== 0 || won) {
      return
    }
    setBoard((current) => {
      if (current[index] === value) {
        return current
      }
      setHistory((history) => [...history, cloneBoard(current)])
      const next = cloneBoard(current)
      next[index] = value
      return next
    })
  }

  const chooseDigit = (digit: Digit) => {
    setFocusDigit(digit)
    if (selected !== null && given[selected] === 0) {
      place(selected, digit)
    }
  }

  const eraseSelected = () => {
    if (selected === null || given[selected] !== 0) {
      return
    }
    place(selected, 0)
  }

  const undo = () => {
    if (locked || won) {
      return
    }
    setHistory((current) => {
      if (current.length === 0) {
        return current
      }
      const previous = current[current.length - 1]
      if (previous) {
        setBoard(previous)
      }
      return current.slice(0, -1)
    })
  }

  const submitRecord = (event: FormEvent) => {
    event.preventDefault()
    if (pendingRecordSeconds === null) {
      return
    }
    const name = recordName.trim().slice(0, 24) || "Player"
    const next = insertRecord(records, {
      name,
      seconds: pendingRecordSeconds,
      at: new Date().toISOString(),
    })
    setRecords(next)
    saveRecords(next)
    setPendingRecordSeconds(null)
    setRecordName("")
  }

  const skipRecord = () => {
    setPendingRecordSeconds(null)
    setRecordName("")
  }

  const beginHoldReset = () => {
    if (holdStartRef.current !== null || generating) {
      return
    }
    holdStartRef.current = performance.now()
    const tick = (now: number) => {
      const start = holdStartRef.current
      if (start === null) {
        return
      }
      const progress = Math.min(1, (now - start) / HOLD_RESET_MS)
      setHoldReset(progress)
      if (progress >= 1) {
        holdRafRef.current = null
        holdStartRef.current = null
        setHoldReset(0)
        newGameRef.current()
        return
      }
      holdRafRef.current = window.requestAnimationFrame(tick)
    }
    holdRafRef.current = window.requestAnimationFrame(tick)
  }

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false
      }
      const tag = target.tagName
      return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || pendingRecordSeconds !== null) {
        return
      }

      if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault()
      }

      if (event.key.toLowerCase() === "r" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault()
        if (!event.repeat) {
          beginHoldReset()
        }
        return
      }

      if (locked || won) {
        return
      }

      if (event.key >= "1" && event.key <= "9") {
        chooseDigit(Number(event.key) as Digit)
        return
      }

      if (selected === null) {
        if (
          event.key === "ArrowRight" ||
          event.key === "ArrowLeft" ||
          event.key === "ArrowDown" ||
          event.key === "ArrowUp"
        ) {
          setSelected(0)
        }
        return
      }

      if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
        place(selected, 0)
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault()
        undo()
        return
      }
      if (event.key === "ArrowRight") {
        setSelected((current) => (current === null ? 0 : (current + 1) % 81))
      }
      if (event.key === "ArrowLeft") {
        setSelected((current) => (current === null ? 0 : (current + 80) % 81))
      }
      if (event.key === "ArrowDown") {
        setSelected((current) => (current === null ? 0 : (current + SIZE) % 81))
      }
      if (event.key === "ArrowUp") {
        setSelected((current) => (current === null ? 0 : (current + 72) % 81))
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "r") {
        cancelHoldReset()
      }
    }

    const onBlur = () => cancelHoldReset()

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    window.addEventListener("blur", onBlur)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", onBlur)
    }
  }, [selected, locked, won, given, pendingRecordSeconds])

  const boardBusy = generating || countdown > 0 || paused

  return (
    <div className="app">
      <header className="brand">
        <h1 className="brand-title">SPEEDOKU</h1>
        <p className="brand-by">by Vincente</p>
      </header>

      <div className="play">
        <div className="digit-progress" aria-label="Progress by number">
          {digitCounts.map((count, index) => {
            const digit = index + 1
            const capped = Math.min(count, 9)
            return (
              <div key={digit} className="digit-row">
                <span className="digit-label">{digit}</span>
                <div
                  className="digit-track"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={9}
                  aria-valuenow={capped}
                  aria-label={`Digit ${digit}`}
                >
                  <div
                    className={`digit-fill${capped >= 9 ? " complete" : ""}`}
                    style={{ width: `${(capped / 9) * 100}%` }}
                  />
                </div>
                <span className="digit-count">{capped}/9</span>
              </div>
            )
          })}
        </div>

        <div className="board-column">
          <div
            className={`board-wrap${paused ? " is-paused" : ""}${countdown > 0 ? " is-countdown" : ""}`}
          >
            {generating ? <div className="loading">Generating easy puzzle…</div> : null}
            {won ? <div className="win">Puzzle solved</div> : null}
            {countdown > 0 ? (
              <div className="countdown-overlay" aria-live="assertive">
                <span className="countdown-number" key={countdown}>
                  {countdown}
                </span>
              </div>
            ) : null}
            {paused ? (
              <button
                type="button"
                className="pause-overlay"
                onClick={() => setPaused(false)}
                aria-label="Resume game"
              >
                <span className="pause-overlay-blur" aria-hidden="true" />
                <span className="pause-overlay-label">Paused</span>
              </button>
            ) : null}
            <div className="board" role="grid" aria-label="Sudoku board">
              {board.map((value, index) => {
                const row = Math.floor(index / SIZE)
                const col = index % SIZE
                const isGiven = given[index] !== 0
                const isSelected = selected === index
                const isConflict = showMistakes && conflicts.has(index)
                const boxId = Math.floor(row / 3) * 3 + Math.floor(col / 3)
                const isPeer =
                  !lineHelp &&
                  !boxHelp &&
                  selected !== null &&
                  selected !== index &&
                  (Math.floor(selected / SIZE) === row ||
                    selected % SIZE === col ||
                    (Math.floor(Math.floor(selected / SIZE) / 3) === Math.floor(row / 3) &&
                      Math.floor((selected % SIZE) / 3) === Math.floor(col / 3)))
                const isSameDigit =
                  activeDigit !== 0 && value === activeDigit && !isSelected
                const isLineHelp =
                  lineHelp &&
                  activeDigit !== 0 &&
                  (helpZones.rows.has(row) || helpZones.cols.has(col))
                const isBoxHelp =
                  boxHelp && activeDigit !== 0 && helpZones.boxes.has(boxId)

                const className = [
                  "cell",
                  isGiven ? "given" : "editable",
                  isSelected ? "selected" : "",
                  isConflict ? "conflict" : "",
                  isPeer ? "peer" : "",
                  isSameDigit ? "same" : "",
                  isLineHelp ? "line-help" : "",
                  isBoxHelp ? "box-help" : "",
                  col % 3 === 2 && col !== 8 ? "thick-right" : "",
                  row % 3 === 2 && row !== 8 ? "thick-bottom" : "",
                ]
                  .filter(Boolean)
                  .join(" ")

                return (
                  <button
                    key={index}
                    type="button"
                    className={className}
                    role="gridcell"
                    aria-selected={isSelected}
                    disabled={boardBusy || won}
                    onClick={() => {
                      setSelected(index)
                      const cellValue = board[index]
                      if (cellValue !== 0) {
                        setFocusDigit(cellValue)
                      }
                    }}
                  >
                    {value === 0 ? "" : value}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="overall-progress">
            <div className="overall-top">
              <span>Progress</span>
              <span>
                {filledCount}/81 · {Math.round(overallProgress)}%
              </span>
            </div>
            <div
              className="overall-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={81}
              aria-valuenow={filledCount}
              aria-label="Overall progress"
            >
              <div
                className={`overall-fill${won ? " complete" : ""}`}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>

        <aside className="side">
          <div className="stats">
            <div className="stat">
              <span className="stat-label">Difficulty</span>
              <span className="stat-value">Easy</span>
            </div>
          </div>

          <div className="session-stack">
            <button
              type="button"
              className="big-time"
              onClick={() => {
                if (generating || countdown > 0 || won) {
                  return
                }
                setPaused((current) => !current)
              }}
              aria-label={paused ? "Resume timer" : "Pause timer"}
              disabled={generating || countdown > 0 || won}
            >
              <span className="big-time-value">{formatTime(seconds)}</span>
              <span className="pause-icon" aria-hidden="true">
                {paused ? "▶" : "❚❚"}
              </span>
            </button>

            <button
              type="button"
              className={`new-game${holdReset > 0 ? " holding" : ""}`}
              onClick={newGame}
              disabled={generating}
              style={
                holdReset > 0
                  ? {
                      background: `linear-gradient(90deg, #2a4f9a ${holdReset * 100}%, #325aaf ${holdReset * 100}%)`,
                    }
                  : undefined
              }
            >
              New Game
            </button>
            <p className="hold-hint">Hold R 2s to reset</p>
          </div>

          <div className="tools">
            <button
              type="button"
              className="tool"
              onClick={undo}
              disabled={history.length === 0 || locked || won}
            >
              <span className="tool-icon" aria-hidden="true">
                ↺
              </span>
              <span>Undo</span>
            </button>
            <button
              type="button"
              className="tool"
              onClick={eraseSelected}
              disabled={selected === null || given[selected] !== 0 || locked || won}
            >
              <span className="tool-icon" aria-hidden="true">
                ⌫
              </span>
              <span>Erase</span>
            </button>
          </div>

          <div className="pad" aria-label="Number pad">
            {([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((digit) => (
              <button
                key={digit}
                type="button"
                className={`pad-btn${activeDigit === digit ? " active" : ""}`}
                disabled={locked || won}
                onClick={() => chooseDigit(digit)}
              >
                {digit}
              </button>
            ))}
          </div>

          <div className="help-switches">
            <label className="help-switch">
              <input
                type="checkbox"
                checked={showMistakes}
                onChange={(event) => setShowMistakes(event.target.checked)}
              />
              <span className="switch-ui" aria-hidden="true" />
              <span>Show mistakes in red</span>
            </label>
            <label className="help-switch">
              <input
                type="checkbox"
                checked={lineHelp}
                onChange={(event) => setLineHelp(event.target.checked)}
              />
              <span className="switch-ui" aria-hidden="true" />
              <span>Show lines for every matching number</span>
            </label>
            <label className="help-switch">
              <input
                type="checkbox"
                checked={boxHelp}
                onChange={(event) => setBoxHelp(event.target.checked)}
              />
              <span className="switch-ui" aria-hidden="true" />
              <span>Highlight 3×3 boxes that already have it</span>
            </label>
          </div>
        </aside>
      </div>

      <section className="records" aria-label="Fastest times">
        <div className="records-head">
          <h2>Fastest times</h2>
          <span>Top 5 · this device</span>
        </div>
        {records.length === 0 ? (
          <p className="records-empty">No records yet.</p>
        ) : (
          <ol className="records-list">
            {records.map((record, index) => (
              <li key={`${record.at}-${record.seconds}-${record.name}`}>
                <span className="records-rank">{index + 1}</span>
                <span className="records-name">{record.name}</span>
                <span className="records-time">{formatTime(record.seconds)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {pendingRecordSeconds !== null ? (
        <div className="record-modal" role="dialog" aria-modal="true" aria-labelledby="record-title">
          <form className="record-card" onSubmit={submitRecord}>
            <h2 id="record-title">New record!</h2>
            <p>
              You finished in <strong>{formatTime(pendingRecordSeconds)}</strong>.
              Enter a name to save it.
            </p>
            <label className="record-label" htmlFor="record-name">
              Name
            </label>
            <input
              id="record-name"
              className="record-input"
              value={recordName}
              onChange={(event) => setRecordName(event.target.value)}
              maxLength={24}
              autoFocus
              placeholder="Your name"
            />
            <div className="record-actions">
              <button type="button" className="record-skip" onClick={skipRecord}>
                Skip
              </button>
              <button type="submit" className="record-save">
                Save record
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
