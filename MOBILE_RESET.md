# 📱 Jak resetovat PWA aplikaci na mobilu

Pokud vidíte **bílou obrazovku** po instalaci aplikace na mobil, znamená to, že Service Worker má v cache starou verzi aplikace.

## 🔧 Řešení pro Android

### Metoda 1: Reset přes speciální stránku (Nejjednodušší)

1. **Otevřete aplikaci v normálním prohlížeči** (ne jako nainstalovanou PWA)
   - Jděte na: `https://recyklace.netlify.app/reset.html`

2. **Klikněte na "🗑️ Vymazat vše a restartovat"**
   - Tím se vymaže Service Worker a všechna cache

3. **Zavřete všechny taby** s aplikací

4. **Odinstalujte PWA** (dlouhý stisk na ikonu → Odinstalovat)

5. **Počkejte 5 sekund**

6. **Otevřete znovu** `https://recyklace.netlify.app`

7. **Nainstalujte PWA znovu**
   - Chrome: Menu (⋮) → "Nainstalovat aplikaci" nebo "Přidat na plochu"

---

### Metoda 2: Reset přes Chrome DevTools (Pro pokročilé)

1. Otevřete `https://recyklace.netlify.app` v **Chrome prohlížeči**

2. Otevřete Chrome Menu (⋮) → **Další nástroje** → **Nástroje pro vývojáře**

3. V DevTools přejděte na tab **Application**

4. V levém menu:
   - **Service Workers** → klikněte "Unregister"
   - **Storage** → klikněte "Clear site data"

5. Zavřete tab a otevřete aplikaci znovu

---

### Metoda 3: Manuální vymazání dat aplikace

1. Jděte do **Nastavení** telefonu
2. **Aplikace** → najděte "Pomocník s tříděním" nebo "Třídič"
3. **Úložiště** → **Vymazat data** + **Vymazat cache**
4. Odinstalujte aplikaci
5. Restartujte telefon
6. Nainstalujte aplikaci znovu

---

## 🍎 Řešení pro iOS (Safari)

1. Otevřete **Nastavení** → **Safari**
2. Klikněte na **Pokročilé** → **Data stránek**
3. Najděte `recyklace.netlify.app` a **Odstraňte**
4. Nebo klikněte **Odstranit všechna data stránek**
5. Vraťte se na plochu a **smažte PWA ikonu**
6. Otevřete Safari a jděte na `https://recyklace.netlify.app`
7. Klikněte **Sdílet** → **Přidat na plochu**

---

## ⚡ Prevence do budoucna

Service Worker nyní má verzi **v6**, která automaticky vymaže staré cache při aktualizaci.

Pokud v budoucnu uděláme update aplikace a neuvidíte změny:

1. **Zavřete aplikaci úplně** (swipe nahoru + zavřete z recent apps)
2. **Počkejte 10 sekund**
3. **Otevřete znovu**

Nová verze by se měla automaticky stáhnout při příštím otevření.

---

## 🆘 Stále problém?

Navštivte: `https://recyklace.netlify.app/reset.html` a použijte reset nástroj.

Tato stránka vám ukáže stav Service Workeru a umožní kompletní reset.
