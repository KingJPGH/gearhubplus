import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIsSuperAdmin() {
  const query = useQuery({
    queryKey: ["is-super-admin"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return false;
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: auth.user.id,
        _role: "super_admin",
      });
      if (error) throw error;
      return Boolean(data);
    },
    staleTime: 5 * 60 * 1000,
  });
  return query.data === true;
}
