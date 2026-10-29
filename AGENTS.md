<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Remembered-login preference stores only an opted-in email under its own key; never mix it with auth session storage or password data.
- Official branding uses CDN asset pointers for uploaded PNGs; favicon sizes are local public PNGs, while 180/192/512/1024px assets prepare future app icons without enabling PWA or TV features.
- Shared app shell (sidebar + header) lives in `src/components/app/AppShell.tsx` and wraps `<Outlet />` in `__root.tsx`; menu entries come from `src/components/app/nav.ts` so nav and routes stay in sync.
- All demo data lives in `src/lib/mock.ts`; pages read only from there so real integrations can replace it in one place.
- AppShell owns DemoProvider around its consuming content and route children; keep context identity in the component-free demo-context module to prevent refresh mismatches. Do not persist demo data or call external services.
- Frontend permission and distribution rules live in demo-rules and are tested independently; they are not a security boundary.
- Use one PlaylistEditor for both demo roles with PlaylistTimeline for single-track horizontal dnd-kit sorting; playlist-timeline supplies shared duration, repetition and sequencing logic for list and preview consistency. Audio settings remain separate from visual assignments.
- All app pages live under `src/routes/_authenticated/` (client-only gate, redirects to `/auth`); `/auth` and `/reset-password` are the only public routes.
- Clients, establishments, devices and plans come from Supabase via `src/lib/api.ts` (browser client, RLS enforced); admin role lives only in `user_roles` and is granted solely through the owner-only `promote_to_admin` SQL function. Other modules still read `src/lib/mock.ts`.
