import { renderHook } from '@testing-library/react-native';

import { useSecurityStore } from '@/stores/security/store';

// Mock the security API
jest.mock('@/api/security/security', () => ({
  getCurrentUsersRights: jest.fn(),
}));

// Mock storage
jest.mock('../../../lib/storage', () => ({
  zustandStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

describe('Security Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the security store
    const { securityStore } = require('@/stores/security/store');
    securityStore.setState({
      error: null,
      rights: null,
    });
  });

  describe('Call Creation Permissions', () => {
    it('should allow call creation when user has CanCreateCalls permission', () => {
      const { securityStore } = require('@/stores/security/store');
      
      // Set rights with call creation permission
      securityStore.setState({
        rights: {
          DepartmentName: 'Test Department',
          DepartmentCode: 'TEST',
          FullName: 'Test User',
          EmailAddress: 'test@test.com',
          DepartmentId: '1',
          IsAdmin: false,
          CanViewPII: false,
          CanCreateCalls: true, // User CAN create calls
          CanAddNote: false,
          CanCreateMessage: false,
          Groups: [],
        },
      });

      const { result } = renderHook(() => useSecurityStore());

      // Verify the user can create calls
      expect(result.current.canUserCreateCalls).toBe(true);
    });

    it('should prevent call creation when user lacks CanCreateCalls permission', () => {
      const { securityStore } = require('@/stores/security/store');
      
      // Set rights without call creation permission
      securityStore.setState({
        rights: {
          DepartmentName: 'Test Department',
          DepartmentCode: 'TEST',
          FullName: 'Test User',
          EmailAddress: 'test@test.com',
          DepartmentId: '1',
          IsAdmin: false,
          CanViewPII: false,
          CanCreateCalls: false, // User CANNOT create calls
          CanAddNote: false,
          CanCreateMessage: false,
          Groups: [],
        },
      });

      const { result } = renderHook(() => useSecurityStore());

      // Verify the user cannot create calls
      expect(result.current.canUserCreateCalls).toBe(false);
    });

    it('should allow call creation for department admins even without explicit permission', () => {
      const { securityStore } = require('@/stores/security/store');
      
      // Set rights with admin but no explicit call creation permission
      securityStore.setState({
        rights: {
          DepartmentName: 'Test Department',
          DepartmentCode: 'TEST',
          FullName: 'Admin User',
          EmailAddress: 'admin@test.com',
          DepartmentId: '1',
          IsAdmin: true, // User is admin
          CanViewPII: true,
          CanCreateCalls: false, // Explicit permission is false
          CanAddNote: true,
          CanCreateMessage: true,
          Groups: [],
        },
      });

      const { result } = renderHook(() => useSecurityStore());

      // Verify admin status
      expect(result.current.isUserDepartmentAdmin).toBe(true);
      // Note: The requirement is for CanCreateCalls specifically, 
      // not admin override, so this should be false
      expect(result.current.canUserCreateCalls).toBe(false);
    });
  });

  describe('Group Admin Permissions', () => {
    it('should correctly identify group admin status', () => {
      const { securityStore } = require('@/stores/security/store');
      
      securityStore.setState({
        rights: {
          DepartmentName: 'Test Department',
          DepartmentCode: 'TEST',
          FullName: 'Group Admin',
          EmailAddress: 'groupadmin@test.com',
          DepartmentId: '1',
          IsAdmin: false,
          CanViewPII: false,
          CanCreateCalls: true,
          CanAddNote: false,
          CanCreateMessage: false,
          Groups: [
            { GroupId: 1, IsGroupAdmin: true },
            { GroupId: 2, IsGroupAdmin: false },
          ],
        },
      });

      const { result } = renderHook(() => useSecurityStore());

      expect(result.current.isUserGroupAdmin(1)).toBe(true);
      expect(result.current.isUserGroupAdmin(2)).toBe(false);
      expect(result.current.isUserGroupAdmin(999)).toBe(false);
    });
  });

  describe('Multiple Permissions Integration', () => {
    it('should handle all permission types correctly for a super user', () => {
      const { securityStore } = require('@/stores/security/store');
      
      securityStore.setState({
        rights: {
          DepartmentName: 'Test Department',
          DepartmentCode: 'SUPER',
          FullName: 'Super User',
          EmailAddress: 'super@test.com',
          DepartmentId: '1',
          IsAdmin: true,
          CanViewPII: true,
          CanCreateCalls: true,
          CanAddNote: true,
          CanCreateMessage: true,
          Groups: [
            { GroupId: 1, IsGroupAdmin: true },
            { GroupId: 2, IsGroupAdmin: true },
          ],
        },
      });

      const { result } = renderHook(() => useSecurityStore());

      // Verify all permissions
      expect(result.current.isUserDepartmentAdmin).toBe(true);
      expect(result.current.canUserCreateCalls).toBe(true);
      expect(result.current.canUserCreateNotes).toBe(true);
      expect(result.current.canUserCreateMessages).toBe(true);
      expect(result.current.canUserViewPII).toBe(true);
      expect(result.current.departmentCode).toBe('SUPER');
      expect(result.current.isUserGroupAdmin(1)).toBe(true);
      expect(result.current.isUserGroupAdmin(2)).toBe(true);
    });

    it('should handle all permission types correctly for a restricted user', () => {
      const { securityStore } = require('@/stores/security/store');
      
      securityStore.setState({
        rights: {
          DepartmentName: 'Test Department',
          DepartmentCode: 'RESTRICTED',
          FullName: 'Restricted User',
          EmailAddress: 'restricted@test.com',
          DepartmentId: '1',
          IsAdmin: false,
          CanViewPII: false,
          CanCreateCalls: false,
          CanAddNote: false,
          CanCreateMessage: false,
          Groups: [
            { GroupId: 1, IsGroupAdmin: false },
          ],
        },
      });

      const { result } = renderHook(() => useSecurityStore());

      // Verify all permissions are false
      expect(result.current.isUserDepartmentAdmin).toBe(false);
      expect(result.current.canUserCreateCalls).toBe(false);
      expect(result.current.canUserCreateNotes).toBe(false);
      expect(result.current.canUserCreateMessages).toBe(false);
      expect(result.current.canUserViewPII).toBe(false);
      expect(result.current.departmentCode).toBe('RESTRICTED');
      expect(result.current.isUserGroupAdmin(1)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined rights gracefully', () => {
      const { result } = renderHook(() => useSecurityStore());

      // All values should be undefined when rights are not set
      expect(result.current.isUserDepartmentAdmin).toBeUndefined();
      expect(result.current.canUserCreateCalls).toBeUndefined();
      expect(result.current.canUserCreateNotes).toBeUndefined();
      expect(result.current.canUserCreateMessages).toBeUndefined();
      expect(result.current.canUserViewPII).toBeUndefined();
      expect(result.current.departmentCode).toBeUndefined();
    });

    it('should handle empty groups array', () => {
      const { securityStore } = require('@/stores/security/store');
      
      securityStore.setState({
        rights: {
          DepartmentName: 'Test Department',
          DepartmentCode: 'TEST',
          FullName: 'No Groups User',
          EmailAddress: 'nogroups@test.com',
          DepartmentId: '1',
          IsAdmin: false,
          CanViewPII: false,
          CanCreateCalls: true,
          CanAddNote: false,
          CanCreateMessage: false,
          Groups: [], // Empty groups
        },
      });

      const { result } = renderHook(() => useSecurityStore());

      expect(result.current.isUserGroupAdmin(1)).toBe(false);
      expect(result.current.isUserGroupAdmin(999)).toBe(false);
    });
  });
});
