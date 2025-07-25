import { renderHook } from '@testing-library/react-native';
import { useDispatchStore } from '../store';

describe('useDispatchStore', () => {
  it('should initialize without errors', () => {
    const { result } = renderHook(() => useDispatchStore());
    expect(result.current).toBeDefined();
  });

  it('should have basic properties', () => {
    const { result } = renderHook(() => useDispatchStore());
    expect(typeof result.current).toBe('object');
  });
});
