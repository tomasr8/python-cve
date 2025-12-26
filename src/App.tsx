import { useState, useEffect, useMemo, useRef } from "react"
import advisories from "virtual:advisories"
import overview from "virtual:overview"
import { formatRelativeTime } from "./util"
import Controls from "./Controls"
import VersionOverview from "./Overview"
import HighlightText from "./HighlightText"
import { Advisory, Advisories, Version } from "./types"

const { last_updated } = overview
const pythonVersions = [
  "all",
  ...overview.versions.map(v => v.version.join(".")),
]

const lastUpdateDate = formatRelativeTime(last_updated)

function App() {
  const validSortOptions = [
    "published_date_newest",
    "published_date_oldest",
    "modified_date_newest",
    "modified_date_oldest",
    "severity_highest",
    "severity_lowest",
  ]
  const [selectedVersion, setSelectedVersion] = useState(() => {
    // Initialize from URL parameter if present
    const params = new URLSearchParams(window.location.search)
    const v = params.get("version")
    if (pythonVersions.includes(v)) {
      return v
    }
    return "all"
  })
  const [searchTerm, setSearchTerm] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get("q") || ""
  })
  const [searchInput, setSearchInput] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get("q") || ""
  })
  const [sortBy, setSortBy] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const sortBy = params.get("sort")
    if (validSortOptions.includes(sortBy)) {
      return sortBy
    }
    return "published_date_newest"
  })
  const [displayCount, setDisplayCount] = useState(50)
  const advisoriesControls = useRef<HTMLDivElement>(null)
  const [versionInputValue, setVersionInputValue] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const v = params.get("version")
    if (pythonVersions.includes(v)) {
      return v === "all" ? "All Versions" : v
    }
    return "All Versions"
  })

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput)
    }, 200)

    return () => clearTimeout(timer)
  }, [searchInput])

  // Update URL when version changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    if (selectedVersion === "all") {
      params.delete("version")
    } else {
      params.set("version", selectedVersion)
    }

    if (searchTerm) {
      params.set("q", searchTerm)
    } else {
      params.delete("q")
    }

    if (sortBy !== "published_date_newest") {
      params.set("sort", sortBy)
    } else {
      params.delete("sort")
    }

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname

    window.history.replaceState({}, "", newUrl)
  }, [selectedVersion, sortBy, searchTerm])

  // Filter and sort advisories
  const filteredAdvisories = useMemo(() => {
    let filtered = advisories

    const parts = selectedVersion
      .split(".")
      .filter(s => s !== "")
      .map(n => parseInt(n, 10))
    const isValidVersion =
      parts.length > 0 && parts.length <= 3 && parts.every(n => !isNaN(n))

    if (
      !isValidVersion &&
      selectedVersion !== "all" &&
      selectedVersion !== ""
    ) {
      return []
    }

    function matchesVersionPrefix(prefixParts: number[], version: Version) {
      for (let i = 0; i < prefixParts.length; i++) {
        if (version[i] !== prefixParts[i]) {
          return false
        }
      }
      return true
    }

    // Filter by Python version
    if (isValidVersion) {
      filtered = filtered.filter((advisory: Advisory) => {
        return advisory.affected_versions.some(range => {
          if (range.length === 1) {
            return matchesVersionPrefix(parts, range[0])
          }
          if (parts.length <= 2) {
            return matchesVersionPrefix(parts, range[0])
          }
          const startPatch = range[0][2]
          const endPatch = range[1][2]
          return (
            matchesVersionPrefix(parts.slice(0, 2), range[0]) &&
            parts[2] >= startPatch &&
            parts[2] <= endPatch
          )
        })
      })
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((advisory: Advisory) => {
        const inId = advisory.id.toLowerCase().includes(term)
        const inAliases = (advisory.cve || "").toLowerCase().includes(term)
        const inDetails = advisory.details?.toLowerCase().includes(term)

        return inId || inAliases || inDetails
      })
    }

    // Sort advisories
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "published_date_newest") {
        return new Date(b.published) - new Date(a.published)
      } else if (sortBy === "published_date_oldest") {
        return new Date(a.published) - new Date(b.published)
      } else if (sortBy === "modified_date_newest") {
        return new Date(b.modified) - new Date(a.modified)
      } else if (sortBy === "modified_date_oldest") {
        return new Date(a.modified) - new Date(b.modified)
      } else if (sortBy === "severity_highest") {
        return (
          (severityOrder[b.severity?.name?.toLowerCase()] ?? -1) -
          (severityOrder[a.severity?.name?.toLowerCase()] ?? -1)
        )
      } else if (sortBy === "severity_lowest") {
        return (
          (severityOrder[a.severity?.name?.toLowerCase()] ?? -1) -
          (severityOrder[b.severity?.name?.toLowerCase()] ?? -1)
        )
      }
      return 0
    })

    return sorted
  }, [advisories, selectedVersion, searchTerm, sortBy])

  // Handle version selection and scroll to advisories list
  const handleViewCVEs = (version: string) => {
    setVersionInputValue(version)
    setSelectedVersion(version)
    setTimeout(() => {
      advisoriesControls.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }, 10)
  }

  // Infinite scroll with scroll position check
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = window.innerHeight

      // Load more when within 500px of bottom
      if (
        scrollTop + clientHeight >= scrollHeight - 500 &&
        displayCount < filteredAdvisories.length
      ) {
        setDisplayCount(prev => Math.min(prev + 50, filteredAdvisories.length))
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [displayCount, filteredAdvisories.length])

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(50)
  }, [selectedVersion, searchTerm, sortBy])

  return (
    <div className="min-h-screen p-4 md:p-8">
      <main className="max-w-7xl mx-auto">
        <Header lastUpdateDate={lastUpdateDate} />

        <VersionOverview handleViewCVEs={handleViewCVEs} />

        <Controls
          advisoriesControls={advisoriesControls}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          versionInputValue={versionInputValue}
          setVersionInputValue={setVersionInputValue}
          sortBy={sortBy}
          setSortBy={setSortBy}
          setSelectedVersion={setSelectedVersion}
          totalAdvisories={advisories.length}
          shownAdvisories={filteredAdvisories.length}
        />

        <AdvisoryList
          filteredAdvisories={filteredAdvisories}
          searchTerm={searchInput}
          displayCount={displayCount}
        />

        <Footer />
      </main>
    </div>
  )
}

