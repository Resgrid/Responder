import fs from 'fs';
import path from 'path';
const root = path.resolve(__dirname, '../../../translations');
const locales = ['en','de','el','es','fr','it','pl','sv','uk','ar'];
const read = (language: string): Record<string, Record<string,string>> => JSON.parse(fs.readFileSync(path.join(root, `${language}.json`),'utf8')).checklists;
const keys = (values: ReturnType<typeof read>) => Object.entries(values).flatMap(([section, values]) => Object.keys(values).map(key => `${section}.${key}`)).sort();
it.each(locales)('provides the full checklist dictionary in %s without encoding corruption or placeholders', language => {
 const translated = read(language); expect(keys(translated)).toEqual(keys(read('en')));
 for (const values of Object.values(translated)) for (const text of Object.values(values)) { expect(text.trim()).not.toBe(''); expect(text).not.toMatch(/\uFFFD|TODO|TRANSLATE_ME/); }
 if (language !== 'en') { expect(translated.ui.queued).not.toBe(read('en').ui.queued); expect(translated.errors.locked).not.toBe(read('en').errors.locked); }
});
