CREATE POLICY "shoot day docs read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'shoot-day-docs'
    AND EXISTS (
      SELECT 1 FROM public.shoot_day_documents d
      WHERE d.file_path = storage.objects.name
        AND public.is_company_member(public.shoot_day_company(d.shoot_day_id), auth.uid())
    )
  );

CREATE POLICY "shoot day docs upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'shoot-day-docs' AND owner = auth.uid());

CREATE POLICY "shoot day docs delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'shoot-day-docs'
    AND (
      owner = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.shoot_day_documents d
        WHERE d.file_path = storage.objects.name
          AND public.is_company_admin(public.shoot_day_company(d.shoot_day_id), auth.uid())
      )
    )
  );