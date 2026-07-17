# Local and preview consistency

## Baseline

- Branch: `feat/electric-tender-entry`
- Starting commit: `c54b917f00c74b51ccaa3f5af5804e97c61ff0b7`
- Working tree: clean except for the pre-existing untracked `postman/` directory, which is outside this phase and must remain untouched.
- Lockfile: `package-lock.json`, SHA-256 `BA16E04FAB2F85D53EA24BFF04AFF247620EFB75EE005FFC5A0ED7AB1857FAF7` at audit time.
- Framework: Next.js 16.2.9, React 19.2.7, App Router, Tailwind 3.4.
- `.next` contained both production and development output and measured approximately 1.2 GB before the clean-restart QA gate.

## Why Codex preview and localhost can differ

1. **Different working tree:** a preview can run a task worktree or committed snapshot while localhost is attached to another checkout.
2. **Uncommitted files:** a preview may include edits that have not been committed or picked up by a separate dev process.
3. **Stale `.next` output:** development and production artifacts can coexist; a server already holding the dev lock can serve an older module graph.
4. **Outdated dependencies:** a stale `node_modules` tree or lockfile mismatch can produce different PDF.js, Motion or Next behavior.
5. **Browser cache:** old JavaScript chunks, a previously installed service worker, or a normal browser cache can retain an older UI.
6. **Viewport differences:** Codex screenshots use controlled viewports; a local browser loses usable height to tabs, bookmarks, zoom and operating-system chrome.
7. **Authenticated session differences:** TenderMate auth is currently restored from local browser storage, so preview and local Chrome can render different auth states and user/credit values.
8. **Local file lifecycle:** a selected `File` and its object URL exist only in the current document session. Refreshing intentionally clears the selection.

## Consistency controls for this phase

- Read locale from the server-visible `tm_locale` cookie before rendering the route shell.
- Keep local file selection in React memory only; never serialize a PDF.
- Register the service worker only in production and version its public static cache.
- Never cache API requests, authenticated HTML, PDFs, signed URLs or private analysis in Cache Storage.
- Use a user-scoped in-memory SWR cache and clear private keys on logout.
- QA a clean restart after stopping the dev server and deleting only the verified `E:\TenderMate-AI\.next` directory.

## Environment notes

The root `.env` currently contains backend-style secret keys as well as runtime configuration. Next.js exposes only `NEXT_PUBLIC_*` variables to client bundles, but secrets should remain backend-only in future environment cleanup. This phase does not move, print or expose their values.
