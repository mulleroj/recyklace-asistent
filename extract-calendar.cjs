const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// ===== KONFIGURACE =====
// API klíč můžete změnit nebo použít proměnnou prostředí
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error('GEMINI_API_KEY must be provided through the environment.');
}

// Název souboru s kalendářem (ve stejné složce jako tento skript)
const CALENDAR_IMAGE = "kalendar.jpg";

// ===== POMOCNÉ FUNKCE =====
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

async function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function formatEntryForDisplay(entry, index) {
  const date = new Date(entry.date);
  const dayNames = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
  const dayName = dayNames[date.getDay()];
  const typeColors = {
    plast: '\x1b[33m',      // žlutá
    papir: '\x1b[34m',      // modrá
    sklo: '\x1b[32m',       // zelená
    bio: '\x1b[35m',        // fialová
    smesny: '\x1b[90m',     // šedá
  };
  const reset = '\x1b[0m';

  const coloredTypes = entry.types.map(t => `${typeColors[t] || ''}${t}${reset}`).join(', ');
  return `${String(index + 1).padStart(3)}. ${entry.date} (${dayName}): ${coloredTypes}`;
}

// ===== HLAVNÍ EXTRAKCE =====
async function extractCalendarData(year) {
  console.log(`\n📅 Extrakce kalendáře svozu odpadu pro rok ${year}...`);

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  const imagePath = path.join(__dirname, CALENDAR_IMAGE);

  if (!fs.existsSync(imagePath)) {
    throw new Error(`Soubor kalendáře '${CALENDAR_IMAGE}' nebyl nalezen!\nUmístěte obrázek kalendáře do složky: ${__dirname}`);
  }

  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString("base64");

  const prompt = `Toto je kalendář svozu odpadu pro rok ${year}.

DŮLEŽITÉ INSTRUKCE:
1. Pečlivě si prohlédni KAŽDÝ měsíc kalendáře
2. U každého dne zkontroluj, zda má barevné označení (zabarvení pozadí nebo čísla)
3. Zapiš PŘESNÉ datum včetně správného dne v měsíci
4. Kalendář je pro rok ${year}
5. ZKONTROLUJ, který den v týdnu je 1. den každého měsíce - to ti pomůže správně identifikovat data

BAREVNÉ KÓDY:
- Žlutá/oranžová barva = "plast" (plasty a nápojové kartony)
- Modrá barva = "papir" (papír a lepenka)  
- Zelená barva = "sklo" (sklo)
- Hnědá barva = "bio" (bioodpad)
- Černá/šedá/tmavá barva = "smesny" (směsný komunální odpad)

FORMÁT ODPOVĚDI (pouze validní JSON):
{
  "schedule": [
    { "date": "${year}-01-07", "types": ["smesny"] },
    { "date": "${year}-01-14", "types": ["plast"] }
  ]
}

Projdi VŠECHNY měsíce od ledna do prosince ${year} a zapiš VŠECHNA barevně označená data.
Dbej na přesnost - zkontroluj, který den v týdnu je první den každého měsíce.

Vrať POUZE validní JSON, žádný komentář.`;

  console.log("🤖 Analyzuji obrázek kalendáře pomocí AI...");

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Image,
      },
    },
  ]);

  const response = await result.response;
  let text = response.text();

  // Vyčistit odpověď
  text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  const data = JSON.parse(text);

  console.log(`✅ AI extrahovala ${data.schedule.length} záznamů\n`);

  return data;
}

// ===== INTERAKTIVNÍ VERIFIKACE =====
async function verifySchedule(data, year) {
  const rl = createReadlineInterface();
  let schedule = [...data.schedule];
  let modified = false;

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("                    MANUÁLNÍ KONTROLA KALENDÁŘE");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Zobrazit všechny záznamy po měsících
  const months = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
    'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];

  for (let month = 1; month <= 12; month++) {
    const monthEntries = schedule.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === month - 1;
    });

    console.log(`\n📆 ${months[month - 1]} ${year}:`);
    if (monthEntries.length === 0) {
      console.log("   (žádné záznamy)");
    } else {
      monthEntries.forEach((entry, i) => {
        const globalIndex = schedule.indexOf(entry);
        console.log("   " + formatEntryForDisplay(entry, globalIndex));
      });
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("PŘÍKAZY PRO ÚPRAVY:");
  console.log("  d <číslo>           - Smazat záznam");
  console.log("  e <číslo> <datum>   - Upravit datum (formát: YYYY-MM-DD)");
  console.log("  t <číslo> <typy>    - Změnit typy odpadu (oddělené čárkou)");
  console.log("  a <datum> <typy>    - Přidat nový záznam");
  console.log("  l                   - Zobrazit seznam znovu");
  console.log("  s                   - Uložit a pokračovat");
  console.log("  q                   - Zrušit bez uložení");
  console.log("═══════════════════════════════════════════════════════════════\n");

  while (true) {
    const input = await askQuestion(rl, "Příkaz (s = uložit): ");
    const parts = input.split(" ");
    const cmd = parts[0].toLowerCase();

    if (cmd === "s" || cmd === "save" || cmd === "") {
      break;
    }

    if (cmd === "q" || cmd === "quit") {
      rl.close();
      throw new Error("Operace zrušena uživatelem");
    }

    if (cmd === "l" || cmd === "list") {
      schedule.forEach((entry, i) => console.log(formatEntryForDisplay(entry, i)));
      continue;
    }

    if (cmd === "d" || cmd === "delete") {
      const index = parseInt(parts[1]) - 1;
      if (index >= 0 && index < schedule.length) {
        console.log(`❌ Smazáno: ${schedule[index].date}`);
        schedule.splice(index, 1);
        modified = true;
      } else {
        console.log("⚠️  Neplatné číslo záznamu");
      }
      continue;
    }

    if (cmd === "e" || cmd === "edit") {
      const index = parseInt(parts[1]) - 1;
      const newDate = parts[2];
      if (index >= 0 && index < schedule.length && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
        console.log(`✏️  Změněno: ${schedule[index].date} → ${newDate}`);
        schedule[index].date = newDate;
        modified = true;
      } else {
        console.log("⚠️  Neplatný formát. Použijte: e <číslo> <YYYY-MM-DD>");
      }
      continue;
    }

    if (cmd === "t" || cmd === "types") {
      const index = parseInt(parts[1]) - 1;
      const types = parts.slice(2).join("").split(",").map(t => t.trim().toLowerCase());
      if (index >= 0 && index < schedule.length && types.length > 0) {
        console.log(`✏️  Typy změněny: ${schedule[index].types.join(",")} → ${types.join(",")}`);
        schedule[index].types = types;
        modified = true;
      } else {
        console.log("⚠️  Neplatný formát. Použijte: t <číslo> <typ1,typ2>");
      }
      continue;
    }

    if (cmd === "a" || cmd === "add") {
      const newDate = parts[1];
      const types = parts.slice(2).join("").split(",").map(t => t.trim().toLowerCase());
      if (/^\d{4}-\d{2}-\d{2}$/.test(newDate) && types.length > 0) {
        schedule.push({ date: newDate, types });
        schedule.sort((a, b) => a.date.localeCompare(b.date));
        console.log(`➕ Přidáno: ${newDate} - ${types.join(", ")}`);
        modified = true;
      } else {
        console.log("⚠️  Neplatný formát. Použijte: a <YYYY-MM-DD> <typ1,typ2>");
      }
      continue;
    }

    console.log("⚠️  Neznámý příkaz. Použijte: d, e, t, a, l, s, nebo q");
  }

  rl.close();

  // Seřadit podle data
  schedule.sort((a, b) => a.date.localeCompare(b.date));

  return { schedule, modified };
}

