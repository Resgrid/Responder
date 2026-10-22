import { act, renderHook } from '@testing-library/react-native';

import { getRecipients } from '@/api/messaging/messages';

import { useDispatchStore } from '../store';

jest.mock('@/api/messaging/messages', () => ({
  getRecipients: jest.fn(),
}));

const mockGetRecipients = getRecipients as jest.MockedFunction<typeof getRecipients>;

describe('useDispatchStore', () => {
  it('should initialize without errors', () => {
    const { result } = renderHook(() => useDispatchStore());
    expect(result.current).toBeDefined();
  });

  it('should have basic properties', () => {
    const { result } = renderHook(() => useDispatchStore());
    expect(typeof result.current).toBe('object');
  });

  it('keeps the unit type icon fields on unit recipients', async () => {
    const url = 'https://api.resgrid.dev/api/v4/UnitTypeIcons/abc';
    mockGetRecipients.mockResolvedValue({
      Data: [
        { Id: 'U:7', Type: 'Unit', Name: 'Medic 7', Selected: false, TypeIconUrl: url, TypeMapIcon: 'ambulance' },
        { Id: 'U:8', Type: 'Unit', Name: 'Engine 8', Selected: false },
        { Id: 'P:abc', Type: 'Personnel', Name: 'Jane Doe', Selected: false },
      ],
    } as any);

    await act(async () => {
      await useDispatchStore.getState().fetchDispatchData();
    });

    const { units, users } = useDispatchStore.getState().data;
    expect(units).toEqual([expect.objectContaining({ Id: '7', Name: 'Medic 7', TypeIconUrl: url, TypeMapIcon: 'ambulance' }), expect.objectContaining({ Id: '8', Name: 'Engine 8' })]);
    // Older servers omit the fields; the picker then shows the name alone.
    expect(units[1].TypeIconUrl).toBeUndefined();
    expect(users).toEqual([expect.objectContaining({ Id: 'abc', Name: 'Jane Doe' })]);
  });
});
