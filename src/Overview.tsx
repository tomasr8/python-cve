import React, { useState } from "react"
import overview from "virtual:overview"
import { formatRelativeTime } from "./util"
import { eolVersions } from "./config"
import { VersionOverview } from "./types"

const { versions } = overview

export default function VersionOverviewRow({ handleViewCVEs }) {
  const [expandedOverviewRows, setExpandedOverviewRows] = useState(new Set())

  // Toggle overview row expanded/collapsed state
  const toggleOverviewRow = (version: string) => {
    setExpandedOverviewRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(version)) {
        newSet.delete(version)
      } else {
        newSet.add(version)
      }
      return newSet
    })
  }

  return (
    <div className="bg-dark-surface border border-dark-border rounded mb-6 overflow-hidden">
      <div className="relative bg-dark-bg/50 px-4 md:px-6 py-4 border-b border-dark-border overflow-hidden">
        <h2 className="text-lg font-bold text-python-blue">Version Overview</h2>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden divide-y divide-dark-border">
        {versions.map((data: VersionOverview) => {
          const { version } = data
          const formattedVersion = version.join(".")
          const isEOL = eolVersions.includes(formattedVersion)
          const isExpanded = expandedOverviewRows.has(formattedVersion)
          const latestVersion = data.latest_patch.version
          const latestStatus = data.latest_patch.status
          const rangesByStatus = data.ranges_by_status

          return (
            <div
              key={formattedVersion}
              className={`${isEOL ? "opacity-75" : ""} ${
                isExpanded ? "bg-dark-bg/20" : ""
              }`}
            >
              {/* Card Header */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => toggleOverviewRow(formattedVersion)}
              >
                {/* Version + Status Row */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
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
                    <div className="flex flex-col">
                      <span className="text-sm font-mono font-semibold text-dark-text">
                        Python {formattedVersion}
                      </span>
                      {/* Latest patch version */}
                      <div className="text-xs text-dark-text-muted">
                        <span className="font-mono">
                          {latestVersion.join(".")}
                        </span>
                      </div>
                    </div>
                    {isEOL && (
                      <span className="bg-dark-text-muted/20 text-dark-text-muted border border-dark-text-muted/30 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase">
                        EOL
                      </span>
                    )}
                  </div>
                  {/* Status Badge - based on latest patch */}
                  {latestStatus === "SAFE" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-accent-green/10 text-accent-green border border-accent-green/30 shrink-0">
                      <svg
                        className="w-3 h-3"
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
                      Safe
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold shrink-0 ${
                        latestStatus === "CRITICAL"
                          ? "bg-accent-red/20 text-accent-red border border-accent-red/30"
                          : latestStatus === "HIGH"
                          ? "bg-accent-red/10 text-accent-red border border-accent-red/30"
                          : latestStatus === "MEDIUM"
                          ? "bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/30"
                          : "bg-accent-blue/10 text-accent-blue border border-accent-blue/30"
                      }`}
                    >
                      {latestStatus}
                    </span>
                  )}
                </div>

                {/* Last Advisory + View CVEs Row */}
                <div className="flex items-center justify-between">
                  {data.last_published && (
                    <span className="text-[11px] text-dark-text-muted">
                      Updated:{" "}
                      {(() => {
                        const formatted = formatRelativeTime(
                          data.last_published
                        )
                        return formatted?.relative || ""
                      })()}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={e => {
                      handleViewCVEs(formattedVersion)
                    }}
                    className="text-xs text-python-blue hover:text-python-blue/80 font-semibold transition-colors whitespace-nowrap"
                  >
                    View CVEs →
                  </button>
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-dark-border/50 bg-dark-bg/10">
                  <div className="text-xs font-semibold text-dark-text-muted uppercase tracking-wider mb-2">
                    Severity Breakdown
                  </div>
                  <div className="space-y-2">
                    {Object.entries(rangesByStatus)
                      .filter(([_, info]) => info.length > 0)
                      .sort((a, b) => {
                        const order = {
                          CRITICAL: 0,
                          HIGH: 1,
                          MEDIUM: 2,
                          LOW: 3,
                          SAFE: 4,
                        }
                        return order[a[0]] - order[b[0]]
                      })
                      .map(([severity, info]) => {
                        if (severity === "SAFE") {
                          return (
                            <div
                              key={severity}
                              className="flex items-center gap-2 text-sm"
                            >
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold min-w-[90px] bg-accent-green/10 text-accent-green border border-accent-green/30">
                                <svg
                                  className="w-2.5 h-2.5"
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
                                SAFE
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {info
                                  .map(range => {
                                    const { start, end } = range
                                    if (end === null) {
                                      return start.join(".")
                                    }

                                    return `${start[0]}.${start[1]}.${start[2]} – ${end[0]}.${end[1]}.${end[2]}`
                                  })
                                  .map(range => (
                                    <span
                                      key={range}
                                      className="bg-dark-bg border border-accent-green/30 rounded px-1.5 py-0.5 text-[11px] font-mono text-accent-green"
                                    >
                                      {range}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )
                        }

                        return (
                          <div
                            key={severity}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold min-w-[90px] ${
                                severity === "CRITICAL"
                                  ? "bg-accent-red/20 text-accent-red border border-accent-red/30"
                                  : severity === "HIGH"
                                  ? "bg-accent-red/10 text-accent-red border border-accent-red/30"
                                  : severity === "MEDIUM"
                                  ? "bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/30"
                                  : "bg-accent-blue/10 text-accent-blue border border-accent-blue/30"
                              }`}
                            >
                              {severity}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {info
                                .map(range => {
                                  const { start, end } = range
                                  if (end === null) {
                                    return start.join(".")
                                  }

                                  return `${start[0]}.${start[1]}.${start[2]} – ${end[0]}.${end[1]}.${end[2]}`
                                })
                                .map(range => (
                                  <span
                                    key={range}
                                    className="bg-dark-bg border border-dark-border rounded px-1.5 py-0.5 text-[11px] font-mono text-dark-text"
                                  >
                                    {range}
                                  </span>
                                ))}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-dark-bg/30 border-b border-dark-border">
              <th className="text-left px-6 py-3 text-xs font-semibold text-dark-text-muted uppercase tracking-wider">
                Version
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-dark-text-muted uppercase tracking-wider">
                Security Summary
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-dark-text-muted uppercase tracking-wider">
                Latest Advisory
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-dark-text-muted uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {versions.map((data: VersionOverview) => {
              const { version } = data
              const formattedVersion = version.join(".")
              const isEOL = eolVersions.includes(formattedVersion)
              const isExpanded = expandedOverviewRows.has(formattedVersion)
              const latestVersion = data.latest_patch.version
              const latestStatus = data.latest_patch.status
              const rangesByStatus = data.ranges_by_status

              return (
                <React.Fragment key={formattedVersion}>
                  <tr
                    className={`border-b border-dark-border hover:bg-dark-bg/30 transition-colors ${
                      isEOL ? "opacity-75" : ""
                    } ${isExpanded ? "bg-dark-bg/20" : ""}`}
                    onClick={() => toggleOverviewRow(formattedVersion)}
                  >
                    <td className="px-6 py-4 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <svg
                          className={`w-4 h-4 text-dark-text-muted transition-transform ${
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
                        <span className="text-sm font-mono font-semibold text-dark-text">
                          Python {formattedVersion}
                        </span>
                        {isEOL && (
                          <span className="bg-dark-text-muted/20 text-dark-text-muted border border-dark-text-muted/30 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            EOL
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 cursor-pointer">
                      <div className="flex flex-col gap-1">
                        {/* Latest patch status */}
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-dark-text min-w-[4.5rem]">
                            {latestVersion.join(".")}
                          </span>
                          {latestStatus === "SAFE" ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-accent-green/10 text-accent-green border border-accent-green/30">
                              <svg
                                className="w-3 h-3"
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
                              Safe
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold ${
                                latestStatus === "CRITICAL"
                                  ? "bg-accent-red/20 text-accent-red border border-accent-red/30"
                                  : latestStatus === "HIGH"
                                  ? "bg-accent-red/10 text-accent-red border border-accent-red/30"
                                  : latestStatus === "MEDIUM"
                                  ? "bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/30"
                                  : "bg-accent-blue/10 text-accent-blue border border-accent-blue/30"
                              }`}
                            >
                              {latestStatus}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 cursor-pointer">
                      {data.last_published && (
                        <div className="text-xs text-dark-text-muted">
                          {(() => {
                            const formatted = formatRelativeTime(
                              data.last_published
                            )
                            return formatted ? (
                              <span title={formatted.full}>
                                {formatted.relative}
                              </span>
                            ) : null
                          })()}
                        </div>
                      )}
                    </td>
                    <td
                      className="px-6 py-4 text-right"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleViewCVEs(formattedVersion)}
                        className="text-xs text-python-blue hover:text-python-yellow transition-colors font-semibold uppercase tracking-wider"
                      >
                        View CVEs →
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Detail Row */}
                  {isExpanded && (
                    <tr className="border-b border-dark-border bg-dark-bg/10">
                      <td colSpan={4} className="px-6 py-4">
                        <div className="ml-7 space-y-3">
                          <div className="text-xs font-semibold text-dark-text-muted uppercase tracking-wider mb-2">
                            Severity Breakdown
                          </div>

                          {/* Severity breakdown */}
                          {Object.entries(rangesByStatus)
                            .filter(([_, info]) => info.length > 0)
                            .sort((a, b) => {
                              const order = {
                                CRITICAL: 0,
                                HIGH: 1,
                                MEDIUM: 2,
                                LOW: 3,
                                SAFE: 4,
                              }
                              return order[a[0]] - order[b[0]]
                            })
                            .map(([severity, info]) => {
                              if (severity === "SAFE") {
                                return (
                                  <div
                                    key={severity}
                                    className="flex items-center gap-3 text-sm"
                                  >
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold min-w-[90px] bg-accent-green/10 text-accent-green border border-accent-green/30">
                                      <svg
                                        className="w-3 h-3"
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
                                      SAFE
                                    </span>
                                    <div className="flex-1">
                                      <div className="flex flex-wrap gap-1.5">
                                        {info
                                          .map(range => {
                                            const { start, end } = range
                                            if (end === null) {
                                              return start.join(".")
                                            }

                                            return `${start[0]}.${start[1]}.${start[2]} – ${end[0]}.${end[1]}.${end[2]}`
                                          })
                                          .map(range => (
                                            <span
                                              key={range}
                                              className="bg-dark-bg border border-accent-green/30 rounded px-2 py-0.5 text-xs font-mono text-accent-green"
                                            >
                                              {range}
                                            </span>
                                          ))}
                                      </div>
                                    </div>
                                  </div>
                                )
                              }

                              return (
                                <div
                                  key={severity}
                                  className="flex items-center gap-3 text-sm"
                                >
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold min-w-[90px] ${
                                      severity === "CRITICAL"
                                        ? "bg-accent-red/20 text-accent-red border border-accent-red/30"
                                        : severity === "HIGH"
                                        ? "bg-accent-red/10 text-accent-red border border-accent-red/30"
                                        : severity === "MEDIUM"
                                        ? "bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/30"
                                        : "bg-accent-blue/10 text-accent-blue border border-accent-blue/30"
                                    }`}
                                  >
                                    {severity}
                                  </span>
                                  <div className="flex-1">
                                    <div className="flex flex-wrap gap-1.5">
                                      {info
                                        .map(range => {
                                          const { start, end } = range
                                          if (end === null) {
                                            return start.join(".")
                                          }

                                          return `${start[0]}.${start[1]}.${start[2]} – ${end[0]}.${end[1]}.${end[2]}`
                                        })
                                        .map(range => (
                                          <span
                                            key={range}
                                            className="bg-dark-bg border border-dark-border rounded px-2 py-0.5 text-xs font-mono text-dark-text"
                                          >
                                            {range}
                                          </span>
                                        ))}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