// ===== ULOŽENÍ SOUBORŮ =====
function saveScheduleFiles(data, year) {
  // Uložit JSON
  const jsonPath = path.join(__dirname, "wasteSchedule.json");
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf8");
  console.log(`\n✅ JSON uložen: ${jsonPath}`);

  // Generovat TypeScript
  const tsContent = `// Waste collection schedule data extracted from calendar
// Rok: ${year}
// Vygenerováno: ${new Date().toLocaleDateString('cs-CZ')}

export interface ScheduleEntry {
  date: string; // YYYY-MM-DD format
  types: string[]; // 'plast', 'papir', 'sklo', 'bio', 'smesny'
}

export const WASTE_SCHEDULE: ScheduleEntry[] = ${JSON.stringify(data.schedule, null, 2)};

// Helper functions
export function getNextCollection(fromDate: Date = new Date()): ScheduleEntry | null {
  const dateStr = fromDate.toISOString().split('T')[0];
  return WASTE_SCHEDULE.find(entry => entry.date >= dateStr) || null;
}

export function getUpcomingCollections(count: number = 3, fromDate: Date = new Date()): ScheduleEntry[] {
  const dateStr = fromDate.toISOString().split('T')[0];
  return WASTE_SCHEDULE.filter(entry => entry.date >= dateStr).slice(0, count);
}

export function getDaysUntil(targetDate: string, fromDate: Date = new Date()): number {
  const target = new Date(targetDate);
  const from = new Date(fromDate.toISOString().split('T')[0]);
  const diffTime = target.getTime() - from.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    plast: 'Plasty',
    papir: 'Papír',
    sklo: 'Sklo',
    bio: 'Bioodpad',
    smesny: 'Směsný odpad',
  };
  return labels[type] || type;
}

export function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    plast: 'bg-yellow-400',
    papir: 'bg-blue-600',
    sklo: 'bg-green-600',
    bio: 'bg-amber-700',
    smesny: 'bg-zinc-700',
  };
  return colors[type] || 'bg-slate-400';
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
`;

  const tsPath = path.join(__dirname, "wasteSchedule.ts");
  fs.writeFileSync(tsPath, tsContent, "utf8");
  console.log(`✅ TypeScript uložen: ${tsPath}`);

  console.log(`\n📊 Celkem záznamů: ${data.schedule.length}`);
}

// ===== HLAVNÍ PROGRAM =====
async function main() {
  const args = process.argv.slice(2);
  let year = new Date().getFullYear() + 1; // Výchozí: příští rok

  // Parsování argumentů
  if (args.length > 0) {
    const yearArg = parseInt(args[0]);
    if (!isNaN(yearArg) && yearArg >= 2024 && yearArg <= 2100) {
      year = yearArg;
    }
  }

  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║         EXTRAKTOR KALENDÁŘE SVOZU ODPADU                     ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  console.log(`\nZpracovávám kalendář pro rok: ${year}`);
  console.log(`Obrázek kalendáře: ${CALENDAR_IMAGE}`);

  try {
    // 1. Extrakce pomocí AI
    const rawData = await extractCalendarData(year);

    // 2. Manuální kontrola
    const { schedule, modified } = await verifySchedule(rawData, year);

    // 3. Uložení
    saveScheduleFiles({ schedule }, year);

    console.log("\n✅ Hotovo! Kalendář byl úspěšně aktualizován.");
    if (modified) {
      console.log("📝 Byly provedeny manuální úpravy.");
    }

  } catch (error) {
    console.error("\n❌ Chyba:", error.message);
    process.exit(1);
  }
}

main();
