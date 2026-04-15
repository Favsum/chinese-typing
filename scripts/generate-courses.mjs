import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const CSV_URL =
  'https://raw.githubusercontent.com/Favsum/chinese-words/refs/heads/main/%E7%8E%B0%E4%BB%A3%E6%B1%89%E8%AF%AD%E5%B8%B8%E7%94%A8%E8%AF%8D%E8%A1%A8%EF%BC%88%E7%AC%AC2%E7%89%88%EF%BC%89.csv';
const OUTPUT_DIR = path.resolve(process.cwd(), 'public', 'courses');
const PART_SIZE = 250;
const REQUIRED_HEADERS = ['词语', '拼音', '频序号'];

const stripBom = (value) => value.replace(/^\uFEFF/, '');

const parseCsv = (source) => {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  const pushField = () => {
    currentRow.push(currentField);
    currentField = '';
  };

  const pushRow = () => {
    const hasValue = currentRow.some((field) => field.length > 0);
    if (hasValue) {
      rows.push(currentRow);
    }
    currentRow = [];
  };

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (char === '"') {
      const nextChar = source[index + 1];
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ',') {
      pushField();
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      pushField();
      pushRow();

      if (char === '\r' && source[index + 1] === '\n') {
        index += 1;
      }
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    pushField();
    pushRow();
  }

  return rows;
};

const ensureHeaders = (headers) => {
  const normalizedHeaders = headers.map((header) => stripBom(header).trim());

  if (
    normalizedHeaders.length < REQUIRED_HEADERS.length ||
    REQUIRED_HEADERS.some((header, index) => normalizedHeaders[index] !== header)
  ) {
    throw new Error(`Unexpected CSV headers: ${normalizedHeaders.join(', ')}`);
  }
};

const toCourseItem = (row, rowIndex) => {
  const hanzi = row[0]?.trim() ?? '';
  const pinyin = row[1]?.trim() ?? '';

  if (!hanzi || Array.from(hanzi).length < 2) {
    return null;
  }

  return {
    hanzi,
    pinyin,
    rowIndex,
  };
};

const writeJson = (filePath, value) => {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const main = async () => {
  const response = await fetch(CSV_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
  }

  const csvText = stripBom(await response.text());
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    throw new Error('CSV response is empty.');
  }

  ensureHeaders(rows[0]);

  const courseItems = rows
    .slice(1)
    .map((row, index) => toCourseItem(row, index + 2))
    .filter((item) => item !== null)
    .map(({ hanzi, pinyin }) => ({ hanzi, pinyin }));

  if (courseItems.length === 0) {
    throw new Error('No valid multi-character course items were generated.');
  }

  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const manifest = [];

  for (let start = 0; start < courseItems.length; start += PART_SIZE) {
    const partNumber = Math.floor(start / PART_SIZE) + 1;
    const fileName = `course_part_${partNumber}.json`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    const partItems = courseItems.slice(start, start + PART_SIZE);

    writeJson(filePath, partItems);
    manifest.push(fileName);
  }

  writeJson(path.join(OUTPUT_DIR, 'manifest.json'), manifest);

  console.log(
    `Generated ${manifest.length} course files with ${courseItems.length} items from remote CSV into ${OUTPUT_DIR}`,
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
