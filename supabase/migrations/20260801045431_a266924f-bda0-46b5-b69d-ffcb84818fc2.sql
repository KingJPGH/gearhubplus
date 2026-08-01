CREATE TABLE public.member_unavailability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  unavailable_on date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, unavailable_on)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_unavailability TO authenticated;
GRANT ALL ON public.member_unavailability TO service_role;

ALTER TABLE public.member_unavailability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member unavailability self manage" ON public.member_unavailability
  FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "member unavailability managed" ON public.member_unavailability
  FOR ALL TO authenticated
  USING (public.manages_profile(profile_id, auth.uid()))
  WITH CHECK (public.manages_profile(profile_id, auth.uid()));

CREATE POLICY "member unavailability visible to peers" ON public.member_unavailability
  FOR SELECT TO authenticated
  USING (public.shares_company(auth.uid(), profile_id));

-- Prevent the same equipment from being booked on two shoot days sharing a date
CREATE OR REPLACE FUNCTION public.prevent_equipment_double_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _date date;
  _conflict text;
BEGIN
  SELECT shoot_date INTO _date FROM public.shoot_days WHERE id = NEW.shoot_day_id;

  SELECT p.name INTO _conflict
  FROM public.shoot_day_equipment sde
  JOIN public.shoot_days d ON d.id = sde.shoot_day_id
  JOIN public.projects p ON p.id = d.project_id
  WHERE sde.equipment_id = NEW.equipment_id
    AND sde.shoot_day_id <> NEW.shoot_day_id
    AND d.shoot_date = _date
  LIMIT 1;

  IF _conflict IS NOT NULL THEN
    RAISE EXCEPTION 'Cet équipement est déjà réservé le % par le projet %', _date, _conflict;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER shoot_day_equipment_no_double_booking
  BEFORE INSERT OR UPDATE ON public.shoot_day_equipment
  FOR EACH ROW EXECUTE FUNCTION public.prevent_equipment_double_booking();

-- Conflicts visible across companies, exposing only project/day names
CREATE OR REPLACE FUNCTION public.equipment_conflicts_on(_date date, _ids uuid[])
RETURNS TABLE (equipment_id uuid, shoot_day_id uuid, project_name text, day_title text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sde.equipment_id, sde.shoot_day_id, p.name, d.title
  FROM public.shoot_day_equipment sde
  JOIN public.shoot_days d ON d.id = sde.shoot_day_id
  JOIN public.projects p ON p.id = d.project_id
  WHERE d.shoot_date = _date
    AND sde.equipment_id = ANY(_ids);
$$;

REVOKE ALL ON FUNCTION public.equipment_conflicts_on(date, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.equipment_conflicts_on(date, uuid[]) TO authenticated;