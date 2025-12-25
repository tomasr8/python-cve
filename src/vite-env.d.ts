/// <reference types="vite/client" />

declare module "virtual:advisories" {
  import { Advisories } from "./types"
  const advisories: Advisories
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
