ALTER TABLE public.shoot_days ADD COLUMN IF NOT EXISTS range_id uuid;
ALTER TABLE public.shoot_days ADD COLUMN IF NOT EXISTS debrief text;

CREATE TABLE public.day_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.day_templates TO authenticated;
GRANT ALL ON public.day_templates TO service_role;
ALTER TABLE public.day_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "day_templates owner manage" ON public.day_templates
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "day_templates super admin" ON public.day_templates
  FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "day_templates visible to company peers" ON public.day_templates
  FOR SELECT TO authenticated USING (public.shares_company(auth.uid(), owner_id));

CREATE TRIGGER day_templates_updated_at BEFORE UPDATE ON public.day_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.day_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.day_templates(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, equipment_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.day_template_items TO authenticated;
GRANT ALL ON public.day_template_items TO service_role;
ALTER TABLE public.day_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "day_template_items manage via template" ON public.day_template_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.day_templates t WHERE t.id = template_id AND (t.owner_id = auth.uid() OR public.is_super_admin(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.day_templates t WHERE t.id = template_id AND (t.owner_id = auth.uid() OR public.is_super_admin(auth.uid()))));
CREATE POLICY "day_template_items visible to company peers" ON public.day_template_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.day_templates t WHERE t.id = template_id AND public.shares_company(auth.uid(), t.owner_id)));
