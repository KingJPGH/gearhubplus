ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_offline boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS managed_by uuid;

CREATE OR REPLACE FUNCTION public.manages_profile(_profile uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _profile AND p.is_offline = true AND p.managed_by = _user
  );
$$;
REVOKE ALL ON FUNCTION public.manages_profile(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manages_profile(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "profiles offline managed by admin"
ON public.profiles FOR ALL TO authenticated
USING (is_offline = true AND managed_by = auth.uid())
WITH CHECK (is_offline = true AND managed_by = auth.uid());

CREATE POLICY "equipment offline managed"
ON public.equipment FOR ALL TO authenticated
USING (public.manages_profile(owner_id, auth.uid()))
WITH CHECK (public.manages_profile(owner_id, auth.uid()));

CREATE POLICY "equipment unavailability offline managed"
ON public.equipment_unavailability FOR ALL TO authenticated
USING (public.manages_profile(owner_id, auth.uid()))
WITH CHECK (public.manages_profile(owner_id, auth.uid()));