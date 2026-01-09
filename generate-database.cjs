const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read the Excel file
const workbook = XLSX.readFile(path.join(__dirname, 'databaze_odpadu.xlsx'));
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet);

// Map categories to WasteCategory enum values
const categoryMapping = {
    'plasty': 'WasteCategory.PLAST',
    'papír': 'WasteCategory.PAPIR',
    'sklo': 'WasteCategory.SKLO',
    'bioodpad': 'WasteCategory.BIO',
    'kovy': 'WasteCategory.KOVY',
    'zbytkový': 'WasteCategory.SMESNY',
    'elektro': 'WasteCategory.SBERNY_DVUR',
    'nebezpečný': 'WasteCategory.SBERNY_DVUR',
    'objemný': 'WasteCategory.SBERNY_DVUR',
    'stavební': 'WasteCategory.SBERNY_DVUR',
    'textil': 'WasteCategory.TEXTIL',
    'olej': 'WasteCategory.OLEJE',
    'nápojové kartony': 'WasteCategory.PLAST',
    'autovraky': 'WasteCategory.SBERNY_DVUR',
    'pneumatiky': 'WasteCategory.SBERNY_DVUR',
    'dřevo': 'WasteCategory.SBERNY_DVUR',
    'gastroodpad': 'WasteCategory.BIO',
    'další odpady': 'WasteCategory.SMESNY',
};

function getPrimaryCategory(kamPatri) {
    if (!kamPatri) return 'WasteCategory.SMESNY';

    const categories = kamPatri.toLowerCase().split(',').map(c => c.trim());

    // Priority order for primary category
    const priorityOrder = ['plasty', 'papír', 'sklo', 'bioodpad', 'kovy', 'nápojové kartony', 'textil', 'olej', 'elektro', 'nebezpečný', 'objemný', 'stavební', 'zbytkový'];

    for (const priority of priorityOrder) {
        if (categories.includes(priority)) {
            return categoryMapping[priority] || 'WasteCategory.SMESNY';
        }
    }

    return 'WasteCategory.SMESNY';
}

// Generate TypeScript code
const entries = data.map(row => {
    const name = row.Nazev_odpadu || '';
    const category = getPrimaryCategory(row.Kam_patri);
    const note = (row.Poznamka || '').replace(/"/g, '\\"').replace(/\n/g, ' ');

    return `  { name: "${name}", category: ${category}, note: "${note}" }`;
});

const output = `
import { WasteCategory } from './types';

export const WASTE_DATABASE = [
${entries.join(',\n')}
];

export const SYSTEM_INSTRUCTION = \`
Jsi "Recyklační Asistent", specializovaný AI agent pro pomoc s tříděním domácího odpadu v ČR.

TVÉ ZNALOSTI:
- Primárně vycházej z této databáze: \${JSON.stringify(WASTE_DATABASE)}.
- Pokud položku v databázi najdeš (přesná nebo velmi blízká shoda), nastav "isFromDatabase" na true.
- Pokud položku v databázi NENAJDĚŠ, nastav "isFromDatabase" na false a urči kategorii podle svých obecných znalostí.

PRAVIDLA PRO ODPOVĚDI:
- Buď stručný a věcný.
- "category" musí být přesně jeden z klíčů WasteCategory.
- Do "note" přidej doplňující instrukce (např. vymýt, sešlápnout).

ODPOVÍDEJ VŽDY V TOMTO JSON FORMÁTU:
{
  "name": "Název odpadu",
  "category": "String z WasteCategory",
  "note": "Poznámka",
  "isFromDatabase": true/false
}
\`;
`;

fs.writeFileSync(path.join(__dirname, 'constants.ts'), output, 'utf8');
console.log('Generated constants.ts with', data.length, 'entries');
