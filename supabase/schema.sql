-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create resumes table
CREATE TABLE IF NOT EXISTS public.resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create applications table
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  job_description TEXT NOT NULL,
  proposal TEXT NOT NULL,
  tailored_resume TEXT NOT NULL,
  match_score INTEGER NOT NULL DEFAULT 0,
  missing_keywords TEXT[] DEFAULT '{}',
  interview_questions TEXT[] DEFAULT '{}',
  template_pack TEXT,
  job_source_url TEXT,
  job_fetched_at TIMESTAMP WITH TIME ZONE,
  job_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  cover_letter_variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  cover_letter_selected_index INTEGER NOT NULL DEFAULT 0,
  generation_quality JSONB NOT NULL DEFAULT '{}'::jsonb,
  generation_version TEXT NOT NULL DEFAULT 'v2',
  confidence_insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  truth_lock JSONB NOT NULL DEFAULT '[]'::jsonb,
  interview_bridge JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_follow_up_at TIMESTAMP WITH TIME ZONE,
  last_status_changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'applied', 'interview', 'rejected', 'offer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create AI usage metering table
CREATE TABLE IF NOT EXISTS public.ai_generation_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  prompt_chars INTEGER NOT NULL DEFAULT 0,
  response_chars INTEGER NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create product analytics table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS resumes_user_id_idx ON public.resumes(user_id);
CREATE INDEX IF NOT EXISTS applications_user_id_idx ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS applications_resume_id_idx ON public.applications(resume_id);
CREATE INDEX IF NOT EXISTS applications_status_idx ON public.applications(status);
CREATE INDEX IF NOT EXISTS applications_job_source_url_idx ON public.applications(job_source_url);
CREATE INDEX IF NOT EXISTS applications_job_fetched_at_idx ON public.applications(job_fetched_at DESC);
CREATE INDEX IF NOT EXISTS ai_generation_usage_user_id_created_at_idx
  ON public.ai_generation_usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_user_id_created_at_idx
  ON public.analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_event_name_idx
  ON public.analytics_events(event_name);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generation_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create policies for resumes
CREATE POLICY "Users can view own resumes"
  ON public.resumes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resumes"
  ON public.resumes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resumes"
  ON public.resumes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own resumes"
  ON public.resumes FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for applications
CREATE POLICY "Users can view own applications"
  ON public.applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications"
  ON public.applications FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.resumes r
      WHERE r.id = resume_id
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own applications"
  ON public.applications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.resumes r
      WHERE r.id = resume_id
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own applications"
  ON public.applications FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for ai_generation_usage
CREATE POLICY "Users can view own ai usage"
  ON public.ai_generation_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai usage"
  ON public.ai_generation_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policies for analytics_events
CREATE POLICY "Users can view own analytics events"
  ON public.analytics_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Keep profile table in sync with auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER resumes_updated_at
  BEFORE UPDATE ON public.resumes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Observability retention maintenance function.
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
