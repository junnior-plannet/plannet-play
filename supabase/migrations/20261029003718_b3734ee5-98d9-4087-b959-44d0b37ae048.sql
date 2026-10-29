revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.is_client_member(uuid, uuid) from public, anon;
revoke execute on function public.establishment_client(uuid) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_client_member(uuid, uuid) to authenticated;
grant execute on function public.establishment_client(uuid) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_client_admin_fields() from public, anon, authenticated;
revoke execute on function public.promote_to_admin(text) from public, anon, authenticated;