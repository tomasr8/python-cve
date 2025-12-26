export function formatRelativeTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

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
