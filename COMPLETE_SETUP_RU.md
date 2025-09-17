### Полная инструкция по запуску и настройке проекта (RU)

Ниже — краткий обзор реализованных возможностей, затем пошаговая настройка окружения, переменных, БД, сториджа, платежей и тестов. В конце — советы по дальнейшим шагам.

---

### Обзор реализованных возможностей
- **Аутентификация и Роли**: email+пароль, OAuth (Google/GitHub), middleware для защиты роутов, роли buyer/seller/partner/admin, rate limiting на auth-эндпоинты.
- **Продукты и Каталог**: CRUD для товаров, загрузка файлов в Supabase Storage, версии, изображения, продвинутый поиск/фильтры, рекомендации.
- **Покупка и Доставка**: создание платежного интента, выдача доступа, безопасные ссылки на скачивание (Supabase Storage signed URLs), лимиты и срок годности ссылок.
- **Платежи**: Stripe + YooKassa + CoinGate (крипто), вебхуки, рефанды, мультивалюта.
- **Рефералы**: генерация кодов/шортлинков, cookie-трекинг 30 дней, клики/конверсии/комиссии, фрод-аналитика.
- **Фоновая обработка**: очереди BullMQ, воркеры, задачи аналитики и обработки файлов.
- **Логи, мониторинг, rate limiting**: интеграции и утилиты, защита от брутфорса.
- **Тесты**: unit, integration (Jest), e2e (Playwright), нагрузочные (k6), security (OWASP ZAP baseline).

См. исходники в `src/app/api/**`, `src/services/**`, `src/middleware/**`, `supabase/migrations/**` и примерные шаблоны в `*_GUIDE.md`, `*_COMPLETE.md`.

---

### 1) Предварительные требования
- Node.js 20+ и npm 10+ (или pnpm/yarn — на ваш выбор)
- Supabase аккаунт (или локально через Supabase CLI)
- Redis (локально через Docker или внешний сервис)
- Stripe аккаунт (Dashboard и Stripe CLI для локальных вебхуков)
- YooKassa мерчант-аккаунт (для РФ платежей)
- CoinGate (или другой криптопровайдер)
- Git, Docker (рекомендуется), Supabase CLI

Полезно: Sentry/Datadog/New Relic (по желанию).

---

### 2) Клонирование и установка
- Склонируйте репозиторий
- Установите зависимости:
```
npm install
```

---

### 3) Переменные окружения
Создайте файл `.env.local` в корне проекта (`/bmf001/`) и заполните минимум для DEV. Полный шаблон — в `env.example`.

Минимальный набор для локальной разработки:
```
# Приложение
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=ВАШ_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=ВАШ_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=ВАШ_SUPABASE_SERVICE_ROLE_KEY

# Redis (локально)
REDIS_HOST=localhost
REDIS_PORT=6379

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=http://localhost:3000/payment/success
STRIPE_CANCEL_URL=http://localhost:3000/payment/cancel

# YooKassa (опционально)
YOOKASSA_SHOP_ID=...
YOOKASSA_SECRET_KEY=...
YOOKASSA_WEBHOOK_SECRET=...
YOOKASSA_SUCCESS_URL=http://localhost:3000/payment/success
YOOKASSA_CANCEL_URL=http://localhost:3000/payment/cancel

# CoinGate (крипто)
COINGATE_API_KEY=...
COINGATE_WEBHOOK_SECRET=...
COINGATE_SUCCESS_URL=http://localhost:3000/payment/success
COINGATE_CANCEL_URL=http://localhost:3000/payment/cancel
```
Где взять значения:
- Supabase: в проекте Supabase — Project settings → API: `Project URL`, `anon public`, `service_role`.
- Stripe: Dashboard → Developers → API keys; `STRIPE_WEBHOOK_SECRET` получите через Stripe CLI: 
  - `stripe listen --forward-to http://localhost:3000/api/webhooks/stripe`
- YooKassa: ЛК мерчанта → `shop_id`, `secret`/вебхук секрет.
- CoinGate: ЛК → API Key и секрет для вебхуков.

Примечания:
- В коде платежей используется CoinGate (`COINGATE_*`). Переменные `CRYPTO_*` из `env.example` оставлены для совместимости и сейчас не используются.
- Для тестов создайте `.env.test` (можно скопировать из `.env.local` и подставить тестовые значения). Файлы `tests/setup/*.ts` подхватывают `.env.test`.

---

