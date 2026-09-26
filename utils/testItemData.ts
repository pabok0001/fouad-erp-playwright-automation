import { cellValue, parseList, parseTables, readMarkdown } from './markdownData';

/** Test data for Diagnostic → Test Item comes from this file — edit it to change the tests. */
export const TEST_ITEM_DATA_FILE = 'Markdown/test.md';

export interface TestItemInput {
  name: string;
  code: string;
  group: string;
  vacutainer: string;
  rate: string;
  isActive: boolean;
}

export interface InvestigationRow extends TestItemInput {
  no: string;
  sampleType: string;
}

export type ExpectedOutcome = 'reject' | 'accept' | 'observe';

export interface EdgeCase extends TestItemInput {
  title: string;
  expected: string;
  outcome: ExpectedOutcome;
}

/** Department names in the file that differ from the app's Group names. */
const GROUP_ALIASES: Record<string, string> = { HORMONE: 'IMMUNOLOGY' };

/** Default vacutainer by group + sample type, based on existing items in the master list. */
function vacutainerFor(group: string, sample: string): string {
  const s = sample.toLowerCase();
  if (s === 'blood') return group === 'HEMATOLOGY' ? 'Purple Tube*' : 'Vacutainer Red 4ml*';
  if (s === 'urine') return group === 'MICROBIOLOGY' ? 'Urine C/S Pot*' : 'Urine Pot*';
  if (s === 'stool') return 'Stool Pot*';
  return '';
}

const toGroup = (department: string) => {
  const up = department.trim().toUpperCase();
  return GROUP_ALIASES[up] ?? up;
};

/** Map the "Expected" text to how the test should judge the result. */
function outcomeOf(expected: string): ExpectedOutcome {
  if (/prevent|required|should not|not allow|not accept/i.test(expected)) return 'reject';
  if (/should accept/i.test(expected)) return 'accept';
  return 'observe'; // "Check …", "Validate …" — record what the app does
}

export function loadTestItemData() {
  const md = readMarkdown(TEST_ITEM_DATA_FILE);
  const tables = parseTables(md);
  const master = tables.find((t) => t[0] && 'Investigation Code' in t[0]) ?? [];
  const cases = tables.find((t) => t[0] && 'Test Case' in t[0]) ?? [];

  const investigations: InvestigationRow[] = master.map((r) => {
    const group = toGroup(r['Department']);
    return {
      no: r['#'],
      name: cellValue(r['Investigation Name']),
      code: cellValue(r['Investigation Code']),
      group,
      sampleType: r['Sample Type'],
      vacutainer: vacutainerFor(group, r['Sample Type']),
      rate: r['Rate'].replace(/,/g, ''),
      isActive: !/inactive/i.test(r['Status']),
    };
  });

  const edgeCases: EdgeCase[] = cases.map((r) => ({
    title: r['Test Case'],
    name: cellValue(r['Investigation Name']),
    code: cellValue(r['Code']),
    // The edge-case table has no department / sample — use a common default.
    group: 'BIOCHEMISTRY',
    vacutainer: 'Vacutainer Red 4ml*',
    rate: r['Rate'].replace(/,/g, ''),
    isActive: true,
    expected: r['Expected'],
    outcome: outcomeOf(r['Expected']),
  }));

  const searchTerms = parseList(md, 'Search Term');
  return { investigations, edgeCases, searchTerms };
}
