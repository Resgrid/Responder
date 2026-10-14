import { useCallback } from 'react';

import { useRecordsStore } from '@/stores/records/store';
import { definitionTermKey, recordTypeTermKey, terminologyStore } from '@/stores/terminology/store';

const RECORD_TYPE_TERM_PREFIX = 'record-type.';

// "record-type.unit-activity" -> "Unit activity": the last resort for a built-in type nothing else names.
const nameFromTermKey = (termKey: string): string => {
  const words = termKey
    .substring(RECORD_TYPE_TERM_PREFIX.length)
    .replace(/[-_.]+/g, ' ')
    .trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : termKey;
};

export type RecordDefinitionNameResolver = (definitionKey: string | null | undefined, knownName?: string | null, recordType?: number | null) => string | null;

/**
 * Names a record's definition: the department's own word for a built-in type, else `knownName`, else the
 * catalog's name for it. A built-in ("system.*") key is never returned raw; null only when there is no key.
 */
export const useRecordDefinitionNameResolver = (): RecordDefinitionNameResolver => {
  const names = terminologyStore((state) => state.names);
  const definitions = useRecordsStore((state) => state.catalog?.Definitions);

  return useCallback(
    (definitionKey, knownName, recordType) => {
      const termKey = definitionTermKey(definitionKey) ?? recordTypeTermKey(recordType);
      const renamed = termKey ? names[termKey] : undefined;
      if (renamed) {
        return renamed;
      }
      if (knownName) {
        return knownName;
      }
      const key = definitionKey?.toLowerCase();
      const catalogName = key ? definitions?.find((entry) => entry.DefinitionKey.toLowerCase() === key)?.Name : undefined;
      if (catalogName) {
        return catalogName;
      }
      if (termKey) {
        return nameFromTermKey(termKey);
      }
      return definitionKey || null;
    },
    [names, definitions]
  );
};

export const useRecordDefinitionName = (definitionKey: string | null | undefined, knownName?: string | null, recordType?: number | null): string | null =>
  useRecordDefinitionNameResolver()(definitionKey, knownName, recordType);
