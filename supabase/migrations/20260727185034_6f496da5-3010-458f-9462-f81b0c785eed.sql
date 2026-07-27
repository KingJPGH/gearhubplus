
REVOKE EXECUTE ON FUNCTION public.is_company_member(uuid,uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_company_admin(uuid,uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.project_company(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.shoot_day_company(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.shares_company(uuid,uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_company() FROM PUBLIC, anon, authenticated;
