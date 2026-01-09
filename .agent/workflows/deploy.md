---
description: Nasazení změn na Netlify (recyklace.netlify.app)
---

# 🚀 Workflow: Nasazení změn na Netlify

Tento workflow popisuje, jak nasadit změny do produkce na <https://recyklace.netlify.app>

## 📋 Předpoklady

- Změny jsou hotové a otestované lokálně (`npm run dev`)
- Jste v kořenovém adresáři projektu

## 🔄 Kroky nasazení

// turbo

1. Zkontrolujte stav Gitu a zjistěte, co se změnilo:

```bash
git status
```

// turbo
2. Přidejte všechny změněné soubory do staging:

```bash
git add .
```

1. Commitněte změny s popisnou zprávou:

```bash
git commit -m "Popis změny (např: Fix: Oprava kalkulace datumů)"
```

1. Nahrajte změny na GitHub:

```bash
git push
```

1. Netlify automaticky detekuje změnu a spustí build (~1-2 minuty)
   - Build log najdete na: <https://app.netlify.com/sites/recyklace/deploys>

2. Po dokončení buildu zkontrolujte web:
   - Produkční URL: <https://recyklace.netlify.app>
   - Otevřete browser console (F12) a zkontrolujte, že nejsou errory

## 🔧 Pokud se Service Worker aktualizuje

Když měníte soubory v `public/service-worker.js`:

1. **Zvyšte verzi** Service Workeru v souboru:

   ```javascript
   const CACHE_NAME = 'recyklace-asistent-v7'; // zvýšit číslo
   ```

2. Commitněte a pushněte jako obvykle

3. **Důležité pro uživatele s nainstalovanou PWA:**
   - Informujte je, že mají aplikaci zavřít a otevřít znovu
   - Nebo použít reset stránku: <https://recyklace.netlify.app/reset.html>

## ⚠️ Důležité poznámky

- **NIKDY** necommitujte `.env.local` (obsahuje API klíče)
- Environment variables nastavte v Netlify UI: <https://app.netlify.com/sites/recyklace/settings/deploys>
- První deployment běží ~2-3 minuty, další jsou rychlejší (~1 minuta)

## 🐛 Řešení problémů

**Build selhal:**

- Zkontrolujte build logy v Netlify dashboard
- Obvykle je problém ve TypeScript errorech nebo chybějících závislostech

**Změny se nezobrazují:**

- Vyčistěte browser cache (Ctrl+Shift+R)
- Zkontrolujte, že deploy skutečně proběhl v Netlify dashboard
- Pokud jde o PWA, resetujte Service Worker: <https://recyklace.netlify.app/reset.html>

## 📊 Užitečné příkazy

```bash
# Zobrazit historii commitů
git log --oneline -5

# Zobrazit změny před commitem
git diff

# Vrátit změny v souboru (před commitem)
git checkout -- nazev-souboru.ts

# Zkontrolovat remote repository
git remote -v
```

## 🔗 Užitečné odkazy

- **Live web:** <https://recyklace.netlify.app>
- **GitHub repo:** <https://github.com/mulleroj/recyklace-asistent>
- **Netlify dashboard:** <https://app.netlify.com/sites/recyklace>
- **Reset stránka:** <https://recyklace.netlify.app/reset.html>
