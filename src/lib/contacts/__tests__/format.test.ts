import { htmlToText, parseCoordinates, safeFileName, withoutRedacted } from '@/lib/contacts/format';
import { type ContactResultData, ContactType } from '@/models/v4/contacts/contactResultData';

it('turns web-editor rich text into readable plain text', () => {
  expect(htmlToText('<p>Knox box at <b>north</b> door</p><p>Gate &amp; code</p><ul><li>Hydrant</li></ul><script>alert(1)</script>')).toBe('Knox box at north door\nGate & code\n• Hydrant');
  expect(htmlToText(null)).toBe('');
});

it('does not let a stripped tag splice a new one together', () => {
  expect(htmlToText('<scr<script>x</script>ipt>alert(1)</script>Safe')).toBe('Safe');
  expect(htmlToText('a <<b>script>b')).toBe('a script>b');
  expect(htmlToText('Gate code 1 &lt; 2<script')).toBe('Gate code 1 < 2script');
});

it('parses coordinates so a point routes as a point and anything else as an address', () => {
  expect(parseCoordinates('39.7392, -104.9903')).toEqual({ latitude: 39.7392, longitude: -104.9903 });
  expect(parseCoordinates('not a place')).toBeNull();
  expect(parseCoordinates('95, 10')).toBeNull();
});

it('removes withheld values and names the fields so the sheet never shows or dials the sentinel', () => {
  const contact = { ContactId: 'c-1', ContactType: ContactType.Person, FirstName: 'Ana', CellPhoneNumber: 'REDACTED', Email: 'REDACTED', IsDeleted: false } as unknown as ContactResultData;
  const shown = withoutRedacted(contact);
  expect(shown.CellPhoneNumber).toBeUndefined();
  expect(shown.Email).toBeUndefined();
  expect(shown.FirstName).toBe('Ana');
  expect(shown.WithheldFields).toEqual(['CellPhoneNumber', 'Email']);
  expect(contact.CellPhoneNumber).toBe('REDACTED');
});

it('reduces a server-supplied file name to one plain name in the target folder', () => {
  expect(safeFileName('Site plan (rev 2).pdf', 'fallback')).toBe('Site plan _rev 2_.pdf');
  expect(safeFileName('../../Library/Preferences/app.plist', 'fallback')).toBe('_.._Library_Preferences_app.plist');
  expect(safeFileName('..', 'fallback')).toBe('fallback');
  expect(safeFileName('a\\b/c', 'fallback')).toBe('a_b_c');
  expect(safeFileName(null, 'fallback')).toBe('fallback');
  expect(safeFileName('x'.repeat(300), 'fallback')).toHaveLength(120);
});