export default App

function Header({
  lastUpdateDate,
}: {
  lastUpdateDate: { full: string; relative: string }
}) {
  return (
    <header className="mb-4 md:mb-8">
      <div className="flex items-center justify-between gap-2 md:gap-4">
        <div className="flex items-center gap-2 md:gap-4">
          <PythonLogo />
          <div>
            <h1 className="text-xl md:text-4xl font-bold tracking-tight">
              <span className="text-python-blue">Python</span>{" "}
              <span className="text-python-yellow">CVE</span>{" "}
              <span className="text-dark-text">Browser</span>
            </h1>
            <p className="hidden md:block text-dark-text-muted text-sm mt-1">
              Browse security advisories published by the PSF
            </p>
          </div>
        </div>
        <div className="hidden md:flex flex-col items-end text-xs text-dark-text-muted shrink-0">
          <span className="uppercase tracking-wider">Last Update</span>
          <span
            className="font-mono text-sm text-dark-text"
            title={lastUpdateDate.full}
          >
            {lastUpdateDate.relative}
          </span>
        </div>
      </div>
    </header>
  )
}

function PythonLogo() {
  return (
    <div className="relative shrink-0">
      <svg
        className="w-8 h-8 md:w-14 md:h-14"
        viewBox="0 0 256 255"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid"
      >
        <defs>
          <linearGradient
            x1="12.959%"
            y1="12.039%"
            x2="79.639%"
            y2="78.201%"
            id="pythonBlue"
          >
            <stop stopColor="#387EB8" offset="0%" />
            <stop stopColor="#366994" offset="100%" />
          </linearGradient>
          <linearGradient
            x1="19.128%"
            y1="20.579%"
            x2="90.742%"
            y2="88.429%"
            id="pythonYellow"
          >
            <stop stopColor="#FFE052" offset="0%" />
            <stop stopColor="#FFC331" offset="100%" />
          </linearGradient>
        </defs>
        <path
          d="M126.916.072c-64.832 0-60.784 28.115-60.784 28.115l.072 29.128h61.868v8.745H41.631S.145 61.355.145 126.77c0 65.417 36.21 63.097 36.21 63.097h21.61v-30.356s-1.165-36.21 35.632-36.21h61.362s34.475.557 34.475-33.319V33.97S194.67.072 126.916.072zM92.802 19.66a11.12 11.12 0 0 1 11.13 11.13 11.12 11.12 0 0 1-11.13 11.13 11.12 11.12 0 0 1-11.13-11.13 11.12 11.12 0 0 1 11.13-11.13z"
          fill="url(#pythonBlue)"
        />
        <path
          d="M128.757 254.126c64.832 0 60.784-28.115 60.784-28.115l-.072-29.127H127.6v-8.745h86.441s41.486 4.705 41.486-60.712c0-65.416-36.21-63.096-36.21-63.096h-21.61v30.355s1.165 36.21-35.632 36.21h-61.362s-34.475-.557-34.475 33.32v56.013s-5.235 33.897 62.518 33.897zm34.114-19.586a11.12 11.12 0 0 1-11.13-11.13 11.12 11.12 0 0 1 11.13-11.131 11.12 11.12 0 0 1 11.13 11.13 11.12 11.12 0 0 1-11.13 11.13z"
          fill="url(#pythonYellow)"
        />
      </svg>
    </div>
  )
}

