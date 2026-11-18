export type TimeRecord = {
  name: string
  seconds: number
  at: string
}

const STORAGE_KEY = "speedoku-records-v1"
export const MAX_RECORDS = 5

function isRecord(value: unknown): value is TimeRecord {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const record = value as Partial<TimeRecord>
  return (
    typeof record.name === "string" &&
    typeof record.seconds === "number" &&
    Number.isFinite(record.seconds) &&
    record.seconds >= 0 &&
    typeof record.at === "string"
  )
}

export function loadRecords(): TimeRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter(isRecord)
      .sort((a, b) => a.seconds - b.seconds)
      .slice(0, MAX_RECORDS)
  } catch {
    return []
  }
}

export function saveRecords(records: TimeRecord[]): void {
  const next = [...records]
    .sort((a, b) => a.seconds - b.seconds)
    .slice(0, MAX_RECORDS)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export function qualifiesForRecord(
  seconds: number,
  records: TimeRecord[],
): boolean {
  if (records.length < MAX_RECORDS) {
    return true
  }
  const slowest = records[records.length - 1]
  return slowest !== undefined && seconds < slowest.seconds
}

export function insertRecord(
  records: TimeRecord[],
  entry: TimeRecord,
): TimeRecord[] {
  return [...records, entry]
    .sort((a, b) => a.seconds - b.seconds)
    .slice(0, MAX_RECORDS)
}
