DROP POLICY IF EXISTS "Users can insert own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can update own applications" ON public.applications;

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
