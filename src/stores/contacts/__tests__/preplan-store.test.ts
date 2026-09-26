import { getContactFiles } from '@/api/contacts/contactFiles';
import { getContactPreplan } from '@/api/contacts/contactPreplans';
import { type ContactFileResultData } from '@/models/v4/contactFiles/contactFilesResult';
import { type ContactPreplanData } from '@/models/v4/contacts/contactPreplanResult';

import { useContactPreplanStore } from '../preplan-store';

jest.mock('@/api/contacts/contactFiles', () => ({ getContactFiles: jest.fn() }));
jest.mock('@/api/contacts/contactPreplans', () => ({ getContactPreplan: jest.fn() }));
jest.mock('@/lib/logging', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

const mockGetContactPreplan = jest.mocked(getContactPreplan);
const mockGetContactFiles = jest.mocked(getContactFiles);

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
};

const preplan = (label: string) => ({ ContactId: 'c1', KnoxBoxLocation: label }) as unknown as ContactPreplanData;
const files = (name: string) => [{ Id: name, ContactId: 'c1', Name: name }] as unknown as ContactFileResultData[];

describe('useContactPreplanStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useContactPreplanStore.getState().reset();
  });

  it('keeps the newer pre-plan when a forced re-fetch overtakes the one before it', async () => {
    const older = deferred<{ Data: ContactPreplanData }>();
    mockGetContactPreplan.mockImplementationOnce(() => older.promise as never);
    mockGetContactPreplan.mockResolvedValueOnce({ Data: preplan('REDACTED') } as never);

    const olderFetch = useContactPreplanStore.getState().fetchPreplan('c1');
    await useContactPreplanStore.getState().fetchPreplan('c1', true);
    older.resolve({ Data: preplan('North door') });
    await olderFetch;

    expect(useContactPreplanStore.getState().preplans.c1).toEqual(preplan('REDACTED'));
    expect(useContactPreplanStore.getState().loadingPreplan.c1).toBe(false);
  });

  it('ignores a stale pre-plan error once a newer request has answered', async () => {
    const older = deferred<{ Data: ContactPreplanData }>();
    mockGetContactPreplan.mockImplementationOnce(() => older.promise as never);
    mockGetContactPreplan.mockResolvedValueOnce({ Data: preplan('North door') } as never);

    const olderFetch = useContactPreplanStore.getState().fetchPreplan('c1');
    await useContactPreplanStore.getState().fetchPreplan('c1', true);
    older.reject(new Error('late failure'));
    await olderFetch;

    expect(useContactPreplanStore.getState().error).toBeNull();
    expect(useContactPreplanStore.getState().preplans.c1).toEqual(preplan('North door'));
  });

  it('keeps the newer file list when a forced re-fetch overtakes the one before it', async () => {
    const older = deferred<{ Data: ContactFileResultData[] }>();
    mockGetContactFiles.mockImplementationOnce(() => older.promise as never);
    mockGetContactFiles.mockResolvedValueOnce({ Data: files('newer') } as never);

    const olderFetch = useContactPreplanStore.getState().fetchFiles('c1');
    await useContactPreplanStore.getState().fetchFiles('c1', true);
    older.resolve({ Data: files('older') });
    await olderFetch;

    expect(useContactPreplanStore.getState().files.c1).toEqual(files('newer'));
    expect(useContactPreplanStore.getState().loadingFiles.c1).toBe(false);
  });

  it('drops answers that arrive after the contact is invalidated or the store is reset', async () => {
    const preplanRequest = deferred<{ Data: ContactPreplanData }>();
    const filesRequest = deferred<{ Data: ContactFileResultData[] }>();
    mockGetContactPreplan.mockImplementationOnce(() => preplanRequest.promise as never);
    mockGetContactFiles.mockImplementationOnce(() => filesRequest.promise as never);

    const preplanFetch = useContactPreplanStore.getState().fetchPreplan('c1');
    const filesFetch = useContactPreplanStore.getState().fetchFiles('c1');
    useContactPreplanStore.getState().invalidate('c1');
    preplanRequest.resolve({ Data: preplan('North door') });
    await preplanFetch;
    useContactPreplanStore.getState().reset();
    filesRequest.resolve({ Data: files('older') });
    await filesFetch;

    const state = useContactPreplanStore.getState();
    expect(state.preplans).toEqual({});
    expect(state.files).toEqual({});
    expect(state.loadingPreplan.c1).toBeFalsy();
    expect(state.loadingFiles.c1).toBeFalsy();
  });

  it('serves the cached pre-plan without refetching unless forced', async () => {
    mockGetContactPreplan.mockResolvedValue({ Data: preplan('North door') } as never);

    await useContactPreplanStore.getState().fetchPreplan('c1');
    await useContactPreplanStore.getState().fetchPreplan('c1');

    expect(mockGetContactPreplan).toHaveBeenCalledTimes(1);
  });
});
