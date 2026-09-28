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
- MCP server lives in src/lib/mcp/ (mcp-js + Supabase OAuth, tools use supabaseForUser so RLS applies) — agents act as the signed-in user.
- Cart items and per-product specifications persist through `src/lib/cart.ts` so catalog and checkout share one client-side source of truth.
