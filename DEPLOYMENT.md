# 🚀 Deployment Checklist - Recyklace Asistent

## ✅ Co je hotovo

### 1. Git Repository

- ✅ Inicializován Git repository
- ✅ První commit vytvořen
- ✅ Propojeno s GitHub: `https://github.com/mulleroj/recyklace-asistent.git`
- ✅ Kód nahrán na GitHub (branch `main`)

### 2. Netlify Deployment

- ✅ Projekt nasazen na Netlify
- ✅ Live URL: `https://recyklace.netlify.app`
- ✅ Automatický deployment z GitHub aktivní

### 3. Opravy a optimalizace

- ✅ Odstraněn odkaz na neexistující `/index.css` (opravena console error)
- ✅ Service Worker verze bumped na v6 (force cache refresh)
- ✅ PWA manifest správně nakonfigurován
- ✅ Service Worker aktualizační strategie funguje

---

## 📋 Netlify Konfigurace

### Build Settings

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Environment Variables (Netlify Dashboard)

⚠️ **MUSÍTE NASTAVIT V NETLIFY UI:**

1. Přejděte na: <https://app.netlify.com/sites/recyklace/settings/deploys>
2. Environment variables
3. Přidejte:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** `[váš API klíč z .env.local]`

**Bez tohoto klíče nebude fungovat AI asistent!**

---

## 🔄 Deployment Workflow

### Automatický deployment

Každý `git push` do `main` větve automaticky spustí nový deployment na Netlify.

```bash
# Typický workflow:
git add .
git commit -m "Popis změny"
git push
# Netlify automaticky nasadí za ~1-2 minuty
```

### Manuální trigger

V Netlify dashboard: Deploys → Trigger deploy → Deploy site

---

## 📱 PWA Funkce

### Service Worker

- ✅ Automatické cachování statických assetů
- ✅ Offline funkčnost
- ✅ Push notifikace pro svoz odpadu
- ✅ Automatické čištění staré cache při updatu

### Instalace na zařízení

- **Android Chrome:** Menu → "Nainstalovat aplikaci"
- **iOS Safari:** Sdílet → "Přidat na plochu"

### Reset Service Worker

URL pro reset: `https://recyklace.netlify.app/reset.html`

---

## 🐛 Známé problémy a řešení

### Problém: Bílá obrazovka na mobilu

**Příčina:** Stará verze v Service Worker cache

**Řešení:**

1. Otevřít `https://recyklace.netlify.app/reset.html`
2. Kliknout "Vymazat vše"
3. Odinstalovat a znovu nainstalovat PWA

Více info: viz `MOBILE_RESET.md`

---

## 📊 Monitoring

### Netlify Dashboard

- **Build logs:** <https://app.netlify.com/sites/recyklace/deploys>
- **Analytics:** <https://app.netlify.com/sites/recyklace/analytics>
- **Funkce:** <https://app.netlify.com/sites/recyklace/functions>

### Kontrola webu

- Live URL: <https://recyklace.netlify.app>
- Browser console (F12) → zkontrolovat errory

---

## 🔐 Bezpečnost

### API Klíče

- ❌ **NIKDY** necommitujte `.env.local` do Gitu
- ✅ `.env.local` je v `.gitignore`
- ✅ Používejte Netlify Environment Variables pro production

### Headers

Netlify automaticky přidává security headers:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

---

## 🚀 Další kroky (volitelné)

### Vlastní doména

1. V Netlify dashboard → Domain settings
2. Přidat custom domain
3. Nakonfigurovat DNS záznamy

### Analytics

- Netlify Analytics (placená funkce)
- Nebo integrace s Google Analytics

### Scheduled Functions

Pro automatické notifikace můžete přidat Netlify Background Functions.

---

## 📞 Support

**Dokumentace:**

- Netlify: <https://docs.netlify.com>
- Vite: <https://vitejs.dev>
- React: <https://react.dev>
- Service Workers: <https://web.dev/learn/pwa/service-workers>

**Problémy?**
Otevřete issue na GitHub: <https://github.com/mulleroj/recyklace-asistent/issues>
