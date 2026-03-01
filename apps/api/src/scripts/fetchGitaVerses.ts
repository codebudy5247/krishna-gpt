// scripts/fetchAndGenerateGitaVerses.ts
//
// Fetches ALL 700 Bhagavad Gita verses from RapidAPI (bhagavad-gita3)
// and generates data/gitaVerses.ts ready for seeding + vector ingestion.
//
// Usage:
//   npx tsx src/scripts/fetchAndGenerateGitaVerses.ts

import fs from 'fs';
import path from 'path';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

// ─── Config ───────────────────────────────────────────────────────────────────

const RAPID_API_KEY = process.env.RAPID_API_KEY || '';
const RAPID_API_HOST = 'bhagavad-gita3.p.rapidapi.com';
const OUTPUT_PATH = path.resolve(__dirname, '../data/gitaVerses.ts');

const CHAPTER_VERSE_COUNTS: Record<number, number> = {
  1: 47,  2: 72,  3: 43,  4: 42,  5: 29,
  6: 47,  7: 30,  8: 28,  9: 34,  10: 42,
  11: 55, 12: 20, 13: 35, 14: 27, 15: 20,
  16: 24, 17: 28, 18: 78,
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface RapidAPITranslation {
  id: number;
  description: string;
  authorName: string;
}

interface RapidAPICommentary {
  id: number;
  description: string;
  authorName: string;
}

interface RapidAPIVerse {
  id: number;
  verse_number: number;
  chapter_number: number;
  slug: string;
  text: string;
  transliteration: string;
  word_meanings: string;
  translations: RapidAPITranslation[];
  commentaries: RapidAPICommentary[];
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

function apiGet<T>(urlPath: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      hostname: RAPID_API_HOST,
      path: urlPath,
      headers: {
        'x-rapidapi-key': RAPID_API_KEY,
        'x-rapidapi-host': RAPID_API_HOST,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            reject(new Error('HTTP ' + res.statusCode + ': ' + data));
            return;
          }
          resolve(JSON.parse(data) as T);
        } catch (e) {
          reject(new Error('Failed to parse response: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// ─── Keyword extractor ────────────────────────────────────────────────────────

const THEME_KEYWORDS: Array<[RegExp, string[]]> = [
  [/\b(duty|dharma|righteous|obligat)/i,       ['duty', 'dharma', 'righteousness']],
  [/\b(action|work|karma|perform|deed)/i,       ['action', 'work', 'karma', 'effort']],
  [/\b(desire|attachment|possessiv|craving)/i,  ['desire', 'attachment', 'craving']],
  [/\b(anger|wrath|hate|enmity|enemy)/i,        ['anger', 'hatred', 'enemy']],
  [/\b(fear|anxiet|worry|dread|panic)/i,        ['fear', 'anxiety', 'worry']],
  [/\b(grief|sorrow|mourn|lament|sad)/i,        ['grief', 'sorrow', 'sadness']],
  [/\b(death|mortal|perish|slain|destroy)/i,    ['death', 'mortality', 'loss']],
  [/\b(soul|atman|self|spirit|consciou)/i,      ['soul', 'atman', 'self', 'consciousness']],
  [/\b(mind|intellect|thought|reason|wisdom)/i, ['mind', 'intellect', 'wisdom']],
  [/\b(peace|tranquil|calm|serenity|equanim)/i, ['peace', 'tranquility', 'calm']],
  [/\b(meditat|yoga|discipline|practice)/i,     ['meditation', 'yoga', 'practice']],
  [/\b(surrender|devo|worship|faith|pray)/i,    ['surrender', 'devotion', 'faith']],
  [/\b(god|divine|lord|supreme|krishna)/i,      ['god', 'divine', 'krishna']],
  [/\b(knowledge|wisdom|truth|understand)/i,    ['knowledge', 'wisdom', 'truth']],
  [/\b(ego|pride|arrogance|vanity|humble)/i,    ['ego', 'pride', 'humility']],
  [/\b(success|failure|result|fruit|outcome)/i, ['success', 'failure', 'results']],
  [/\b(relation|friend|family|love|compan)/i,   ['relationships', 'friendship', 'love']],
  [/\b(purpose|meaning|life|path|journey)/i,    ['purpose', 'meaning', 'life path']],
  [/\b(liberation|moksha|freedom|release)/i,    ['liberation', 'moksha', 'freedom']],
  [/\b(sin|guilt|mistake|error|wrong)/i,        ['sin', 'guilt', 'mistakes']],
  [/\b(pleasure|happiness|joy|bliss|enjoy)/i,   ['pleasure', 'happiness', 'joy']],
  [/\b(suffering|pain|misery|distress)/i,       ['suffering', 'pain', 'hardship']],
  [/\b(body|physical|sense|perception)/i,       ['body', 'senses', 'physical']],
  [/\b(sacrifice|service|selfless|giving)/i,    ['sacrifice', 'service', 'selflessness']],
  [/\b(control|restrain|overcome|conquer)/i,    ['self-control', 'discipline', 'mastery']],
  [/\b(doubt|confus|uncertain|dilemma)/i,       ['doubt', 'confusion', 'uncertainty']],
  [/\b(courage|brave|warrior|strength)/i,       ['courage', 'bravery', 'strength']],
  [/\b(change|transient|imperman|tempora)/i,    ['change', 'impermanence', 'temporary']],
  [/\b(character|virtue|quality)/i,             ['character', 'virtue', 'qualities']],
];

function extractKeywords(text: string): string[] {
  const keywords = new Set<string>();
  for (const [pattern, tags] of THEME_KEYWORDS) {
    if (pattern.test(text)) {
      tags.forEach((k) => keywords.add(k));
    }
  }
  if (keywords.size === 0) {
    keywords.add('spiritual wisdom');
    keywords.add('bhagavad gita');
  }
  return Array.from(keywords);
}

// ─── Pick best translation & commentary ──────────────────────────────────────

const PREFERRED_TRANSLATORS = [
  'Swami Sivananda',
  'Dr. S. Sankaranarayan',
  'Swami Gambirananda',
  'Swami Adidevananda',
  'Shri Purohit Swami',
];

const PREFERRED_COMMENTATORS = [
  'Swami Sivananda',
  'Swami Chinmayananda',
  'Sri Anandgiri',
];

function pickBestTranslation(translations: RapidAPITranslation[]): string {
  if (!Array.isArray(translations) || translations.length === 0) return '';
  for (const preferred of PREFERRED_TRANSLATORS) {
    const found = translations.find(
      (t) => t?.authorName?.toLowerCase().includes(preferred.toLowerCase())
    );
    if (found?.description) return found.description.trim();
  }
  const first = translations.find((t) => t?.description);
  return first?.description?.trim() || '';
}

function pickBestCommentary(commentaries: RapidAPICommentary[]): string | undefined {
  if (!Array.isArray(commentaries) || commentaries.length === 0) return undefined;
  for (const preferred of PREFERRED_COMMENTATORS) {
    const found = commentaries.find(
      (c) => c?.authorName?.toLowerCase().includes(preferred.toLowerCase())
    );
    if (found?.description && found.description.length > 30) {
      return found.description.trim();
    }
  }
  const sorted = [...commentaries]
    .filter((c) => c?.description)
    .sort((a, b) => b.description.length - a.description.length);
  return sorted[0]?.description?.trim() || undefined;
}

// ─── Escape helper for template literals ─────────────────────────────────────

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

// ─── Build verse entry string ─────────────────────────────────────────────────

function buildVerseEntry(
  chapter: number,
  verse: number,
  data: RapidAPIVerse,
  translation: string,
  commentary: string | undefined,
  keywords: string[]
): string {
  const commentaryLine = commentary
    ? '    commentary: `' + esc(commentary) + '`,'
    : '    commentary: undefined,';

  return [
    '  {',
    '    chapter: ' + chapter + ',',
    '    verse: ' + verse + ',',
    '    sanskrit: `' + esc(data.text) + '`,',
    '    transliteration: `' + esc(data.transliteration) + '`,',
    '    wordMeanings: `' + esc(data.word_meanings) + '`,',
    '    translation: `' + esc(translation) + '`,',
    commentaryLine,
    '    keywords: ' + JSON.stringify(keywords) + ',',
    '  },',
  ].join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!RAPID_API_KEY) {
    console.error('❌ RAPID_API_KEY is not set in your .env file');
    process.exit(1);
  }

  console.log('🕉️  Fetching all Bhagavad Gita verses from RapidAPI...\n');

  const allVerseEntries: string[] = [];
  let totalFetched = 0;
  let totalFailed = 0;
  const totalVerses = Object.values(CHAPTER_VERSE_COUNTS).reduce((a, b) => a + b, 0);

  for (let chapter = 1; chapter <= 18; chapter++) {
    const verseCount = CHAPTER_VERSE_COUNTS[chapter];
    console.log('\n📖 Chapter ' + chapter + ' (' + verseCount + ' verses)...');

    for (let verse = 1; verse <= verseCount; verse++) {
      try {
        const data = await apiGet<RapidAPIVerse>(
          '/v2/chapters/' + chapter + '/verses/' + verse + '/'
        );

        if (!data || !data.text) {
          console.error('\n⚠️  BG ' + chapter + '.' + verse + ' — empty response, skipping');
          allVerseEntries.push('  // BG ' + chapter + '.' + verse + ' — empty API response, skipped');
          totalFailed++;
          continue;
        }

        const translations = Array.isArray(data.translations) ? data.translations : [];
        const commentaries = Array.isArray(data.commentaries) ? data.commentaries : [];

        const translation = pickBestTranslation(translations);
        const commentary = pickBestCommentary(commentaries);

        if (!translation) {
          console.error('\n⚠️  BG ' + chapter + '.' + verse + ' — no translation, skipping');
          allVerseEntries.push('  // BG ' + chapter + '.' + verse + ' — no translation, skipped');
          totalFailed++;
          continue;
        }

        const fullText = [translation, commentary, data.word_meanings]
          .filter(Boolean)
          .join(' ');
        const keywords = extractKeywords(fullText);

        allVerseEntries.push(buildVerseEntry(chapter, verse, data, translation, commentary, keywords));
        totalFetched++;

        if (verse % 10 === 0 || verse === verseCount) {
          process.stdout.write('\r   ' + verse + '/' + verseCount + ' verses fetched');
        }

        await new Promise((r) => setTimeout(r, 80));

      } catch (err) {
        console.error('\n❌ Failed BG ' + chapter + '.' + verse + ': ' + err);
        allVerseEntries.push('  // BG ' + chapter + '.' + verse + ' — fetch error, skipped');
        totalFailed++;
      }
    }
  }

  // ─── Write output file ────────────────────────────────────────────────────

  const header = [
    '// data/gitaVerses.ts',
    '// AUTO-GENERATED by scripts/fetchGitaVerses.ts',
    '// Source: https://rapidapi.com/bhagavad-gita-bhagavad-gita-default/api/bhagavad-gita3',
    '// Generated: ' + new Date().toISOString(),
    '// Verses: ' + totalFetched + ' fetched, ' + totalFailed + ' skipped',
    '',
    "import { GitaVerseData } from '../types';",
    '',
    'export const gitaVerses: GitaVerseData[] = [',
  ].join('\n');

  const footer = '\n];\n';

  const fileContent = header + '\n' + allVerseEntries.join('\n\n') + footer;

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, fileContent, 'utf-8');

  console.log('\n\n✅ Generated: ' + OUTPUT_PATH);
  console.log('📊 Fetched: ' + totalFetched + '/' + totalVerses + ' | Skipped: ' + totalFailed);
  console.log('\n🚀 Next steps:');
  console.log('   npm run seed:gita');
  console.log('   npm run ingest');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});