interface MockEndpoint {
  get: jest.Mock;
  post: jest.Mock;
}

// The module under test creates its endpoints at import time, so the registry lives inside the mock factory.
jest.mock('@/api/common/client', () => {
  const endpoints: Record<string, { get: jest.Mock; post: jest.Mock }> = {};
  return {
    __endpoints: endpoints,
    createApiEndpoint: (path: string) => {
      const api = { get: jest.fn(), post: jest.fn() };
      endpoints[path] = api;
      return api;
    },
  };
});

import { getCalendarItem, getCalendarItems, getCalendarItemsForDateRange, getCalendarItemTypes, setCalendarAttending } from '../calendar';

const mockEndpoints: Record<string, MockEndpoint> = jest.requireMock('@/api/common/client').__endpoints;

const endpoint = (path: string) => {
  const api = mockEndpoints[path];
  if (!api) throw new Error(`endpoint ${path} was not created`);
  return api;
};

describe('calendar api', () => {
  beforeEach(() => {
    Object.values(mockEndpoints).forEach((api) => {
      api.get.mockReset().mockResolvedValue({ data: { Data: [] } });
      api.post.mockReset().mockResolvedValue({ data: { Id: '' } });
    });
  });

  it('only creates routes that exist on the v4 Calendar controller', () => {
    expect(Object.keys(mockEndpoints).sort()).toEqual([
      '/Calendar/GetCalendarItem',
      '/Calendar/GetDepartmentCalendarItemTypes',
      '/Calendar/GetDepartmentCalendarItems',
      '/Calendar/GetDepartmentCalendarItemsInRange',
      '/Calendar/SetCalendarAttendingStatus',
    ]);
  });

  it('reads the department calendar items', async () => {
    await getCalendarItems();

    expect(endpoint('/Calendar/GetDepartmentCalendarItems').get).toHaveBeenCalledWith();
  });

  it('sends the calendar item id as id', async () => {
    await getCalendarItem('42');

    expect(endpoint('/Calendar/GetCalendarItem').get).toHaveBeenCalledWith({ id: '42' });
  });

  it('reads the department calendar item types', async () => {
    await getCalendarItemTypes();

    expect(endpoint('/Calendar/GetDepartmentCalendarItemTypes').get).toHaveBeenCalledWith();
  });

  it('sends the range as start and end with checklists', async () => {
    await getCalendarItemsForDateRange('2026-10-01T00:00:00.000Z', '2026-10-31T23:59:59.000Z');

    expect(endpoint('/Calendar/GetDepartmentCalendarItemsInRange').get).toHaveBeenCalledWith({
      start: '2026-10-01T00:00:00.000Z',
      end: '2026-10-31T23:59:59.000Z',
      includeChecklists: true,
    });
  });

  it('posts attendance as CalendarItemAttendInput', async () => {
    await setCalendarAttending({ calendarItemId: '42', attending: true, note: 'On my way' });
    await setCalendarAttending({ calendarItemId: '42', attending: false });

    expect(endpoint('/Calendar/SetCalendarAttendingStatus').post).toHaveBeenNthCalledWith(1, { CalendarEventId: '42', Type: 1, Note: 'On my way' });
    expect(endpoint('/Calendar/SetCalendarAttendingStatus').post).toHaveBeenNthCalledWith(2, { CalendarEventId: '42', Type: 4, Note: '' });
  });
});
