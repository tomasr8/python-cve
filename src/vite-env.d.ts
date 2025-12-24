/// <reference types="vite/client" />

declare module "virtual:combined-advisories" {
  type Version = [number, number, number]
  type Minor = [number, number]

  interface Issue {
    type: "github" | "bpo"
    issue_number: string
    url: string
  }

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
    issue: Issue | null
    details: string
    summary?: string
    introduced_commits: string[]
    fixed_commits: string[]
    affected_versions: number[][][]
    affected_eol_versions: number[][][]
    fixed_in: { version: Version; commit: string }[]
    fixed_but_not_released: { branch: Version | string; commit: string }[]
    fixes_pending: Minor[]
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
