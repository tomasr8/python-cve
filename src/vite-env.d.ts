/// <reference types="vite/client" />

declare module "virtual:combined-advisories" {
  interface Severity {
    name: string
    score: number | null
    version: string
  }

  interface Advisory {
    id: string
    cve: string | null
    published: string
    modified: string
    severity: Severity | null
    details: string
    summary?: string
    introduced_commits: string[]
    fixed_commits: string[]
    affected_versions: number[][][]
    affected_eol_versions: number[][][]
    fixed_versions: number[][]
    fixed_pending_versions: number[][]
  }

  const advisories: Advisory[]
  export default advisories
}

declare module "/src/overview.json" {
  interface Overview {
    last_updated: string
    [key: string]: any
  }

  const overview: Overview
  export default overview
}
