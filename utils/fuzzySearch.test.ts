// Test cases for enhanced fuzzy search
import { findLocalMatch, getLevenshteinDistance } from './fuzzySearch';

// Mock database for testing
const testDatabase = [
    { name: 'PET láhev', category: 'PLAST' },
    { name: 'PET flaška', category: 'PLAST' },
    { name: 'plastová láhev', category: 'PLAST' },
    { name: 'kelímek od jogurtu', category: 'PLAST' },
    { name: 'sklenice', category: 'SKLO' },
    { name: 'plechovka', category: 'KOVY' },
    { name: 'papírová krabice', category: 'PAPIR' },
    { name: 'karton od mléka', category: 'PLAST' },
];

console.log('=== Enhanced Czech Search Tests ===\n');

// Test 1: Plural/Singular matching
console.log('Test 1: Plural/Singular');
console.log('Query: "lahve" (plural)');
let result = findLocalMatch('lahve', testDatabase);
console.log('Result:', result?.name || 'NOT FOUND');
console.log('Expected: PET láhev or plastová láhev\n');

// Test 2: Different word forms
console.log('Test 2: Different word forms');
console.log('Query: "lahvi" (dative case)');
result = findLocalMatch('lahvi', testDatabase);
console.log('Result:', result?.name || 'NOT FOUND');
console.log('Expected: PET láhev or plastová láhev\n');

// Test 3: Synonym matching
console.log('Test 3: Synonym matching');
console.log('Query: "plastová flaška"');
result = findLocalMatch('plastová flaška', testDatabase);
console.log('Result:', result?.name || 'NOT FOUND');
console.log('Expected: PET láhev or PET flaška\n');

// Test 4: Another synonym
console.log('Test 4: Synonym "petka"');
console.log('Query: "petka"');
result = findLocalMatch('petka', testDatabase);
console.log('Result:', result?.name || 'NOT FOUND');
console.log('Expected: PET láhev or PET flaška\n');

// Test 5: Plural cups
console.log('Test 5: Plural cups');
console.log('Query: "kelímky" (plural)');
result = findLocalMatch('kelímky', testDatabase);
console.log('Result:', result?.name || 'NOT FOUND');
console.log('Expected: kelímek od jogurtu\n');

// Test 6: Without diacritics
console.log('Test 6: Without diacritics');
console.log('Query: "kelimek" (no accents)');
result = findLocalMatch('kelimek', testDatabase);
console.log('Result:', result?.name || 'NOT FOUND');
console.log('Expected: kelímek od jogurtu\n');

// Test 7: Carton synonyms
console.log('Test 7: Carton synonyms');
console.log('Query: "tetrapack"');
result = findLocalMatch('tetrapack', testDatabase);
console.log('Result:', result?.name || 'NOT FOUND');
console.log('Expected: karton od mléka\n');

// Test 8: Metal container synonyms
console.log('Test 8: Metal synonyms');
console.log('Query: "konzerva"');
result = findLocalMatch('konzerva', testDatabase);
console.log('Result:', result?.name || 'NOT FOUND');
console.log('Expected: plechovka\n');

// Test 9: Partial match
console.log('Test 9: Partial match');
console.log('Query: "pet"');
result = findLocalMatch('pet', testDatabase);
console.log('Result:', result?.name || 'NOT FOUND');
console.log('Expected: PET láhev or PET flaška\n');

// Test 10: Complex query with multiple words
console.log('Test 10: Multi-word query');
console.log('Query: "plastové lahve"');
result = findLocalMatch('plastové lahve', testDatabase);
console.log('Result:', result?.name || 'NOT FOUND');
console.log('Expected: plastová láhev or PET láhev\n');

console.log('=== Tests Complete ===');
