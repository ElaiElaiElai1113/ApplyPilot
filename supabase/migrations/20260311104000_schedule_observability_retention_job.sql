-- Schedule daily retention pruning when pg_cron is available.
-- This block is safe on projects without pg_cron; it will no-op.

DO $$
DECLARE
  existing_job_id BIGINT;
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION
    WHEN OTHERS THEN
      -- Extension may be unavailable in some environments; skip scheduling.
      RETURN;
  END;

  SELECT jobid
  INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'applypilot_prune_observability'
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'applypilot_prune_observability',
    '15 3 * * *',
    $$select * from public.prune_observability_data();$$
  );
END;
$$;
