import { create } from 'zustand';

import { getAllGroups } from '@/api/groups/groups';
import { getRecipients } from '@/api/messaging/messages';
import { getAllPersonnelInfos } from '@/api/personnel/personnel';
import { getAllUnitRolesAndAssignmentsForDepartment } from '@/api/units/unitRoles';
import { getUnits } from '@/api/units/units';
import { type GroupResultData } from '@/models/v4/groups/groupsResultData';
import { type RecipientsResultData } from '@/models/v4/messages/recipientsResultData';
import { type PersonnelInfoResultData } from '@/models/v4/personnel/personnelInfoResultData';
import { type UnitRoleResultData } from '@/models/v4/unitRoles/unitRoleResultData';
import { type UnitResultData } from '@/models/v4/units/unitResultData';

export interface DispatchSelection {
  everyone: boolean;
  users: string[];
  groups: string[];
  roles: string[];
  units: string[];
}

export interface DispatchData {
  users: RecipientsResultData[];
  groups: RecipientsResultData[];
  roles: RecipientsResultData[];
  units: RecipientsResultData[];
}

interface DispatchState {
  data: DispatchData;
  selection: DispatchSelection;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  fetchDispatchData: () => Promise<void>;
  refreshDispatchData: () => Promise<void>; // Force refresh without cache
  setSelection: (selection: DispatchSelection) => void;
  toggleEveryone: () => void;
  toggleUser: (userId: string) => void;
  toggleGroup: (groupId: string) => void;
  toggleRole: (roleId: string) => void;
  toggleUnit: (unitId: string) => void;
  setSearchQuery: (query: string) => void;
  clearSelection: () => void;
  getFilteredData: () => DispatchData;
}

const initialSelection: DispatchSelection = {
  everyone: false,
  users: [],
  groups: [],
  roles: [],
  units: [],
};

