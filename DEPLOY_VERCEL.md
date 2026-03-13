# Shelf Recon: Deploy su Vercel (step-by-step)

Questa app e' una Shopify Embedded App (Remix). Su Vercel funziona bene, ma servono:
1) env vars corrette su Vercel
2) App URL + redirect URLs aggiornati nel Partner Dashboard di Shopify

## 1) Vercel: Environment Variables

Vercel Dashboard -> Project -> Settings -> Environment Variables.
Imposta queste variabili in **Production** (e anche **Preview** se usi preview deploy):

- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SHOPIFY_APP_URL` = `https://<YOUR_VERCEL_DOMAIN>`
- `SHOPIFY_SCOPES` = `read_products,write_products,read_inventory,read_content,write_content`
- `DATABASE_URL` = Neon **pooled** connection string (pooler)
- `DIRECT_URL` = Neon **non-pooled** connection string (direct)

Opzionale (consigliato in dev):
- `SHOPIFY_BILLING_TEST` = `true`

Poi: Deployments -> seleziona l'ultimo deploy -> Redeploy.

## 2) Shopify Partner Dashboard: App setup

Shopify Partner Dashboard -> Apps -> Shelf Recon -> App setup:

- App URL: `https://<YOUR_VERCEL_DOMAIN>`
- Allowed redirection URL(s):
  - `https://<YOUR_VERCEL_DOMAIN>/auth/callback`
  - `https://<YOUR_VERCEL_DOMAIN>/auth/shopify/callback`
  - `https://<YOUR_VERCEL_DOMAIN>/api/auth/callback`

## 3) Se Vercel mostra "Application Error"

Quasi sempre e' una di queste:
- manca una env var (vedi elenco sopra)
- `SHOPIFY_APP_URL` non combacia con l'URL vero del deploy
- `DATABASE_URL` errata (o DB non raggiungibile)
- Deployment Protection attiva su Vercel (Shopify iframe non puo' aprire la pagina)

Controlla i log:
Vercel Dashboard -> Project -> Deployments -> (seleziona) -> Functions -> Logs.

