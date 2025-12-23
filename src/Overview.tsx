import React, { useState } from "react"
import { overview, last_update } from "/src/overview.json"
import { formatRelativeTime, compressPatchVersions } from "./util"
import { latestPatchVersions, eolVersions } from "./config"

export default function VersionOverview({ handleViewCVEs }) {
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

  // Helper function to group patch versions by severity
  const getVersionBySeverity = severityByPatch => {
    const severityGroups = {
      CRITICAL: [],
      HIGH: [],
      MEDIUM: [],
      LOW: [],
    }

    Object.entries(severityByPatch).forEach(([version, severity]) => {
      const patchNum = parseInt(version.split(".")[2])
      severityGroups[severity.name].push(patchNum)
    })

    // Sort and create ranges for each severity
    const result = {}
    Object.entries(severityGroups).forEach(([severity, patches]) => {
      if (patches.length > 0) {
        patches.sort((a, b) => a - b)
        result[severity] = {
          patches,
          range:
            patches.length === 1
              ? `${patches[0]}`
              : `${patches[0]}-${patches[patches.length - 1]}`,
        }
      }
    })

    return result
  }

  // Helper function to get the status of the latest patch version
  // Returns: { version, isSafe, severity (highest if affected), totalAdvisories }
  const getLatestPatchStatus = (data, latestPatchVersion) => {
    if (!latestPatchVersion) {
      return { version: null, isSafe: false, severity: null }
    }

    const severityByPatch = data.severity_by_patch_version || {}
    const severity = severityByPatch[latestPatchVersion]

    // Check if latest patch is in safe_versions
    const latestParts = latestPatchVersion.split(".").map(n => parseInt(n))
    let isInSafeRange = false

    for (const range of data.safe_versions || []) {
      if (range.length === 1) {
        // Single version
        if (
          range[0][0] === latestParts[0] &&
          range[0][1] === latestParts[1] &&
          range[0][2] === latestParts[2]
        ) {
          isInSafeRange = true
          break
        }
      } else {
        // Range [start, end]
        const start = range[0]
        const end = range[1]
        if (
          latestParts[0] === start[0] &&
          latestParts[1] === start[1] &&
          latestParts[2] >= start[2] &&
          latestParts[2] <= end[2]
        ) {
          isInSafeRange = true
          break
        }
      }
    }

    // If it's in safe range or has no severity entry, it's safe
    const isSafe = isInSafeRange || !severity

    return {
      version: latestPatchVersion,
      isSafe,
      severity: isSafe ? null : severity,
      totalAdvisories: data.total_advisories || 0,
    }
  }

  return (
    <div className="bg-dark-surface border border-dark-border rounded mb-6 overflow-hidden">
      <div className="relative bg-dark-bg/50 px-4 md:px-6 py-4 border-b border-dark-border overflow-hidden">
        <h2 className="text-lg font-bold text-python-blue">Version Overview</h2>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden divide-y divide-dark-border">
        {Object.entries(overview)
          .sort((a, b) => {
            const verA = a[0].split(".").map(n => parseInt(n, 10))
            const verB = b[0].split(".").map(n => parseInt(n, 10))
            return verB - verA
          })
          .map(([version, data]) => {
            const isEOL = eolVersions.includes(version)
            const isExpanded = expandedOverviewRows.has(version)
            const latestPatch = latestPatchVersions.find(v =>
              v.startsWith(version)
            )
            const latestStatus = getLatestPatchStatus(data, latestPatch)
            const versionsBySeverity = getVersionBySeverity(
              data.severity_by_patch_version || {}
            )

            return (
              <div
                key={version}
                className={`${isEOL ? "opacity-75" : ""} ${
                  isExpanded ? "bg-dark-bg/20" : ""
                }`}
              >
                {/* Card Header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => toggleOverviewRow(version)}
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
                          Python {version}
                        </span>
                        {/* Latest patch version */}
                        <div className="text-xs text-dark-text-muted">
                          <span className="font-mono">{latestPatch}</span>
                        </div>
                      </div>
                      {isEOL && (
                        <span className="bg-dark-text-muted/20 text-dark-text-muted border border-dark-text-muted/30 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase">
                          EOL
                        </span>
                      )}
                    </div>
                    {/* Status Badge - based on latest patch */}
                    {latestStatus.isSafe ? (
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
                          latestStatus.severity?.name === "CRITICAL"
                            ? "bg-accent-red/20 text-accent-red border border-accent-red/30"
                            : latestStatus.severity?.name === "HIGH"
                            ? "bg-accent-red/10 text-accent-red border border-accent-red/30"
                            : latestStatus.severity?.name === "MEDIUM"
                            ? "bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/30"
                            : "bg-accent-blue/10 text-accent-blue border border-accent-blue/30"
                        }`}
                      >
                        {latestStatus.severity?.name || "Affected"}
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
                      onClick={e => {
                        e.stopPropagation()
                        handleViewCVEs(version)
                      }}
                      className="text-xs text-python-blue hover:text-python-blue/80 font-semibold transition-colors whitespace-nowrap"
                    >
                      View CVEs →
                    </button>
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && data.is_affected && (
                  <div className="px-4 pb-4 pt-2 border-t border-dark-border/50 bg-dark-bg/10">
                    <div className="text-xs font-semibold text-dark-text-muted uppercase tracking-wider mb-2">
                      Severity Breakdown
                    </div>
                    <div className="space-y-2">
                      {Object.entries(versionsBySeverity)
                        .sort((a, b) => {
                          const order = {
                            CRITICAL: 0,
                            HIGH: 1,
                            MEDIUM: 2,
                            LOW: 3,
                          }
                          return order[a[0]] - order[b[0]]
                        })
                        .map(([severity, info]) => (
                          <div
                            key={severity}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
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
                              {compressPatchVersions(
                                info.patches.map(patch => {
                                  const [major, minor] = version.split(".")
                                  return [
                                    parseInt(major),
                                    parseInt(minor),
                                    patch,
                                  ]
                                })
                              ).map(range => (
                                <span
                                  key={range}
                                  className="bg-dark-bg border border-dark-border rounded px-1.5 py-0.5 text-[11px] font-mono text-dark-text-muted"
                                >
                                  {range}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      {data.safe_versions.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-accent-green/10 text-accent-green border border-accent-green/30">
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
                            {data.safe_versions.map((range, idx) => (
                              <span
                                key={idx}
                                className="bg-dark-bg border border-accent-green/30 rounded px-1.5 py-0.5 text-[11px] font-mono text-accent-green"
                              >
                                {range.length === 1
                                  ? range[0].join(".")
                                  : `${range[0].join(".")}-${range[1].join(
                                      "."
                                    )}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
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
                Last Advisory
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-dark-text-muted uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(overview)
              .sort((a, b) => {
                const verA = a[0].split(".").map(n => parseInt(n, 10))
                const verB = b[0].split(".").map(n => parseInt(n, 10))
                return verB - verA
              })
              .map(([version, data]) => {
                const isEOL = eolVersions.includes(version)
                const isExpanded = expandedOverviewRows.has(version)
                const latestPatch = latestPatchVersions.find(v =>
                  v.startsWith(version)
                )
                const latestStatus = getLatestPatchStatus(data, latestPatch)
                const versionsBySeverity = getVersionBySeverity(
                  data.severity_by_patch_version || {}
                )

                return (
                  <React.Fragment key={version}>
                    <tr
                      className={`border-b border-dark-border hover:bg-dark-bg/30 transition-colors ${
                        isEOL ? "opacity-75" : ""
                      } ${isExpanded ? "bg-dark-bg/20" : ""}`}
                      onClick={() => toggleOverviewRow(version)}
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
                            Python {version}
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
                              {latestPatch}
                            </span>
                            {latestStatus.isSafe ? (
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
                                  latestStatus.severity?.name === "CRITICAL"
                                    ? "bg-accent-red/20 text-accent-red border border-accent-red/30"
                                    : latestStatus.severity?.name === "HIGH"
                                    ? "bg-accent-red/10 text-accent-red border border-accent-red/30"
                                    : latestStatus.severity?.name === "MEDIUM"
                                    ? "bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/30"
                                    : "bg-accent-blue/10 text-accent-blue border border-accent-blue/30"
                                }`}
                              >
                                {latestStatus.severity?.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {data.last_published && (
                          <div className="text-xs text-dark-text-muted">
                            {(() => {
                              const formatted = formatRelativeTime(
                                data.last_published
                              )
                              return formatted ? (
                                <span
                                  className="cursor-help"
                                  title={formatted.full}
                                >
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
                          onClick={() => handleViewCVEs(version)}
                          className="text-xs text-python-blue hover:text-python-yellow transition-colors font-semibold uppercase tracking-wider"
                        >
                          View CVEs →
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {isExpanded && data.is_affected && (
                      <tr className="border-b border-dark-border bg-dark-bg/10">
                        <td colSpan={4} className="px-6 py-4">
                          <div className="ml-7 space-y-3">
                            <div className="text-xs font-semibold text-dark-text-muted uppercase tracking-wider mb-2">
                              Severity Breakdown
                            </div>

                            {/* Severity breakdown */}
                            {Object.entries(versionsBySeverity)
                              .sort((a, b) => {
                                const order = {
                                  CRITICAL: 0,
                                  HIGH: 1,
                                  MEDIUM: 2,
                                  LOW: 3,
                                }
                                return order[a[0]] - order[b[0]]
                              })
                              .map(([severity, info]) => (
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
                                      {compressPatchVersions(
                                        info.patches.map(patch => {
                                          const [major, minor] =
                                            version.split(".")
                                          return [
                                            parseInt(major),
                                            parseInt(minor),
                                            patch,
                                          ]
                                        })
                                      ).map(range => (
                                        <span
                                          key={range}
                                          className="bg-dark-bg border border-dark-border rounded px-2 py-0.5 text-xs font-mono text-dark-text-muted"
                                        >
                                          {range}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ))}

                            {/* Safe versions if any */}
                            {data.safe_versions.length > 0 && (
                              <div className="flex items-center gap-3 text-sm">
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
                                    {data.safe_versions.map((range, idx) => (
                                      <span
                                        key={idx}
                                        className="bg-dark-bg border border-accent-green/30 rounded px-2 py-0.5 text-xs font-mono text-accent-green"
                                      >
                                        {range.length === 1
                                          ? range[0].join(".")
                                          : `${range[0].join(
                                              "."
                                            )}-${range[1].join(".")}`}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
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
