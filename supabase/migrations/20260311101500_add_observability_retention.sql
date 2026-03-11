-- Observability retention hardening for analytics and AI usage tables
-- Keep analytics events for 180 days and AI usage records for 365 days.

CREATE OR REPLACE FUNCTION public.prune_observability_data()
RETURNS TABLE(table_name TEXT, deleted_rows BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_analytics BIGINT := 0;
  deleted_usage BIGINT := 0;
BEGIN
  DELETE FROM public.analytics_events
  WHERE created_at < NOW() - INTERVAL '180 days';
  GET DIAGNOSTICS deleted_analytics = ROW_COUNT;

  DELETE FROM public.ai_generation_usage
  WHERE created_at < NOW() - INTERVAL '365 days';
  GET DIAGNOSTICS deleted_usage = ROW_COUNT;

  RETURN QUERY
  SELECT 'analytics_events'::TEXT, deleted_analytics
  UNION ALL
  SELECT 'ai_generation_usage'::TEXT, deleted_usage;
END;
$$;

REVOKE ALL ON FUNCTION public.prune_observability_data() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prune_observability_data() FROM anon;
REVOKE ALL ON FUNCTION public.prune_observability_data() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.prune_observability_data() TO service_role;