function Footer() {
  return (
    <footer className="mt-4 pt-4 md:mt-8 md:pt-8 mb-4 text-center text-xs text-dark-text-muted">
      <div className="flex items-center justify-center gap-2 mb-4">
        <svg
          className="w-5 h-5 opacity-60"
          viewBox="0 0 256 255"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M126.916.072c-64.832 0-60.784 28.115-60.784 28.115l.072 29.128h61.868v8.745H41.631S.145 61.355.145 126.77c0 65.417 36.21 63.097 36.21 63.097h21.61v-30.356s-1.165-36.21 35.632-36.21h61.362s34.475.557 34.475-33.319V33.97S194.67.072 126.916.072zM92.802 19.66a11.12 11.12 0 0 1 11.13 11.13 11.12 11.12 0 0 1-11.13 11.13 11.12 11.12 0 0 1-11.13-11.13 11.12 11.12 0 0 1 11.13-11.13z"
            fill="#4B8BBE"
          />
          <path
            d="M128.757 254.126c64.832 0 60.784-28.115 60.784-28.115l-.072-29.127H127.6v-8.745h86.441s41.486 4.705 41.486-60.712c0-65.416-36.21-63.096-36.21-63.096h-21.61v30.355s1.165 36.21-35.632 36.21h-61.362s-34.475-.557-34.475 33.32v56.013s-5.235 33.897 62.518 33.897zm34.114-19.586a11.12 11.12 0 0 1-11.13-11.13 11.12 11.12 0 0 1 11.13-11.131 11.12 11.12 0 0 1 11.13 11.13 11.12 11.12 0 0 1-11.13 11.13z"
            fill="#FFD43B"
          />
        </svg>
      </div>
      <p>
        Data sourced from{" "}
        <a
          href="https://github.com/psf/advisory-database"
          rel="noopener noreferrer"
          className="text-python-blue hover:text-python-yellow transition-colors"
        >
          PSF Advisory Database
        </a>
      </p>
      <p className="mt-1">
        Noticed an issue?{" "}
        <a
          href="https://github.com/tomasr8/python-cve"
          rel="noopener noreferrer"
          className="text-python-blue hover:text-python-yellow transition-colors"
        >
          Report it on GitHub!
        </a>
      </p>
    </footer>
  )
}

