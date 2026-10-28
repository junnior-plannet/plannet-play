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
- Shared app shell (sidebar + header) lives in `src/components/app/AppShell.tsx` and wraps `<Outlet />` in `__root.tsx`; menu entries come from `src/components/app/nav.ts` so nav and routes stay in sync.
- All demo data lives in `src/lib/mock.ts`; pages read only from there so real integrations can replace it in one place.
- V2 modules share in-memory session state through DemoProvider; do not persist demo data or call external services.
- Frontend permission and distribution rules live in demo-rules and are tested independently; they are not a security boundary.
- Use one PlaylistEditor for both demo roles and dnd-kit for accessible sequence sorting; audio settings remain separate from visual assignments.
