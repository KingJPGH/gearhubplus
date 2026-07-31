CREATE TYPE public.app_role AS ENUM ('super_admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user, 'super_admin'::public.app_role);
$$;

CREATE POLICY "user_roles select self or super admin" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::public.app_role FROM public.profiles WHERE email = 'jordan_poirier@hotmail.com'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_company_admin(_company uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user)
    OR EXISTS (SELECT 1 FROM public.company_members WHERE company_id = _company AND user_id = _user AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_company_member(_company uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user)
    OR EXISTS (SELECT 1 FROM public.company_members WHERE company_id = _company AND user_id = _user);
$$;

CREATE OR REPLACE FUNCTION public.shares_company(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_a)
    OR EXISTS (
      SELECT 1 FROM public.company_members m1
      JOIN public.company_members m2 ON m1.company_id = m2.company_id
      WHERE m1.user_id = _a AND m2.user_id = _b
    );
$$;

CREATE OR REPLACE FUNCTION public.manages_profile(_profile uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = _profile AND p.is_offline = true AND p.managed_by = _user
    );
$$;

CREATE POLICY "profiles super admin manage" ON public.profiles
FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "companies super admin manage" ON public.companies
FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;