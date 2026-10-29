import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Me = {
  userId: string;
  email: string;
  fullName: string;
  isAdmin: boolean;
  clientIds: string[];
};

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async (): Promise<Me | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const [roles, profile, members] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("profiles").select("full_name,email").eq("id", user.id).maybeSingle(),
      supabase.from("client_members").select("client_id").eq("user_id", user.id),
    ]);
    if (roles.error) throw roles.error;
    return {
      userId: user.id,
      email: user.email ?? "",
      fullName: profile.data?.full_name || user.email || "Usuário",
      isAdmin: (roles.data ?? []).some((r) => r.role === "admin"),
      clientIds: (members.data ?? []).map((m) => m.client_id),
    };
  },
  staleTime: 60_000,
});

export function useMe() {
  return useQuery(meQuery);
}
