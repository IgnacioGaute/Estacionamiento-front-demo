let mockSelection: string | undefined;
let mockRole = 'SUPER_ADMIN';
jest.mock('@/auth', () => ({ auth: async () => ({ user: { id: 'usuario', role: mockRole }, token: 'token' }) }));
jest.mock('next/headers', () => ({ cookies: async () => ({ get: () => mockSelection ? { value: mockSelection } : undefined }) }));

import { getAuthHeaders } from './auth';

test('el ámbito de plataforma no se envía como una playa al backend', async () => {
  mockSelection = 'usuario:platform';
  expect(await getAuthHeaders()).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer token' });
});

test('la playa elegida se envía solo para su cuenta', async () => {
  mockSelection = 'usuario:playa';
  expect(await getAuthHeaders()).toHaveProperty('X-Playa-Id', 'playa');
  mockSelection = 'otro:playa';
  expect(await getAuthHeaders()).not.toHaveProperty('X-Playa-Id');
  mockRole = 'USER';
  mockSelection = 'usuario:playa';
  expect(await getAuthHeaders()).not.toHaveProperty('X-Playa-Id');
});
