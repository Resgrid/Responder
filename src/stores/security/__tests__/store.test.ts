import { renderHook } from '@testing-library/react-native';

import { securityStore, useSecurityStore } from '../store';

// Mock the API
jest.mock('@/api/security/security', () => ({
  getCurrentUsersRights: jest.fn(),
}));

// Mock the storage
jest.mock('../../../lib/storage', () => ({
  zustandStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const { getCurrentUsersRights } = require('@/api/security/security');

describe('Security Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the store
    securityStore.setState({
      error: null,
      rights: null,
    });
  });

  describe('useSecurityStore', () => {
    it('should return default values when no rights are set', () => {
      const { result } = renderHook(() => useSecurityStore());

      expect(result.current.isUserDepartmentAdmin).toBeUndefined();
      expect(result.current.canUserCreateCalls).toBeUndefined();
      expect(result.current.canUserCreateNotes).toBeUndefined();
      expect(result.current.canUserCreateMessages).toBeUndefined();
      expect(result.current.canUserViewPII).toBeUndefined();
      expect(result.current.departmentCode).toBeUndefined();
    });

    it('should return correct values when rights are set', () => {
      const mockRights = {
        DepartmentName: 'Test Department',
        DepartmentCode: 'TEST123',
        FullName: 'John Doe',
        EmailAddress: 'john@test.com',
        DepartmentId: '1',
        IsAdmin: true,
        CanViewPII: true,
        CanCreateCalls: true,
        CanAddNote: true,
        CanCreateMessage: true,
        Groups: [
          { GroupId: 1, IsGroupAdmin: true },
          { GroupId: 2, IsGroupAdmin: false },
        ],
      };

      securityStore.setState({ rights: mockRights });

      const { result } = renderHook(() => useSecurityStore());

      expect(result.current.isUserDepartmentAdmin).toBe(true);
      expect(result.current.canUserCreateCalls).toBe(true);
      expect(result.current.canUserCreateNotes).toBe(true);
      expect(result.current.canUserCreateMessages).toBe(true);
      expect(result.current.canUserViewPII).toBe(true);
      expect(result.current.departmentCode).toBe('TEST123');
    });

    it('should correctly identify group admins', () => {
      const mockRights = {
        DepartmentName: 'Test Department',
        DepartmentCode: 'TEST123',
        FullName: 'John Doe',
        EmailAddress: 'john@test.com',
        DepartmentId: '1',
        IsAdmin: false,
        CanViewPII: false,
        CanCreateCalls: false,
        CanAddNote: false,
        CanCreateMessage: false,
        Groups: [
          { GroupId: 1, IsGroupAdmin: true },
          { GroupId: 2, IsGroupAdmin: false },
          { GroupId: 3, IsGroupAdmin: true },
        ],
      };

      securityStore.setState({ rights: mockRights });

      const { result } = renderHook(() => useSecurityStore());

      expect(result.current.isUserGroupAdmin(1)).toBe(true);
      expect(result.current.isUserGroupAdmin(2)).toBe(false);
      expect(result.current.isUserGroupAdmin(3)).toBe(true);
      expect(result.current.isUserGroupAdmin(999)).toBe(false);
    });

    it('should handle false permissions correctly', () => {
      const mockRights = {
        DepartmentName: 'Test Department',
        DepartmentCode: 'TEST123',
        FullName: 'John Doe',
        EmailAddress: 'john@test.com',
        DepartmentId: '1',
        IsAdmin: false,
        CanViewPII: false,
        CanCreateCalls: false,
        CanAddNote: false,
        CanCreateMessage: false,
        Groups: [],
      };

      securityStore.setState({ rights: mockRights });

      const { result } = renderHook(() => useSecurityStore());

      expect(result.current.isUserDepartmentAdmin).toBe(false);
      expect(result.current.canUserCreateCalls).toBe(false);
      expect(result.current.canUserCreateNotes).toBe(false);
      expect(result.current.canUserCreateMessages).toBe(false);
      expect(result.current.canUserViewPII).toBe(false);
    });
  });

  describe('getRights', () => {
    it('should fetch and set rights successfully', async () => {
      const mockRights = {
        DepartmentName: 'Test Department',
        DepartmentCode: 'TEST123',
        FullName: 'John Doe',
        EmailAddress: 'john@test.com',
        DepartmentId: '1',
        IsAdmin: true,
        CanViewPII: true,
        CanCreateCalls: true,
        CanAddNote: true,
        CanCreateMessage: true,
        Groups: [],
      };

      getCurrentUsersRights.mockResolvedValue({
        Data: mockRights,
      });

      const store = securityStore.getState();
      await store.getRights();

      const newState = securityStore.getState();
      expect(newState.rights).toEqual(mockRights);
      expect(getCurrentUsersRights).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors gracefully', async () => {
      getCurrentUsersRights.mockRejectedValue(new Error('API Error'));

      const store = securityStore.getState();
      
      // This should not throw
      await expect(store.getRights()).resolves.toBeUndefined();
      
      // Rights should remain null on error
      const newState = securityStore.getState();
      expect(newState.rights).toBeNull();
    });
  });

  describe('Security Permissions Integration', () => {
    it('should correctly handle all permission combinations', () => {
      const testCases = [
        {
          name: 'Admin with all permissions',
          rights: {
            IsAdmin: true,
            CanViewPII: true,
            CanCreateCalls: true,
            CanAddNote: true,
            CanCreateMessage: true,
            Groups: [{ GroupId: 1, IsGroupAdmin: true }],
          },
          expected: {
            isUserDepartmentAdmin: true,
            canUserCreateCalls: true,
            canUserCreateNotes: true,
            canUserCreateMessages: true,
            canUserViewPII: true,
            isGroupAdmin1: true,
          },
        },
        {
          name: 'Regular user with limited permissions',
          rights: {
            IsAdmin: false,
            CanViewPII: false,
            CanCreateCalls: true,
            CanAddNote: false,
            CanCreateMessage: false,
            Groups: [{ GroupId: 1, IsGroupAdmin: false }],
          },
          expected: {
            isUserDepartmentAdmin: false,
            canUserCreateCalls: true,
            canUserCreateNotes: false,
            canUserCreateMessages: false,
            canUserViewPII: false,
            isGroupAdmin1: false,
          },
        },
        {
          name: 'User with no permissions',
          rights: {
            IsAdmin: false,
            CanViewPII: false,
            CanCreateCalls: false,
            CanAddNote: false,
            CanCreateMessage: false,
            Groups: [],
          },
          expected: {
            isUserDepartmentAdmin: false,
            canUserCreateCalls: false,
            canUserCreateNotes: false,
            canUserCreateMessages: false,
            canUserViewPII: false,
            isGroupAdmin1: false,
          },
        },
      ];

      testCases.forEach(({ name, rights, expected }) => {
        // Set the rights
        securityStore.setState({
          rights: {
            DepartmentName: 'Test',
            DepartmentCode: 'TEST',
            FullName: 'Test User',
            EmailAddress: 'test@test.com',
            DepartmentId: '1',
            ...rights,
          },
        });

        const { result } = renderHook(() => useSecurityStore());

        expect(result.current.isUserDepartmentAdmin).toBe(expected.isUserDepartmentAdmin);
        expect(result.current.canUserCreateCalls).toBe(expected.canUserCreateCalls);
        expect(result.current.canUserCreateNotes).toBe(expected.canUserCreateNotes);
        expect(result.current.canUserCreateMessages).toBe(expected.canUserCreateMessages);
        expect(result.current.canUserViewPII).toBe(expected.canUserViewPII);
        expect(result.current.isUserGroupAdmin(1)).toBe(expected.isGroupAdmin1);
      });
    });
  });
});
