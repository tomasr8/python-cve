import React from "react"

// Apply search highlighting to text
function highlight(text: string, searchTerm: string) {
  if (!searchTerm || !text) {
    return text
  }

  const regex = new RegExp(`(${RegExp.escape(searchTerm)})`, "gi")
  const parts = text.split(regex)

  if (parts.length === 1) {
    return text
  }

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark
        key={index}
        className="bg-python-yellow/30 text-python-yellow-light rounded px-0.5"
      >
        {part}
      </mark>
    ) : (
      part
    )
  )
}

// Highlight text and convert https URLs to clickable links
// URLs are detected first to keep them intact, then highlighting is applied
export default function HighlightText({
  text,
  searchTerm,
}: {
  text: string
  searchTerm: string
}) {
  if (!text) {
    return text
  }

  const urlRegex = /(https:\/\/[^\s<>"{}|\\^`[\]]+)/g
  const parts = text.split(urlRegex)

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      // This is a URL, render as link with highlighted text inside
      return (
        <a
          key={index}
          href={part}
          rel="noopener noreferrer"
          className="text-python-blue hover:text-python-yellow underline underline-offset-2 transition-colors"
        >
          {highlight(part, searchTerm)}
        </a>
      )
    }
    // Regular text, apply highlighting
    return (
      <React.Fragment key={index}>{highlight(part, searchTerm)}</React.Fragment>
    )
  })
}
