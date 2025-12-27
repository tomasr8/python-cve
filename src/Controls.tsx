import { useState, useEffect, useRef } from "react"
import overview from "virtual:overview"

const pythonVersions = [
  "all",
  ...overview.versions.map(v => v.version.join(".")),
]

function SearchStats({
  totalAdvisories,
  shownAdvisories,
}: {
  totalAdvisories: number
  shownAdvisories: number
}) {
  return (
    <div className="mt-4 pt-4 border-t border-dark-border flex gap-6 text-xs">
      <div>
        <span className="text-dark-text-muted">Total Advisories:</span>{" "}
        <span className="text-python-yellow font-semibold">
          {totalAdvisories}
        </span>
      </div>
      <div>
        <span className="text-dark-text-muted">Showing:</span>{" "}
        <span className="text-python-yellow font-semibold">
          {shownAdvisories}
        </span>
      </div>
    </div>
  )
}

function SearchField({
  searchInput,
  setSearchInput,
}: {
  searchInput: string
  setSearchInput: (value: string) => void
}) {
  return (
    <div>
      <label className="block text-xs text-dark-text-muted mb-2 uppercase tracking-wider">
        Search
      </label>
      <input
        type="search"
        value={searchInput}
        onChange={e => setSearchInput(e.target.value)}
        placeholder="CVE-2024-1234, id, description..."
        className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-sm focus:outline-none focus:border-python-blue transition-colors"
      />
    </div>
  )
}

function SortByField({
  sortBy,
  setSortBy,
}: {
  sortBy: string
  setSortBy: (value: string) => void
}) {
  return (
    <div>
      <label
        htmlFor="sort-by"
        className="block text-xs text-dark-text-muted mb-2 uppercase tracking-wider"
      >
        Sort By
      </label>
      <select
        id="sort-by"
        value={sortBy}
        onChange={e => setSortBy(e.target.value)}
        className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-sm focus:outline-none focus:border-python-blue transition-colors cursor-pointer"
      >
        <option value="published_date_newest">
          Published date (newest first)
        </option>
        <option value="published_date_oldest">
          Published date (oldest first)
        </option>
        <option value="modified_date_newest">
          Modified date (newest first)
        </option>
        <option value="modified_date_oldest">
          Modified date (oldest first)
        </option>
        <option value="severity_highest">Severity (highest first)</option>
        <option value="severity_lowest">Severity (lowest first)</option>
      </select>
    </div>
  )
}

