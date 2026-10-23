import { MAP_ICONS, type MapIconKey, resolveMapIconKey } from '../map-icons';

// The resolution before keys containing "_" were matched by their exact name: every separator was removed first, so
// "Person_RespondingCall" became "personrespondingcall", matched no key, and drew the fallback (the call icon).
const legacyResolveMapIconKey = ({ poiImage, imagePath, marker, fallback = 'call' }: { poiImage?: string | null; imagePath?: string | null; marker?: string | null; fallback?: MapIconKey }): MapIconKey => {
  const keys = new Set<string>(Object.keys(MAP_ICONS));
  const tokens = [poiImage, imagePath, marker]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) =>
      (value.toLowerCase().startsWith('map-icon-') ? value.slice(9) : value)
        .trim()
        .toLowerCase()
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/[^a-z0-9]+/g, '')
    );

  for (const token of tokens) {
    if (keys.has(token)) {
      return token as MapIconKey;
    }
  }

  return fallback;
};

const ALL_KEYS = Object.keys(MAP_ICONS) as MapIconKey[];
const UNDERSCORE_KEYS = ALL_KEYS.filter((key) => key.includes('_'));

const pascal = (key: string) => key.replace(/(^|_)([a-z])/g, (_match, separator: string, letter: string) => `${separator}${letter.toUpperCase()}`);

// The spellings a name can arrive in: as is, upper/Pascal case, padded, with a "map-icon-" prefix or a file extension.
const spellings = (name: string) => [name, name.toUpperCase(), pascal(name), `  ${name}  `, `map-icon-${name}`, `MAP-ICON-${pascal(name)}`, `${name}.png`, `${pascal(name)}.PNG`];

// ImagePath values the Core map API sends for non-POI pins, plus separator variants and names that match nothing.
const CORE_IMAGE_PATHS = ['Call', 'Station', 'hydrant', 'Engine_Responding', 'Person_RespondingCall', 'caraccident', 'firstaid', 'ambulance', 'cartwo', 'fourbyfour'];
const OTHER_NAMES = ['Car Two', 'car-two', 'Car_Two', 'four-by-four', 'Tree Down', 'map-icon-fire-station', 'unknown', 'person_unknown', 'engine', 'rescue', '', '   ', '.png'];

const CORPUS = [...ALL_KEYS.flatMap(spellings), ...CORE_IMAGE_PATHS.flatMap(spellings), ...OTHER_NAMES];

describe('resolveMapIconKey', () => {
  it('resolves the names the Core map API sends for personnel and default unit pins', () => {
    expect(resolveMapIconKey({ imagePath: 'Person_RespondingCall' })).toBe('person_respondingcall');
    expect(resolveMapIconKey({ imagePath: 'Engine_Responding' })).toBe('engine_responding');
  });

  it.each([
    ['Person_Available', 'person_available'],
    ['Person_OnScene', 'person_onscene'],
    ['Person_RespondingCall', 'person_respondingcall'],
    ['Person_RespondingStation', 'person_respondingstation'],
    ['Engine_Available', 'engine_available'],
    ['Engine_Responding', 'engine_responding'],
    ['Rescue_Available', 'rescue_available'],
    ['Rescue_Responding', 'rescue_responding'],
  ])('resolves %s to the %s icon rather than the fallback', (imagePath, key) => {
    expect(resolveMapIconKey({ imagePath, fallback: 'call' })).toBe(key);
    expect(resolveMapIconKey({ imagePath, fallback: 'flag' })).toBe(key);
  });

  it.each(UNDERSCORE_KEYS)('resolves every spelling of the %s key, from any field', (key) => {
    for (const name of spellings(key)) {
      expect(resolveMapIconKey({ imagePath: name })).toBe(key);
      expect(resolveMapIconKey({ poiImage: name })).toBe(key);
      expect(resolveMapIconKey({ marker: name })).toBe(key);
    }
  });

  it('still needs the underscore: a "_" key with its separator removed or changed matches nothing', () => {
    expect(resolveMapIconKey({ imagePath: 'personrespondingcall', fallback: 'flag' })).toBe('flag');
    expect(resolveMapIconKey({ imagePath: 'Person-RespondingCall', fallback: 'flag' })).toBe('flag');
    expect(resolveMapIconKey({ imagePath: 'Engine Responding', fallback: 'flag' })).toBe('flag');
  });

  it('gives every single-field name that already resolved the same key as before', () => {
    for (const name of CORPUS) {
      for (const field of ['poiImage', 'imagePath', 'marker'] as const) {
        for (const fallback of ['call', 'flag'] as const) {
          const before = legacyResolveMapIconKey({ [field]: name, fallback });
          const after = resolveMapIconKey({ [field]: name, fallback });

          if (before !== fallback) {
            expect({ name, field, after }).toEqual({ name, field, after: before });
          } else if (after !== fallback) {
            // The only names that resolve now and did not before are the "_" keys.
            expect(UNDERSCORE_KEYS).toContain(after);
          }
        }
      }
    }
  });

  it('gives multi-field input that already resolved the same key as before when no field names a "_" key', () => {
    const names = [...ALL_KEYS.filter((key) => !key.includes('_')).flatMap(spellings), ...OTHER_NAMES];
    const sample = names.filter((_name, index) => index % 7 === 0);

    for (const poiImage of [undefined, ...sample]) {
      for (const imagePath of [undefined, ...sample]) {
        for (const marker of [undefined, 'map-icon-hospital', 'unknown']) {
          const before = legacyResolveMapIconKey({ poiImage, imagePath, marker });
          expect(resolveMapIconKey({ poiImage, imagePath, marker })).toBe(before);
        }
      }
    }
  });

  it('keeps field priority: the first field that names an icon wins (poiImage, then imagePath, then marker)', () => {
    expect(resolveMapIconKey({ poiImage: 'map-icon-hospital', imagePath: 'Person_Available' })).toBe('hospital');
    expect(resolveMapIconKey({ poiImage: 'unknown', imagePath: 'Person_Available', marker: 'flag' })).toBe('person_available');
    expect(resolveMapIconKey({ imagePath: 'unknown', marker: 'Engine_Available' })).toBe('engine_available');
  });

  it('returns the fallback for empty, missing or unknown names', () => {
    expect(resolveMapIconKey({})).toBe('call');
    expect(resolveMapIconKey({ imagePath: null, poiImage: undefined, marker: '' })).toBe('call');
    expect(resolveMapIconKey({ imagePath: '   ', fallback: 'flag' })).toBe('flag');
    expect(resolveMapIconKey({ imagePath: 'not-an-icon', fallback: 'flag' })).toBe('flag');
  });
});
