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
  introduced_commits: z.array(z.string()),
  fixed_commits: z.array(z.string()),
  affected_versions: z.array(
    z.union([z.tuple([VersionSchema]), z.tuple([VersionSchema, VersionSchema])])
  ),
  affected_eol_versions: z.array(
    z.union([z.tuple([VersionSchema]), z.tuple([VersionSchema, VersionSchema])])
  ),
  fixed_in: z.array(
    z.object({
      version: VersionSchema,
      commit: z.string(),
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
