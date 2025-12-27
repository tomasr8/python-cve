import { z } from "zod"

const VersionSchema = z.tuple([z.number(), z.number(), z.number()])
const MinorVersionSchema = z.tuple([z.number(), z.number()])

const IssueSchema = z.object({
  type: z.enum(["github", "bpo"]),
  issue_number: z.string(),
  url: z.url(),
})

const SeveritySchema = z.object({
  name: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  score: z.number().nullable(),
  version: z.enum(["3.1", "4.0"]),
})

const AdvisorySchema = z.object({
  id: z.string(),
  cve: z.string().nullable(),
  published: z.string(),
  modified: z.string(),
  severity: SeveritySchema.nullable(),
  issue: IssueSchema.nullable(),
  details: z.string(),
  affected_versions: z.array(
    z.union([z.tuple([VersionSchema]), z.tuple([VersionSchema, VersionSchema])])
  ),
  fixed_in: z.array(
    z.object({
      version: VersionSchema,
      commits: z.array(z.string()),
    })
  ),
  fixed_but_not_released: z.array(
    z.object({
      branch: MinorVersionSchema,
      commit: z.string(),
    })
  ),
  fixes_pending: z.array(MinorVersionSchema),
})

export const AdvisoriesSchema = z.array(AdvisorySchema)

export type Advisory = z.infer<typeof AdvisorySchema>
export type Advisories = z.infer<typeof AdvisoriesSchema>

export type Version = z.infer<typeof VersionSchema>
export type Minor = z.infer<typeof MinorVersionSchema>

const VersionStatusEnum = z.enum(["SAFE", "LOW", "MEDIUM", "HIGH", "CRITICAL"])
export type VersionStatus = z.infer<typeof VersionStatusEnum>

const VersionRangeSchema = z.object({
  start: VersionSchema,
  end: VersionSchema.nullable(),
})

const VersionOverviewSchema = z.object({
  version: MinorVersionSchema,
  latest_patch: z.object({
    version: VersionSchema,
    status: VersionStatusEnum,
  }),
  is_affected: z.boolean(),
  total_advisories: z.number(),
  last_published: z.string(),
  ranges_by_status: z.object({
    SAFE: z.array(VersionRangeSchema),
    LOW: z.array(VersionRangeSchema),
    MEDIUM: z.array(VersionRangeSchema),
    HIGH: z.array(VersionRangeSchema),
    CRITICAL: z.array(VersionRangeSchema),
  }),
})

export const OverviewSchema = z.object({
  last_updated: z.string(),
  versions: z.array(VersionOverviewSchema),
})

export type VersionOverview = z.infer<typeof VersionOverviewSchema>
export type Overview = z.infer<typeof OverviewSchema>
