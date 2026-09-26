# AI Seller Studio

AI-студия для продавцов на Etsy, eBay, Vinted и Shopify. Продавец фотографирует товар на iPhone и получает студийное фото на белом фоне, заголовок, описание и теги под нужную площадку.

Полный план MVP (фичи, выбор API, стоимость, порядок работы) лежит в файле проекта `plans/mvp-plan.md`.

## Как устроено

```
iPhone (SwiftUI)                                 Supabase
 ├─ съёмка / галерея                              ├─ Postgres + RLS (profiles, products, product_images, usage_events, waitlist)
 ├─ Vision: вырезать товар (бесплатно, офлайн)    ├─ Storage: bucket product-images/<user_id>/...
 ├─ белый фон 2000×2000 (CoreImage)  ──upload──▶  └─ Edge Functions
 └─ process-product  ─────────────────────────────▶   ├─ process-product: Claude Haiku 4.5 → title/description/tags
                                                       │                    (+ Photoroom AI-сцена по запросу)
Web (Next.js): лендинг + waitlist, позже кабинет       ├─ revenuecat-webhook → profiles.plan (iOS подписки)
                                                       └─ paddle-webhook     → profiles.plan (web подписки)
```

Все ключи AI API живут только в edge functions. Клиенты загружают фото и вызывают `process-product`.

## Структура

| Путь | Что |
|---|---|
| `apps/web` | Next.js 16 (App Router, Tailwind): лендинг с waitlist и тарифами |
| `apps/ios` | SwiftUI, iOS 17+. Xcode-проект генерируется из `project.yml` (XcodeGen) |
| `supabase/migrations` | Схема БД, RLS, storage bucket |
| `supabase/functions` | Edge Functions (Deno/TypeScript) |
| `packages/shared` | Общие типы и zod-схемы: площадки и их лимиты, тарифы, контракт API |
| `packages/prompts` | Промпт для текста листинга + скрипт для проверки качества на своих фото |

`packages/shared` импортируется и в Next.js, и в Deno (по относительному пути), поэтому внутри пакетов импорты пишутся с расширением `.ts`.

## Быстрый старт

Нужно: Node 22, pnpm 10, [Supabase CLI](https://supabase.com/docs/guides/cli), Docker (для локального Supabase), на Mac: Xcode 16 + `brew install xcodegen`.

```bash
pnpm install

# 1. Проверить качество текста на своих фото (без приложения)
ANTHROPIC_API_KEY=sk-... pnpm --filter @studio/prompts try path/to/photo.jpg etsy "handmade, 350ml"

# 2. Локальный Supabase
supabase start                     # поднимет БД и применит миграции
cp supabase/functions/.env.example supabase/functions/.env   # вписать ключи
supabase functions serve

# 3. Web
cp apps/web/.env.example apps/web/.env.local                 # URL и anon key из `supabase status`
pnpm dev:web

# 4. iOS (на Mac)
cp apps/ios/Config/Secrets.example.xcconfig apps/ios/Config/Secrets.xcconfig
cd apps/ios && xcodegen && open ListingStudio.xcodeproj
```

Проверки: `pnpm typecheck && pnpm lint && pnpm test`, для функций `cd supabase/functions && deno check */index.ts`.

## Деплой (когда дойдёт)

- Supabase: `supabase link`, `supabase db push`, `supabase secrets set --env-file supabase/functions/.env`, `supabase functions deploy`. При первом деплое проверить, что функции видят `packages/shared` (импорт за пределами `supabase/`); если нет, перенести общий код в `supabase/functions/_shared`.
- Web: Vercel, root directory `apps/web`.
- Sign in with Apple: включить в Supabase Auth → Providers → Apple, указать bundle id.
- Webhooks: RevenueCat → `/functions/v1/revenuecat-webhook` (Authorization = `REVENUECAT_WEBHOOK_SECRET`), Paddle → `/functions/v1/paddle-webhook`.

## Статус

Каркас. Работает: схема, `process-product`, вебхуки, лендинг с waitlist, iOS-поток «снять → белый фон → листинг». Ещё нет: экран истории, paywall, web-кабинет, удаление аккаунта (обязательно для App Store).
