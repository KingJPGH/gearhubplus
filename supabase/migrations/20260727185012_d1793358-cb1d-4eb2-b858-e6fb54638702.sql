
-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  role_title text,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TYPE public.company_role AS ENUM ('admin','member');

CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.company_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_members TO authenticated;
GRANT ALL ON public.company_members TO service_role;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  category text,
  serial_number text,
  is_available boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment TO authenticated;
GRANT ALL ON public.equipment TO service_role;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.shoot_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  shoot_date date NOT NULL,
  title text,
  location text,
  call_time text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shoot_days TO authenticated;
GRANT ALL ON public.shoot_days TO service_role;
ALTER TABLE public.shoot_days ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.shoot_day_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shoot_day_id uuid NOT NULL REFERENCES public.shoot_days(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shoot_day_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shoot_day_members TO authenticated;
GRANT ALL ON public.shoot_day_members TO service_role;
ALTER TABLE public.shoot_day_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.shoot_day_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shoot_day_id uuid NOT NULL REFERENCES public.shoot_days(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shoot_day_id, equipment_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shoot_day_equipment TO authenticated;
GRANT ALL ON public.shoot_day_equipment TO service_role;
ALTER TABLE public.shoot_day_equipment ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.shoot_day_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shoot_day_id uuid NOT NULL REFERENCES public.shoot_days(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  label text NOT NULL,
  details text,
  is_resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shoot_day_requests TO authenticated;
GRANT ALL ON public.shoot_day_requests TO service_role;
ALTER TABLE public.shoot_day_requests ENABLE ROW LEVEL SECURITY;

-- helper functions
CREATE OR REPLACE FUNCTION public.is_company_member(_company uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_members WHERE company_id = _company AND user_id = _user);
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_company uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_members WHERE company_id = _company AND user_id = _user AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.project_company(_project uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.projects WHERE id = _project;
$$;

CREATE OR REPLACE FUNCTION public.shoot_day_company(_day uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.company_id FROM public.shoot_days d JOIN public.projects p ON p.id = d.project_id WHERE d.id = _day;
$$;

CREATE OR REPLACE FUNCTION public.shares_company(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members m1
    JOIN public.company_members m2 ON m1.company_id = m2.company_id
    WHERE m1.user_id = _a AND m2.user_id = _b
  );
$$;

-- profiles policies
CREATE POLICY "profiles self manage" ON public.profiles FOR ALL TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles visible to company peers" ON public.profiles FOR SELECT TO authenticated
  USING (public.shares_company(auth.uid(), id));

-- companies
CREATE POLICY "companies select members" ON public.companies FOR SELECT TO authenticated
  USING (public.is_company_member(id, auth.uid()));
CREATE POLICY "companies insert" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "companies update admin" ON public.companies FOR UPDATE TO authenticated
  USING (public.is_company_admin(id, auth.uid())) WITH CHECK (public.is_company_admin(id, auth.uid()));
CREATE POLICY "companies delete admin" ON public.companies FOR DELETE TO authenticated
  USING (public.is_company_admin(id, auth.uid()));

-- company members
CREATE POLICY "company_members select" ON public.company_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_company_member(company_id, auth.uid()));
CREATE POLICY "company_members insert" ON public.company_members FOR INSERT TO authenticated
  WITH CHECK (public.is_company_admin(company_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.created_by = auth.uid()));
CREATE POLICY "company_members update admin" ON public.company_members FOR UPDATE TO authenticated
  USING (public.is_company_admin(company_id, auth.uid())) WITH CHECK (public.is_company_admin(company_id, auth.uid()));
CREATE POLICY "company_members delete admin" ON public.company_members FOR DELETE TO authenticated
  USING (public.is_company_admin(company_id, auth.uid()));

-- projects
CREATE POLICY "projects select" ON public.projects FOR SELECT TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY "projects write admin" ON public.projects FOR ALL TO authenticated
  USING (public.is_company_admin(company_id, auth.uid())) WITH CHECK (public.is_company_admin(company_id, auth.uid()));

-- project members
CREATE POLICY "project_members select" ON public.project_members FOR SELECT TO authenticated
  USING (public.is_company_member(public.project_company(project_id), auth.uid()));
CREATE POLICY "project_members write admin" ON public.project_members FOR ALL TO authenticated
  USING (public.is_company_admin(public.project_company(project_id), auth.uid()))
  WITH CHECK (public.is_company_admin(public.project_company(project_id), auth.uid()));

-- equipment
CREATE POLICY "equipment owner manage" ON public.equipment FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "equipment visible to company peers" ON public.equipment FOR SELECT TO authenticated
  USING (public.shares_company(auth.uid(), owner_id));

-- shoot days
CREATE POLICY "shoot_days select" ON public.shoot_days FOR SELECT TO authenticated
  USING (public.is_company_member(public.project_company(project_id), auth.uid()));
CREATE POLICY "shoot_days write admin" ON public.shoot_days FOR ALL TO authenticated
  USING (public.is_company_admin(public.project_company(project_id), auth.uid()))
  WITH CHECK (public.is_company_admin(public.project_company(project_id), auth.uid()));

-- shoot day members
CREATE POLICY "shoot_day_members select" ON public.shoot_day_members FOR SELECT TO authenticated
  USING (public.is_company_member(public.shoot_day_company(shoot_day_id), auth.uid()));
CREATE POLICY "shoot_day_members write admin" ON public.shoot_day_members FOR ALL TO authenticated
  USING (public.is_company_admin(public.shoot_day_company(shoot_day_id), auth.uid()))
  WITH CHECK (public.is_company_admin(public.shoot_day_company(shoot_day_id), auth.uid()));

-- shoot day equipment
CREATE POLICY "shoot_day_equipment select" ON public.shoot_day_equipment FOR SELECT TO authenticated
  USING (public.is_company_member(public.shoot_day_company(shoot_day_id), auth.uid()));
CREATE POLICY "shoot_day_equipment write admin" ON public.shoot_day_equipment FOR ALL TO authenticated
  USING (public.is_company_admin(public.shoot_day_company(shoot_day_id), auth.uid()))
  WITH CHECK (
    public.is_company_admin(public.shoot_day_company(shoot_day_id), auth.uid())
    AND EXISTS (SELECT 1 FROM public.equipment e WHERE e.id = equipment_id AND e.is_available = true AND e.owner_id = owner_id)
  );

-- shoot day requests
CREATE POLICY "shoot_day_requests select" ON public.shoot_day_requests FOR SELECT TO authenticated
  USING (public.is_company_member(public.shoot_day_company(shoot_day_id), auth.uid()));
CREATE POLICY "shoot_day_requests insert" ON public.shoot_day_requests FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.is_company_member(public.shoot_day_company(shoot_day_id), auth.uid()));
CREATE POLICY "shoot_day_requests update" ON public.shoot_day_requests FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_company_admin(public.shoot_day_company(shoot_day_id), auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.is_company_admin(public.shoot_day_company(shoot_day_id), auth.uid()));
CREATE POLICY "shoot_day_requests delete" ON public.shoot_day_requests FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_company_admin(public.shoot_day_company(shoot_day_id), auth.uid()));

-- auto profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- creator becomes admin of the company
CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_company_created
AFTER INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.handle_new_company();
