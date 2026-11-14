import XLSX from 'xlsx';
import fs from 'fs';

const PATH = 'scripts/HYPER_수시교과_학종_MASTER_v124_인천수원아주인하_최종교차검증.xlsx';

const wb = XLSX.readFile(PATH, { cellDates: true, raw: true });
console.log('=== SHEETS ===');
console.log(wb.SheetNames.map((n, i) => `${i}: ${n}`).join('\n'));

function sheetToRows(name) {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
}

function findSheet(pred) {
  return wb.SheetNames.find(pred) || null;
}

function countMap(values) {
  const m = new Map();
  for (const v of values) {
    const key = v === null || v === undefined ? '(null/undefined)' : String(v);
    m.set(key, (m.get(key) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'));
}

function printCounts(title, values) {
  const counts = countMap(values);
  console.log(`\n=== ${title} (${counts.length} unique, ${values.length} total) ===`);
  for (const [k, c] of counts) {
    console.log(`  [${c}] ${k === '' ? '(empty)' : k}`);
  }
}

function colKeys(rows) {
  const keys = new Set();
  for (const r of rows) Object.keys(r).forEach(k => keys.add(k));
  return [...keys];
}

function pickCol(keys, candidates) {
  for (const c of candidates) {
    const hit = keys.find(k => k === c);
    if (hit) return hit;
  }
  for (const c of candidates) {
    const hit = keys.find(k => k.includes(c));
    if (hit) return hit;
  }
  return null;
}

function classify70(v) {
  if (v === null || v === undefined) return 'empty';
  if (typeof v === 'number') return Number.isFinite(v) ? 'number' : 'nan';
  if (typeof v === 'string') {
    const s = v.trim();
    if (s === '') return 'empty';
    return 'string';
  }
  return typeof v;
}

function isNumericLike(v) {
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string') {
    const s = v.trim().replace(/,/g, '');
    if (s === '') return false;
    return Number.isFinite(Number(s));
  }
  return false;
}

const masterName = findSheet(n => n.includes('MASTER_입결')) || findSheet(n => n.includes('MASTER'));
const hakjongName = findSheet(n => n.includes('학종_입결')) || findSheet(n => n.includes('학종'));

console.log('\nUsing MASTER sheet:', masterName);
console.log('Using 학종 sheet:', hakjongName);

const masterRows = masterName ? sheetToRows(masterName) : [];
const hakjongRows = hakjongName ? sheetToRows(hakjongName) : [];

console.log('\nMASTER row count:', masterRows.length);
console.log('학종 row count:', hakjongRows.length);

const mKeys = colKeys(masterRows);
const hKeys = colKeys(hakjongRows);
console.log('\n=== MASTER columns ===');
console.log(mKeys.join('\n'));
console.log('\n=== 학종 columns ===');
console.log(hKeys.join('\n'));

const mCampus = pickCol(mKeys, ['캠퍼스']);
const mMin = pickCol(mKeys, ['수능최저 적용(2026)', '수능최저 적용', '수능최저']);
const mYear = pickCol(mKeys, ['학년도']);
const mCut70 = pickCol(mKeys, ['70%컷', '70% 컷']);
const mUniv = pickCol(mKeys, ['대학명', '대학', '대학교']);

const hRegion = pickCol(hKeys, ['지역']);
const hMajor = pickCol(hKeys, ['핵심계열']);
const hCampus = pickCol(hKeys, ['캠퍼스']);
const hMin = pickCol(hKeys, ['수능최저', '수능최저 적용(2026)', '수능최저 적용']);
const hCut70 = pickCol(hKeys, ['70%컷', '70% 컷']);
const hUniv = pickCol(hKeys, ['대학명', '대학', '대학교']);

console.log('\n=== Column mapping ===');
console.log(JSON.stringify({
  MASTER: { 캠퍼스: mCampus, 수능최저: mMin, 학년도: mYear, '70%컷': mCut70, 대학: mUniv },
  학종: { 지역: hRegion, 핵심계열: hMajor, 캠퍼스: hCampus, 수능최저: hMin, '70%컷': hCut70, 대학: hUniv },
}, null, 2));

if (mCampus) printCounts('MASTER_입결 unique 캠퍼스', masterRows.map(r => r[mCampus]));
if (mMin) printCounts('MASTER_입결 unique 수능최저 적용(2026)', masterRows.map(r => r[mMin]));
if (mYear) printCounts('MASTER_입결 unique 학년도', masterRows.map(r => r[mYear]));

if (mCut70) {
  const classes = { number: 0, string: 0, empty: 0, other: 0 };
  const stringSamples = [];
  for (const r of masterRows) {
    const v = r[mCut70];
    const c = classify70(v);
    if (c === 'number') classes.number++;
    else if (c === 'string') {
      classes.string++;
      if (stringSamples.length < 20) stringSamples.push(JSON.stringify(v));
    } else if (c === 'empty') classes.empty++;
    else {
      classes.other++;
      if (stringSamples.length < 20) stringSamples.push(`(${c}) ${JSON.stringify(v)}`);
    }
  }
  console.log('\n=== MASTER_입결 70%컷 type counts ===');
  console.log(JSON.stringify(classes, null, 2));
  console.log('\n=== sample of MASTER 70%컷 string values (up to 20) ===');
  if (stringSamples.length === 0) console.log('  (none)');
  else stringSamples.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
}

if (hRegion) printCounts('학종_입결 unique 지역', hakjongRows.map(r => r[hRegion]));
if (hMajor) {
  const counts = countMap(hakjongRows.map(r => r[hMajor]));
  console.log(`\n=== 학종_입결 unique 핵심계열 (${counts.length} unique, first 40) ===`);
  counts.slice(0, 40).forEach(([k, c]) => console.log(`  [${c}] ${k === '' ? '(empty)' : k}`));
  if (counts.length > 40) console.log(`  ... ${counts.length - 40} more`);
}
if (hCampus) printCounts('학종_입결 unique 캠퍼스', hakjongRows.map(r => r[hCampus]));
if (hMin) printCounts('학종_입결 unique 수능최저', hakjongRows.map(r => r[hMin]));

if (hCut70) {
  const nonNumeric = [];
  let numeric = 0, empty = 0, nonNum = 0;
  for (const r of hakjongRows) {
    const v = r[hCut70];
    if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) {
      empty++;
      continue;
    }
    if (isNumericLike(v)) numeric++;
    else {
      nonNum++;
      if (nonNumeric.length < 20) nonNumeric.push(JSON.stringify(v));
    }
  }
  console.log('\n=== 학종_입결 70%컷 numeric vs non-numeric ===');
  console.log(JSON.stringify({ numeric, empty, nonNumeric: nonNum }, null, 2));
  console.log('\n=== sample of 학종 70%컷 non-numeric values (up to 20) ===');
  if (nonNumeric.length === 0) console.log('  (none)');
  else nonNumeric.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
}

function collectUnivs(rows, key) {
  const set = new Set();
  if (!key) return set;
  for (const r of rows) {
    const v = r[key];
    if (v != null && String(v).trim()) set.add(String(v).trim());
  }
  return set;
}

const univs = new Set([
  ...collectUnivs(masterRows, mUniv),
  ...collectUnivs(hakjongRows, hUniv),
]);
const gungnip = [...univs].filter(n => n.includes('국립')).sort((a, b) => a.localeCompare(b, 'ko'));
console.log(`\n=== universities whose name includes 국립 (${gungnip.length}) ===`);
if (gungnip.length === 0) console.log('  (none)');
else gungnip.forEach(n => console.log(`  ${n}`));

console.log('\nDONE');