### 4) База данных и миграции
Вариант A: удалённый Supabase
```
# Установите Supabase CLI (если нужно)
npm install -g supabase

# Вход в CLI
supabase login

# Привязка проекта (project-ref — часть из NEXT_PUBLIC_SUPABASE_URL)
supabase link --project-ref <project-ref>

# Применить миграции
npm run db:migrate
```
Вариант B: локально через Supabase CLI
```
# Запуск локального стека
supabase start

# URL локального API будет вида http://127.0.0.1:54321
# Подставьте его в .env.local как NEXT_PUBLIC_SUPABASE_URL, а ключи — из Supabase Studio (локального)
```

Индекс/функции, RLS и т.п. уже включены в миграции (`supabase/migrations/**`).

---

### 5) Supabase Storage (файлы продуктов)
- Создайте приватный бакет `product-files` в Supabase Storage.
- Файлы загружаются сервисом продуктов; скачивание осуществляется через подписанные ссылки (signed URL) сроком ~1 час.
- Проверьте RLS/политики, чтобы прямой публичный доступ был закрыт.

---

### 6) Сидинг данных (опционально)
```
# Базовый сидинг
yarn db:seed  # или npm run db:seed

# Очистка и сидинг
npm run db:seed -- --clear

# Только нужные таблицы
npm run db:seed -- --tables users,shops,products
```
Скрипт: `src/scripts/seed-cli.ts`.

---

### 7) Запуск приложения и воркеров
```
# Dev-сервер
npm run dev

# Воркеры (очереди, крон)
npm run workers:start
```

---

### 8) Вебхуки платежей (локально)
- Stripe: 
```
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
# Скопируйте выведенный whsec_* в STRIPE_WEBHOOK_SECRET
```
- YooKassa/CoinGate: настройте URL вебхуков в кабинетах провайдеров, укажите секреты в `.env.local`.

---

### 9) Тестирование
Unit/Integration (Jest):
```
npm run test           # все
npm run test:unit
npm run test:integration
npm run test:coverage
```
Примечание: интеграционные тесты используют моки эндпоинтов и `.env.test`. БД очищается в `tests/setup/integration.setup.ts`.

E2E (Playwright):
```
npm run test:e2e
```
- По умолчанию Playwright поднимает `npm run dev` и тестирует `/tests/e2e`.
- В `playwright.config.ts` указаны `globalSetup/globalTeardown`, но файлов сейчас нет. Либо создайте их, либо уберите строки `globalSetup/globalTeardown` из конфига для быстрого старта.

Нагрузочные (k6):
```
npm run test:load
npm run test:load:stress
```
Security (OWASP ZAP baseline):
```
npm run test:security
```

---

### 10) Частые проблемы и решения
- Stripe API version: в `PaymentService` жёстко задана версия. Рекомендуется удалить `apiVersion` (использовать дефолт Stripe SDK) либо выставить актуальную.
- CoinGate env: используйте `COINGATE_*` переменные (в `env.example` есть универсальные `CRYPTO_*`, они сейчас не применяются кодом).
- Playwright: отсутствуют `tests/e2e/global-setup.ts` и `global-teardown.ts`. Добавьте их или удалите соответствующие опции из конфига.
- Storage: не забывайте создать приватный бакет `product-files`.
- Redis: укажите корректные хост/порт/пароль или поднимите локально: 
  - `docker run -p 6379:6379 redis:7`

---

### 11) Проверка готовности
- `npm run type-check && npm run lint && npm run build`
- `npm run dev` открывается на `http://localhost:3000`
- Создание платежа и обработка вебхуком работают локально (Stripe CLI)
- Скачивание купленного товара возвращает подписанный URL
- Реферальная метка (`?ref=...`) устанавливает cookie и участвует в конверсии

---

### Что дальше (рекомендации)
- UI: собрать основные страницы (Home, Product, Shop, Cart, Auth, Dashboard'ы buyer/seller/partner) с компонентами из `src/components/**`.
- Устранить замечания: Stripe API version, Playwright global setup, унифицировать переменные криптопровайдера.
- Админ-панель: модерировать товары/магазины/рефералов, аудит логов.
- Каталог: пагинация/фасеты/SEO, предпросмотр и страницы категорий/поиска.
- Покупка: UX-флоу, успех/ошибка, повтор оплаты, страница заказов.
- Профили: кабинеты продавца и партнёра с графиками и аналитикой.
- Наблюдаемость: Sentry, алерты, метрики, трассировки.
- Безопасность: CAPTCHA/Turnstile, дополнительные политики RLS, 2FA.
