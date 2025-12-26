/// <reference types="vite/client" />

declare module "virtual:advisories" {
  import { Advisories } from "./types"
  const advisories: Advisories
  export default advisories
}

declare module "virtual:overview" {
  import { Overview } from "./types"
  const overview: Overview
  export default overview
}
