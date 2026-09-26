import { getActivityLinkKind, StatusDestinationSources } from '@/lib/activity-link-kind';

describe('getActivityLinkKind', () => {
  it.each([StatusDestinationSources.CarryForward, StatusDestinationSources.Dispatch, StatusDestinationSources.Unit])('marks source %s as auto-linked', (source) => {
    expect(getActivityLinkKind(source)).toBe('auto');
  });

  it('marks source 5 as inferred', () => {
    expect(getActivityLinkKind(StatusDestinationSources.Inferred)).toBe('inferred');
  });

  it('matches the server enum values', () => {
    expect([getActivityLinkKind(1), getActivityLinkKind(2), getActivityLinkKind(3), getActivityLinkKind(4), getActivityLinkKind(5)]).toEqual([null, 'auto', 'auto', 'auto', 'inferred']);
  });

  it.each([
    ['explicit', StatusDestinationSources.Explicit],
    ['null', null],
    ['undefined', undefined],
    ['zero', 0],
    ['an unknown future value', 99],
  ])('shows nothing for %s', (_label, source) => {
    expect(getActivityLinkKind(source)).toBeNull();
  });
});
