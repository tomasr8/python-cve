import { Version } from "./types"

export function formatRelativeTime(dateString: string) {
  if (!dateString) {
    return null
  }

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })

  let relative
  if (diffYears > 0) {
    relative = rtf.format(-diffYears, "year")
  } else if (diffMonths > 0) {
    relative = rtf.format(-diffMonths, "month")
  } else if (diffDays > 0) {
    relative = rtf.format(-diffDays, "day")
  } else if (diffHours > 0) {
    relative = rtf.format(-diffHours, "hour")
  } else if (diffMinutes > 0) {
    relative = rtf.format(-diffMinutes, "minute")
  } else {
    relative = rtf.format(-diffSeconds, "second")
  }

  return {
    relative,
    full: date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }
}

export function compressPatchVersions(versions: Version[]): string[] {
  if (versions.length === 0) {
    return []
  }

  const sorted = versions.slice().sort((a, b) => {
    if (a[0] !== b[0]) {
      return a[0] - b[0]
    }
    if (a[1] !== b[1]) {
      return a[1] - b[1]
    }
    return a[2] - b[2]
  })
  const ranges = []
  let start = sorted[0]
  let end = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i][2] === end[2] + 1) {
      end = sorted[i]
    } else {
      if (start[2] === end[2]) {
        ranges.push(`${start[0]}.${start[1]}.${start[2]}`)
      } else {
        ranges.push(
          `${start[0]}.${start[1]}.${start[2]} – ${end[0]}.${end[1]}.${end[2]}`
        )
      }
    }
  }
  if (start[2] === end[2]) {
    ranges.push(`${start[0]}.${start[1]}.${start[2]}`)
  } else {
    ranges.push(
      `${start[0]}.${start[1]}.${start[2]} – ${end[0]}.${end[1]}.${end[2]}`
    )
  }
  return ranges
}