export default function Controls({
  advisoriesControls,
  searchInput,
  setSearchInput,
  versionInputValue,
  setVersionInputValue,
  sortBy,
  setSortBy,
  setSelectedVersion,
  totalAdvisories,
  shownAdvisories,
}: {
  advisoriesControls: React.RefObject<HTMLFormElement>
  searchInput: string
  setSearchInput: (value: string) => void
  versionInputValue: string
  setVersionInputValue: (value: string) => void
  sortBy: string
  setSortBy: (value: string) => void
  setSelectedVersion: (value: string) => void
  totalAdvisories: number
  shownAdvisories: number
}) {
  const versionComboboxRef = useRef<HTMLDivElement>(null)
  const [showVersionDropdown, setShowVersionDropdown] = useState(false)
  const [activeOptionIndex, setActiveOptionIndex] = useState(-1)

  // Handle click outside of version combobox
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        versionComboboxRef.current &&
        !versionComboboxRef.current.contains(event.target)
      ) {
        setShowVersionDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Handle version option selection
  const handleVersionSelect = (version: string) => {
    setSelectedVersion(version)
    setVersionInputValue(version === "all" ? "All Versions" : version)
    setShowVersionDropdown(false)
    setActiveOptionIndex(-1)
  }

  // Handle version combobox input
  const handleVersionInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setVersionInputValue(value)
    setShowVersionDropdown(true)
    setActiveOptionIndex(-1)

    // Try to match exact version or "all"
    const normalizedValue = value.toLowerCase().trim()
    if (normalizedValue === "all versions" || normalizedValue === "all") {
      setSelectedVersion("all")
    } else if (pythonVersions.includes(normalizedValue)) {
      setSelectedVersion(normalizedValue)
    } else {
      // Set as custom version
      setSelectedVersion(normalizedValue || "all")
    }
  }

  // Handle version combobox keyboard navigation
  const handleVersionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      !showVersionDropdown &&
      (e.key === "ArrowDown" || e.key === "ArrowUp")
    ) {
      setShowVersionDropdown(true)
      setActiveOptionIndex(0)
      e.preventDefault()
      return
    }

    if (!showVersionDropdown) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setActiveOptionIndex(prev =>
          prev < pythonVersions.length - 1 ? prev + 1 : prev
        )
        break
      case "ArrowUp":
        e.preventDefault()
        setActiveOptionIndex(prev => (prev > 0 ? prev - 1 : 0))
        break
      case "Enter":
        e.preventDefault()
        if (
          activeOptionIndex >= 0 &&
          activeOptionIndex < pythonVersions.length
        ) {
          handleVersionSelect(pythonVersions[activeOptionIndex])
        } else {
          setShowVersionDropdown(false)
        }
        break
      case "Escape":
        e.preventDefault()
        setShowVersionDropdown(false)
        setActiveOptionIndex(-1)
        break
      case "Tab":
        setShowVersionDropdown(false)
        break
      default:
        break
    }
  }

  return (
    <form
      role="search"
      aria-label="Filter advisories"
      ref={advisoriesControls}
      className="scroll-mt-4 bg-dark-surface border border-dark-border p-6 rounded mb-6"
      onSubmit={e => e.preventDefault()}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SearchField
          searchInput={searchInput}
          setSearchInput={setSearchInput}
        />

        {/* Version Filter - Combobox */}
        <div ref={versionComboboxRef} className="relative">
          <label
            id="version-label"
            className="block text-xs text-dark-text-muted mb-2 uppercase tracking-wider"
          >
            Python Version
          </label>
          <div className="relative">
            <input
              type="text"
              role="combobox"
              aria-labelledby="version-label"
              aria-expanded={showVersionDropdown}
              aria-controls="version-listbox"
              aria-activedescendant={
                activeOptionIndex >= 0
                  ? `version-option-${activeOptionIndex}`
                  : undefined
              }
              aria-autocomplete="list"
              value={versionInputValue}
              onChange={handleVersionInputChange}
              onFocus={() => setShowVersionDropdown(true)}
              onKeyDown={handleVersionKeyDown}
              placeholder="Type or select a version..."
              className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-sm focus:outline-none focus:border-python-blue transition-colors pr-8"
            />
            <svg
              className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-text-muted pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
          {showVersionDropdown && pythonVersions.length > 0 && (
            <ul
              id="version-listbox"
              role="listbox"
              aria-labelledby="version-label"
              className="absolute z-10 w-full mt-1 bg-dark-bg border border-dark-border rounded shadow-lg max-h-60 overflow-auto"
            >
              {pythonVersions.map((version, index) => {
                const displayValue =
                  version === "all" ? "All Versions" : version
                return (
                  <li
                    key={version}
                    id={`version-option-${index}`}
                    role="option"
                    aria-selected={activeOptionIndex === index}
                    onClick={() => handleVersionSelect(version)}
                    onMouseEnter={() => setActiveOptionIndex(index)}
                    className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                      activeOptionIndex === index
                        ? "bg-python-blue/20 text-python-blue"
                        : "text-dark-text hover:bg-dark-surface"
                    }`}
                  >
                    {displayValue}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <SortByField sortBy={sortBy} setSortBy={setSortBy} />
      </div>

      <SearchStats
        totalAdvisories={totalAdvisories}
        shownAdvisories={shownAdvisories}
      />

      <button type="submit" hidden>
        Submit
      </button>
    </form>
  )
}
