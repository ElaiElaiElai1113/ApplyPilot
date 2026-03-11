ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS job_source_url TEXT,
  ADD COLUMN IF NOT EXISTS job_fetched_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS job_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS cover_letter_variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cover_letter_selected_index INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS generation_quality JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS generation_version TEXT NOT NULL DEFAULT 'v2';

CREATE INDEX IF NOT EXISTS applications_job_source_url_idx
  ON public.applications(job_source_url);

CREATE INDEX IF NOT EXISTS applications_job_fetched_at_idx
  ON public.applications(job_fetched_at DESC);
