# cicd-study

`cicd-study` 是一个基于 `pnpm workspace` 和 `Turborepo` 的 monorepo。

当前应用：

- `apps/web`：Next.js 16 + React 19 + antd + Supabase 的 Web 应用。
- `apps/coin-pusher`：Vite + React + TypeScript + Three.js + Rapier 的 3D 游戏原型。

## Commands

```bash
pnpm dev:web
pnpm build:web
pnpm test:web
pnpm typecheck:web
pnpm lint:web

pnpm dev:coin-pusher
pnpm build:coin-pusher
pnpm test:coin-pusher
pnpm typecheck:coin-pusher
pnpm lint:coin-pusher
```

## Docs

- `docs/web/project-quick-brief.md`
- `docs/web/project-directory-structure.md`
- `docs/coin-pusher/project-quick-brief.md`
- `docs/coin-pusher/project-directory-structure.md`
- `docs/rules/README.md`
