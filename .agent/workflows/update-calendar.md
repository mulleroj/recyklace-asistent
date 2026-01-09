---
description: Aktualizace kalendáře svozu odpadu na nový rok
---

# Aktualizace kalendáře svozu odpadu

Tento workflow vás provede aktualizací kalendáře svozu odpadu pro nový rok.

## Předpoklady

1. Máte nový obrázek kalendáře (od svozové společnosti)
2. Obrázek je ve formátu JPG

## Kroky

### 1. Připravte obrázek kalendáře

Umístěte nový obrázek kalendáře do složky projektu:

```
recyklace_asistent/kalendar.jpg
```

> **Tip:** Přejmenujte nový kalendář na `kalendar.jpg` (přepíše starý)

### 2. Spusťte extrakční skript

```bash
node extract-calendar.cjs 2027
```

Nahraďte `2027` požadovaným rokem.

### 3. Zkontrolujte extrahovaná data

Skript zobrazí všechna extrahovaná data po měsících. Použijte příkazy:

| Příkaz | Popis |
|--------|-------|
| `d <číslo>` | Smazat záznam |
| `e <číslo> <datum>` | Upravit datum (YYYY-MM-DD) |
| `t <číslo> <typy>` | Změnit typy odpadu |
| `a <datum> <typy>` | Přidat nový záznam |
| `l` | Zobrazit seznam znovu |
| `s` | Uložit a pokračovat |
| `q` | Zrušit bez uložení |

**Příklady:**

```
d 5                    # smaže 5. záznam
e 10 2027-03-15        # změní datum 10. záznamu
t 3 plast,papir        # změní typy 3. záznamu
a 2027-06-01 smesny    # přidá nový záznam
```

### 4. Ověřte výsledek

Po uložení zkontrolujte vygenerované soubory:

- `wasteSchedule.json` - data ve formátu JSON
- `wasteSchedule.ts` - TypeScript modul pro aplikaci

### 5. Restartujte aplikaci

```bash
npm run dev
```

## Typy odpadu

| Kód | Popis | Barva v kalendáři |
|-----|-------|-------------------|
| `plast` | Plasty a kartony | Žlutá/oranžová |
| `papir` | Papír a lepenka | Modrá |
| `sklo` | Sklo | Zelená |
| `bio` | Bioodpad | Hnědá |
| `smesny` | Směsný odpad | Černá/šedá |

## Řešení problémů

**AI udělala chyby v datech:**

- Použijte příkazy pro úpravu (`e`, `d`, `a`) během kontroly
- Zkontrolujte zejména přelom měsíců

**Chyba API klíče:**

- Nastavte proměnnou `GEMINI_API_KEY` nebo upravte klíč ve skriptu

**Obrázek nebyl nalezen:**

- Ujistěte se, že soubor `kalendar.jpg` je ve složce `recyklace_asistent`