function AdvisoryList({
  filteredAdvisories,
  searchTerm,
  displayCount,
}: {
  filteredAdvisories: Advisories
  searchTerm: string
  displayCount: number
}) {
  const [expandedCards, setExpandedCards] = useState(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Toggle card expanded/collapsed state
  const toggleCard = (advisoryId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(advisoryId)) {
        newSet.delete(advisoryId)
      } else {
        newSet.add(advisoryId)
      }
      return newSet
    })
  }

  return (
    <div className="space-y-0">
      {filteredAdvisories.length === 0 ? (
        <div className="bg-dark-surface border border-dark-border p-8 rounded text-center">
          <p className="text-dark-text-muted">
            No advisories found matching your criteria.
          </p>
        </div>
      ) : (
        <>
          {filteredAdvisories.slice(0, displayCount).map(advisory => {
            const isExpanded = expandedCards.has(advisory.id)

            return (
              <div
                key={advisory.id}
                className="group bg-dark-surface border border-dark-border first:rounded-t last:rounded-b overflow-hidden hover:border-python-blue transition-colors"
              >
                {/* Advisory Header - Always Visible */}
                <div
                  className="p-4 bg-dark-bg/50 cursor-pointer"
                  onClick={() => toggleCard(advisory.id)}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 md:gap-4 justify-between md:justify-start">
                        <div className="flex items-center gap-2 md:gap-4">
                          <svg
                            className={`w-4 h-4 text-dark-text-muted transition-transform shrink-0 ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                          <h3 className="text-lg font-bold text-python-blue font-mono">
                            <HighlightText
                              text={advisory.id}
                              searchTerm={searchTerm}
                            />
                          </h3>
                        </div>
                        {advisory.severity && (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                              advisory.severity.name.toLowerCase() === "low"
                                ? "bg-accent-blue/10 text-accent-blue border border-accent-blue/30"
                                : advisory.severity.name.toLowerCase() ===
                                  "medium"
                                ? "bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/30"
                                : advisory.severity.name.toLowerCase() ===
                                  "high"
                                ? "bg-accent-red/10 text-accent-red border border-accent-red/30"
                                : "bg-accent-red/20 text-accent-red border-2 border-accent-red/50 font-bold"
                            }`}
                          >
                            <span>{advisory.severity.name}</span>
                            {advisory.severity.score && (
                              <span className="text-xs">
                                ({advisory.severity.score.toFixed(1)})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="hidden md:flex flex-row gap-4 md:flex-row md:gap-4 text-xs text-dark-text-muted md:text-right shrink-0">
                      {advisory.published && (
                        <div>
                          <span className="text-[10px] uppercase tracking-wider">
                            Published:
                          </span>{" "}
                          <span className="font-mono">
                            {new Date(advisory.published).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {advisory.modified && (
                        <div>
                          <span className="text-[10px] uppercase tracking-wider">
                            Modified:
                          </span>{" "}
                          <span className="font-mono">
                            {new Date(advisory.modified).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Same as the above */}
                    {isExpanded && (
                      <div className="md:hidden flex flex-row gap-4 md:flex-col md:gap-1 text-xs text-dark-text-muted md:text-right shrink-0">
                        {advisory.published && (
                          <div>
                            <span className="text-[10px] uppercase tracking-wider">
                              Published:
                            </span>{" "}
                            <span className="font-mono">
                              {new Date(
                                advisory.published
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {advisory.modified && (
                          <div>
                            <span className="text-[10px] uppercase tracking-wider">
                              Modified:
                            </span>{" "}
                            <span className="font-mono">
                              {new Date(advisory.modified).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Advisory Body - Only show when expanded */}
                {isExpanded && (
                  <div className="p-4 border-t border-dark-border">
                    <div className="flex items-center flex-wrap gap-4">
                      {/* CVE */}
                      {advisory.cve && (
                        <div className="text-sm text-dark-text-muted leading-relaxed flex items-center gap-1">
                          <span className="text-xs bg-dark-bg border border-dark-border rounded px-2 py-1 text-dark-text-muted">
                            <HighlightText
                              text={advisory.cve}
                              searchTerm={searchTerm}
                            />
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (advisory.cve) {
                                navigator.clipboard.writeText(advisory.cve)
                                setCopiedId(advisory.cve)
                                setTimeout(() => setCopiedId(null), 2000)
                              }
                            }}
                            className="p-1 rounded hover:bg-dark-border/50 transition-colors group/copy"
                            title="Copy CVE to clipboard"
                          >
                            {copiedId === advisory.cve ? (
                              <svg
                                className="w-4 h-4 text-accent-green"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-4 h-4 text-dark-text-muted group-hover/copy:text-python-blue transition-colors"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      )}
                      {/* Issue link */}
                      {advisory.issue && (
                        <a
                          href={advisory.issue.url}
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-python-blue hover:text-python-yellow underline underline-offset-2 font-semibold transition-colors whitespace-nowrap"
                        >
                          {advisory.issue.type === "github"
                            ? `gh-${advisory.issue.issue_number}`
                            : `bpo-${advisory.issue.issue_number}`}
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                            />
                          </svg>
                        </a>
                      )}
                    </div>
                    {/* Details */}
                    {advisory.details && (
                      <div
                        className={`text-sm text-dark-text-muted mb-4 leading-relaxed ${
                          advisory.cve
                            ? "mt-4 pt-4 border-t border-dark-border"
                            : ""
                        }`}
                      >
                        {advisory.details
                          .split("\n\n")
                          .map((paragraph, idx) => (
                            <p key={idx} className="mb-2 last:mb-0">
                              <HighlightText
                                text={paragraph}
                                searchTerm={searchTerm}
                              />
                            </p>
                          ))}
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-dark-border">
                      <h4 className="text-xs text-dark-text-muted uppercase tracking-wider mb-2">
                        Affects
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {advisory.affected_versions.map((range, idx) => {
                          const start = range[0].join(".")
                          const end = range.at(-1).join(".")
                          const versionText =
                            start === end ? `${start}` : `${start} – ${end}`
                          return (
                            <span
                              key={idx}
                              className="bg-dark-bg border border-accent-red/30 text-accent-red rounded px-3 py-1 text-xs font-mono"
                            >
                              {versionText}
                            </span>
                          )
                        })}
                      </div>
                    </div>

                    {advisory.fixed_in.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-dark-border">
                        <h4 className="text-xs text-dark-text-muted uppercase tracking-wider mb-2">
                          Fixed in
                        </h4>
                        <div className="flex flex-wrap items-center gap-3">
                          {advisory.fixed_in.map(({ version, commit }) => (
                            <div key={commit} className="flex gap-1">
                              <span className="bg-dark-bg border border-accent-green/30 text-accent-green rounded px-3 py-1 text-xs font-mono">
                                {version.join(".")}+
                              </span>
                              <a
                                href={`https://github.com/python/cpython/commit/${commit}`}
                                rel="noopener noreferrer"
                                className="p-1 rounded hover:bg-dark-border/50 transition-colors group/commit"
                                title="View commit on GitHub"
                              >
                                <svg
                                  className="w-4 h-4 text-dark-text-muted group-hover/commit:text-python-blue transition-colors"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {advisory.fixed_but_not_released.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-dark-border">
                        <h4 className="text-xs text-dark-text-muted uppercase tracking-wider mb-2">
                          Fixed but unreleased
                        </h4>
                        <div className="flex flex-wrap items-center gap-3">
                          {advisory.fixed_but_not_released.map(
                            ({ branch, commit }) => (
                              <div key={commit} className="flex gap-1">
                                <span className="bg-dark-bg border border-accent-blue/30 text-accent-blue rounded px-3 py-1 text-xs font-mono">
                                  {branch.join(".")}
                                </span>
                                <a
                                  href={`https://github.com/python/cpython/commit/${commit}`}
                                  rel="noopener noreferrer"
                                  className="p-1 rounded hover:bg-dark-border/50 transition-colors group/commit"
                                  title="View commit on GitHub"
                                >
                                  <svg
                                    className="w-4 h-4 text-dark-text-muted group-hover/commit:text-python-blue transition-colors"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                  </svg>
                                </a>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {advisory.fixes_pending.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-dark-border">
                        <h4 className="text-xs text-dark-text-muted uppercase tracking-wider mb-2">
                          Fixes pending
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {advisory.fixes_pending.map((version, idx) => (
                            <span
                              key={idx}
                              className="bg-dark-bg border border-accent-yellow/30 text-accent-yellow rounded px-3 py-1 text-xs font-mono"
                            >
                              {version.join(".")}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
