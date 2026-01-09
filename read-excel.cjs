const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read the Excel file
const workbook = XLSX.readFile(path.join(__dirname, 'databaze_odpadu.xlsx'));
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Total rows:', data.length);
console.log('First 5 rows:');
console.log(JSON.stringify(data.slice(0, 5), null, 2));

// Get unique categories
const categories = [...new Set(data.map(row => row.Kam_patri))];
console.log('\nUnique categories:');
console.log(categories);
