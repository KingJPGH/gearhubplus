ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 999);

ALTER TABLE public.shoot_day_equipment ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 999);

CREATE TABLE IF NOT EXISTS public.equipment_unavailability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  unavailable_on date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (equipment_id, unavailable_on)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_unavailability TO authenticated;
GRANT ALL ON public.equipment_unavailability TO service_role;

ALTER TABLE public.equipment_unavailability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipment unavailability owner manage"
ON public.equipment_unavailability FOR ALL TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "equipment unavailability visible to company peers"
ON public.equipment_unavailability FOR SELECT TO authenticated
USING (public.shares_company(auth.uid(), owner_id));

CREATE INDEX IF NOT EXISTS equipment_unavailability_equipment_idx ON public.equipment_unavailability (equipment_id, unavailable_on);