export const useDispatchStore = create<DispatchState>((set, get) => ({
  data: {
    users: [],
    groups: [],
    roles: [],
    units: [],
  },
  selection: initialSelection,
  isLoading: false,
  error: null,
  searchQuery: '',

  fetchDispatchData: async () => {
    set({ isLoading: true, error: null });
    try {
      const recipients = await getRecipients(false, true);

      // Check if Data is properly defined
      if (!recipients || !recipients.Data || !Array.isArray(recipients.Data)) {
        if (__DEV__) {
          console.error('Invalid recipients data structure - missing or invalid Data array');
        }
        set({
          error: 'Invalid data structure received from API',
          isLoading: false,
        });
        return;
      }

      if (__DEV__) {
        console.log(`Successfully fetched ${recipients.Data.length} recipients from API`);
      }

      // Initialize arrays for categorized recipients
      const categorizedUsers: RecipientsResultData[] = [];
      const categorizedGroups: RecipientsResultData[] = [];
      const categorizedRoles: RecipientsResultData[] = [];
      const categorizedUnits: RecipientsResultData[] = [];

      // Categorize recipients based on Type field with both exact and flexible matching
      recipients.Data.forEach((recipient) => {
        if (!recipient || !recipient.Type || !recipient.Name || !recipient.Id) {
          if (__DEV__) {
            console.warn('Skipping invalid recipient - missing required fields');
          }
          return;
        }

        // First try exact matching (as per the test data)
        if (recipient.Type === 'Personnel') {
          categorizedUsers.push(recipient);
        } else if (recipient.Type === 'Groups') {
          categorizedGroups.push(recipient);
        } else if (recipient.Type === 'Roles') {
          categorizedRoles.push(recipient);
        } else if (recipient.Type === 'Unit') {
          categorizedUnits.push(recipient);
        } else {
          // Fallback to case-insensitive matching
          const type = recipient.Type.toLowerCase().trim();
          if (type === 'personnel' || type === 'user' || type === 'users') {
            categorizedUsers.push(recipient);
          } else if (type === 'groups' || type === 'group') {
            categorizedGroups.push(recipient);
          } else if (type === 'roles' || type === 'role') {
            categorizedRoles.push(recipient);
          } else if (type === 'unit' || type === 'units') {
            categorizedUnits.push(recipient);
          } else {
            // Log unknown types for debugging
            if (__DEV__) {
              console.warn(`Unknown recipient type: '${recipient.Type}'`);
            }
          }
        }
      });

      if (__DEV__) {
        console.log(`Categorized recipients: Users: ${categorizedUsers.length}, Groups: ${categorizedGroups.length}, Roles: ${categorizedRoles.length}, Units: ${categorizedUnits.length}`);
      }

      // Only log if we have issues with categorization
      const totalCategorized = categorizedUsers.length + categorizedGroups.length + categorizedRoles.length + categorizedUnits.length;
      if (totalCategorized === 0 && recipients.Data.length > 0) {
        if (__DEV__) {
          console.warn('No recipients were successfully categorized!');
          console.warn('Available recipient types:', [...new Set(recipients.Data.map((r) => r.Type))]);
        }
      }

      set({
        data: {
          users: categorizedUsers,
          groups: categorizedGroups,
          roles: categorizedRoles,
          units: categorizedUnits,
        },
        isLoading: false,
      });
    } catch (error) {
      if (__DEV__) {
        console.error('Error fetching dispatch data:', error instanceof Error ? error.message : 'Unknown error');
      }
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch dispatch data',
        isLoading: false,
      });
    }
  },

  refreshDispatchData: async () => {
    // Force fresh data fetch
    const { fetchDispatchData } = get();
    return fetchDispatchData();
  },

  setSelection: (selection: DispatchSelection) => {
    set({ selection });
  },

  toggleEveryone: () => {
    const { selection } = get();
    if (selection.everyone) {
      // If everyone was selected, deselect it
      set({
        selection: {
          ...selection,
          everyone: false,
        },
      });
    } else {
      // If everyone wasn't selected, select it and clear all others
      set({
        selection: {
          everyone: true,
          users: [],
          groups: [],
          roles: [],
          units: [],
        },
      });
    }
  },

  toggleUser: (userId: string) => {
    const { selection } = get();
    const isSelected = selection.users.includes(userId);

    set({
      selection: {
        ...selection,
        everyone: false, // Deselect everyone when selecting specific items
        users: isSelected ? selection.users.filter((id) => id !== userId) : [...selection.users, userId],
      },
    });
  },

  toggleGroup: (groupId: string) => {
    const { selection } = get();
    const isSelected = selection.groups.includes(groupId);

    set({
      selection: {
        ...selection,
        everyone: false, // Deselect everyone when selecting specific items
        groups: isSelected ? selection.groups.filter((id) => id !== groupId) : [...selection.groups, groupId],
      },
    });
  },

  toggleRole: (roleId: string) => {
    const { selection } = get();
    const isSelected = selection.roles.includes(roleId);

    set({
      selection: {
        ...selection,
        everyone: false, // Deselect everyone when selecting specific items
        roles: isSelected ? selection.roles.filter((id) => id !== roleId) : [...selection.roles, roleId],
      },
    });
  },

  toggleUnit: (unitId: string) => {
    const { selection } = get();
    const isSelected = selection.units.includes(unitId);

    set({
      selection: {
        ...selection,
        everyone: false, // Deselect everyone when selecting specific items
        units: isSelected ? selection.units.filter((id) => id !== unitId) : [...selection.units, unitId],
      },
    });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  clearSelection: () => {
    set({ selection: initialSelection });
  },

  getFilteredData: () => {
    const { data, searchQuery } = get();
    if (!searchQuery.trim()) {
      return data;
    }

    const query = searchQuery.toLowerCase();
    return {
      users: data.users.filter((user) => user.Name.toLowerCase().includes(query)),
      groups: data.groups.filter((group) => group.Name.toLowerCase().includes(query)),
      roles: data.roles.filter((role) => role.Name.toLowerCase().includes(query)),
      units: data.units.filter((unit) => unit.Name.toLowerCase().includes(query)),
    };
  },
}));
