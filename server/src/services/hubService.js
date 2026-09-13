import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedHubs = null;

export function getAllHubs() {
  if (!cachedHubs) {
    const filePath = path.join(__dirname, '../data/hubs.json');
    if (fs.existsSync(filePath)) {
      cachedHubs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } else {
      cachedHubs = [];
    }
  }
  return cachedHubs;
}

export function searchHubs(term) {
  if (!term || term.trim() === '') return [];
  const lower = term.toLowerCase().trim();
  const all = getAllHubs();
  return all.filter(h => 
    h.name.toLowerCase().includes(lower) ||
    h.code.toLowerCase().includes(lower) ||
    h.city.toLowerCase().includes(lower) ||
    h.region.toLowerCase().includes(lower)
  );
}

export function getHubByCode(code) {
  const all = getAllHubs();
  return all.find(h => h.code.toUpperCase() === code.toUpperCase().trim());
}

export function getRegions() {
  const all = getAllHubs();
  return [...new Set(all.map(h => h.region))].sort();
}

export function getHubsByRegion(region) {
  const all = getAllHubs();
  return all.filter(h => h.region.toLowerCase() === region.toLowerCase().trim());
}
