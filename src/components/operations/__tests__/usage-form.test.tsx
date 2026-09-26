import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { DeploymentUnit } from '@/models/v4/operations';

import { UsageForm } from '../usage-form';

jest.mock('@/components/operations/option-select', () => ({
  OptionSelect: () => null,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const units: DeploymentUnit[] = [
  { Id: 'du-1', UnitId: 11, UnitName: 'Engine 11', IsActive: true },
  { Id: 'du-2', UnitId: 12, UnitName: 'Engine 12', IsActive: true },
];

const submitReading = async (defaultUnitId: string | null) => {
  const onAdd = jest.fn(() => Promise.resolve(true));
  render(<UsageForm dateKey="2026-09-25" units={units} defaultUnitId={defaultUnitId} readings={[]} busy={false} onAdd={onAdd} />);
  fireEvent.changeText(screen.getByTestId('operations-usage-engine'), '4');
  fireEvent.press(screen.getByTestId('operations-usage-add'));
  await waitFor(() => expect(onAdd).toHaveBeenCalled());
  return onAdd.mock.calls[0] as unknown as [{ UnitId: number }];
};

describe('UsageForm default unit', () => {
  it('starts on the active unit when it is one of the offered units', async () => {
    const [input] = await submitReading('12');

    expect(input.UnitId).toBe(12);
  });

  it('falls back to the first offered unit when the active unit is not on the deployment', async () => {
    const [input] = await submitReading('99');

    expect(input.UnitId).toBe(11);
  });

  it('falls back to the first offered unit when there is no active unit', async () => {
    const [input] = await submitReading(null);

    expect(input.UnitId).toBe(11);
  });
});
