<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Package manager

This project uses **pnpm** (since 2026-08-31). The `packageManager` field in `package.json` pins the version; run `corepack enable` once if pnpm isn't on your PATH.

- Install : `pnpm install`
- Dev : `pnpm run dev` (ou `pnpm dev`)
- Build : `pnpm run build`
- Tests unit : `pnpm test`
- Tests e2e : `pnpm run test:e2e`

Ne pas relancer `npm install` : ça régénérerait un `package-lock.json` divergent. Si tu vois un lockfile npm, supprime-le et refais `pnpm install`.
