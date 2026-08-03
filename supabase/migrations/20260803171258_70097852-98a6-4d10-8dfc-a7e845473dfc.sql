CREATE TYPE public.wrangling_status AS ENUM ('todo','done','na');

CREATE TABLE public.shoot_day_wrangling (
  id uuid primary key default gen_random_uuid(),
  shoot_day_id uuid not null references public.shoot_days(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.wrangling_status not null default 'todo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shoot_day_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shoot_day_wrangling TO authenticated;
GRANT ALL ON public.shoot_day_wrangling TO service_role;
ALTER TABLE public.shoot_day_wrangling ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wrangling select" ON public.shoot_day_wrangling
  FOR SELECT TO authenticated
  USING (public.is_company_member(public.shoot_day_company(shoot_day_id), auth.uid()));

CREATE POLICY "wrangling write" ON public.shoot_day_wrangling
  FOR ALL TO authenticated
  USING (
    public.is_company_admin(public.shoot_day_company(shoot_day_id), auth.uid())
    OR user_id = auth.uid()
  )
  WITH CHECK (
    public.is_company_admin(public.shoot_day_company(shoot_day_id), auth.uid())
    OR user_id = auth.uid()
  );

CREATE TRIGGER shoot_day_wrangling_updated_at
  BEFORE UPDATE ON public.shoot_day_wrangling
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.shoot_day_documents (
  id uuid primary key default gen_random_uuid(),
  shoot_day_id uuid not null references public.shoot_days(id) on delete cascade,
  uploaded_by uuid not null,
  file_path text not null,
  file_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shoot_day_documents TO authenticated;
GRANT ALL ON public.shoot_day_documents TO service_role;
ALTER TABLE public.shoot_day_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "day documents select" ON public.shoot_day_documents
  FOR SELECT TO authenticated
  USING (public.is_company_member(public.shoot_day_company(shoot_day_id), auth.uid()));

CREATE POLICY "day documents insert" ON public.shoot_day_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND public.is_company_member(public.shoot_day_company(shoot_day_id), auth.uid())
  );

CREATE POLICY "day documents delete" ON public.shoot_day_documents
  FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR public.is_company_admin(public.shoot_day_company(shoot_day_id), auth.uid())
  );

CREATE TRIGGER shoot_day_documents_updated_at
  BEFORE UPDATE ON public.shoot_day_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();