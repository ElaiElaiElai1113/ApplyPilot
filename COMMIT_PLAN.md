# Commit Plan

## Goal
Commit and push all current workspace changes in one batch so development can continue from another machine.

## Included scope
- Phase 1 core fixes (build stability, client/server boundary fixes, generate flow and dashboard totals)
- CI gate workflow
- Health endpoint
- Supabase RLS hardening + migration
- Handoff notes
- Existing workspace edits requested to be included in the same commit

## File groups
1. Core app flow and build fixes
- `src/app/(app)/generate/page.tsx`
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/tracker/page.tsx`
- `src/app/(app)/layout.tsx`
- `src/lib/auth.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/queries.ts`
- `src/lib/supabase/client-queries.ts`
- `tsconfig.json`
- `package.json`
- `package-lock.json`

2. DevEx and operations
- `.github/workflows/ci.yml`
- `src/app/api/health/route.ts`

3. Database hardening
- `supabase/schema.sql`
- `supabase/migrations/20260309100000_harden_applications_resume_ownership.sql`

4. Handoff docs
- `REMAINING_FILES_HANDOFF.md`
- `COMMIT_PLAN.md`

5. Pre-existing workspace changes included per request
- `.eslintrc.json`
- `src/app/(app)/resumes/page.tsx`
- `src/components/providers/theme-provider.tsx`
- `supabase/.temp/`

## Commit message
`feat: phase1 production hardening, ci baseline, and db policy safeguards`
