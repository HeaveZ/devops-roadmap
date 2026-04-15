# Frontend (Taskly)

DevOps Roadmap (Taskly) frontend uygulaması — React 19 + TypeScript + TanStack Query + React Router v6 + Tailwind CSS.

Backend mikroservislerine (`auth-server`, `task-manager`) nginx reverse proxy üzerinden erişir.

## Teknoloji Yığını

| Katman               | Teknoloji                                  |
| -------------------- | ------------------------------------------ |
| Framework            | React 19 (Create React App + TypeScript 5) |
| Routing              | React Router v6 (`createBrowserRouter`)    |
| Server state         | TanStack Query v5                          |
| HTTP                 | Axios (interceptor + 401 handler)          |
| Auth state           | React Context (`AuthProvider`)             |
| UI/Styling           | Tailwind CSS v3 (custom theme tokens)      |
| Static serve (prod)  | nginx (SPA fallback ile)                   |

## Komutlar

```bash
npm install        # Bağımlılıkları kur
npm start          # Dev sunucusu (http://localhost:3000)
npm run build      # Production build → build/
npx tsc --noEmit   # Tip kontrolü
```

`REACT_APP_API_URL` boş bırakılırsa same-origin (`/api`, `/auth`) varsayılır — Docker / nginx senaryosu için budur.

## Klasör Mimarisi

```
src/
├── main.tsx, App.tsx           # Mount + provider/router compose
├── app/                        # Uygulama kabuğu (router, providers, layout)
│   ├── providers/              # QueryProvider, AppProviders
│   ├── router/                 # AppRouter, ProtectedRoute, GuestRoute, routes.ts
│   └── layout/                 # AppLayout, Header, UserMenu, Footer
├── pages/                      # Route-level (ince) sayfalar
├── features/                   # Self-contained feature modülleri
│   ├── auth/                   # api, hooks, context, components
│   ├── tasks/                  # api, hooks, components, utils, types
│   ├── files/                  # api, hooks, components
│   ├── profile/                # api, hooks, components
│   ├── dashboard/              # components, utils (stats hesaplamaları)
│   └── analytics/              # guest tracking
├── shared/                     # Cross-cutting
│   ├── api/                    # axios client + interceptor + endpoints
│   ├── ui/                     # Design system primitives (Button, Modal, …)
│   ├── hooks/                  # useDebounce, useLocalStorage, …
│   ├── lib/                    # Saf yardımcılar (date, cn)
│   └── config/                 # env okuma
└── styles/index.css            # Tailwind directives + minimum global
```

### Mimari kuralları

- **Feature sınırı**: `features/<x>` başka feature'a `import` etmez. Cross-feature paylaşım `shared/` üzerinden.
- **Server vs UI state**: Tüm API çağrıları `useQuery` / `useMutation`. Cache key'leri feature başına standart (`['tasks']`, `['files']`, `['auth','me']`).
- **Axios interceptor**: Request bearer token ekler, response 401 → `AuthContext.logout()` → otomatik `/login`.
- **Optimistic update**: Task/subtask/comment toggle ve delete'leri optimistic; hata olursa rollback.
- **Tip güvenliği**: TS strict mode. API contract'leri her feature'ın `types.ts` dosyasında.

## Routes

| Path             | Sayfa             | Auth         |
| ---------------- | ----------------- | ------------ |
| `/`              | → `/tasks`        | -            |
| `/tasks`         | TasksPage         | Public (R/O) |
| `/files`         | FilesPage         | Protected    |
| `/dashboard`     | DashboardPage     | Public       |
| `/profile`       | ProfilePage       | Protected    |
| `/login`         | LoginPage         | Guest only   |
| `/register`      | RegisterPage      | Guest only   |
| `/verify-code`   | VerifyCodePage    | Guest only   |

## Docker

`Dockerfile` iki aşamalı: Node 18 build → nginx:alpine serve. `nginx.conf` SPA fallback (`try_files $uri /index.html`) içerir; React Router refresh sorununu engeller.

```bash
docker compose up --build
```

Frontend → http://localhost (üst seviye `nginx/` reverse proxy üzerinden).
