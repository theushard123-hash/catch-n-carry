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
- Cigam ERP integration: server-only client in src/lib/cigam.server.ts, admin-gated server fns in src/lib/cigam.functions.ts — keeps ERP credentials out of the browser.
- Storefront products use a bounded database RPC projection; catalog popularity returns authenticated-only ranks from invoiced orders, never private order data or wholesale prices to visitors.
- Catalog filter/sort logic is isolated in a browser-safe pure module; shared product skeletons match the catalog grid to avoid layout shifts.
- Password policy and auth error translations live in a browser-safe shared module; password fields use PasswordInput to keep visibility controls consistent across signup, login and password changes.
