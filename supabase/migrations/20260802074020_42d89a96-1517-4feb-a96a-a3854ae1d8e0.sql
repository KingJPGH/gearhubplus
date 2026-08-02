CREATE TABLE public.kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kits TO authenticated;
GRANT ALL ON public.kits TO service_role;
ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kits owner manage" ON public.kits FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "kits offline managed" ON public.kits FOR ALL TO authenticated
  USING (public.manages_profile(owner_id, auth.uid())) WITH CHECK (public.manages_profile(owner_id, auth.uid()));
CREATE POLICY "kits visible to company peers" ON public.kits FOR SELECT TO authenticated
  USING (public.shares_company(auth.uid(), owner_id));

CREATE TABLE public.kit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.kits(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kit_id, equipment_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kit_items TO authenticated;
GRANT ALL ON public.kit_items TO service_role;
ALTER TABLE public.kit_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kit items owner manage" ON public.kit_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kits k WHERE k.id = kit_id AND (k.owner_id = auth.uid() OR public.manages_profile(k.owner_id, auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.kits k WHERE k.id = kit_id AND (k.owner_id = auth.uid() OR public.manages_profile(k.owner_id, auth.uid()))));
CREATE POLICY "kit items visible to company peers" ON public.kit_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kits k WHERE k.id = kit_id AND public.shares_company(auth.uid(), k.owner_id)));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_kits_updated_at BEFORE UPDATE ON public.kits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();