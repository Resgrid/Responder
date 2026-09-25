import { hasWidgetTarget } from '../withLiveActivities';

interface TargetLookup {
  pbxTargetByName: (name: string) => object | null;
}

const projectWithTarget = (comment: string): TargetLookup => ({
  pbxTargetByName: (name: string) => (name === comment ? {} : null),
});

describe('hasWidgetTarget', () => {
  it('finds the widget target in a project parsed from disk', () => {
    expect(hasWidgetTarget(projectWithTarget('CheckInTimerWidget'))).toBe(true);
  });

  it('finds the widget target just added in memory', () => {
    expect(hasWidgetTarget(projectWithTarget('"CheckInTimerWidget"'))).toBe(true);
  });

  it('reports a project without the widget target', () => {
    expect(hasWidgetTarget(projectWithTarget('ResgridResponder'))).toBe(false);
  });
});
