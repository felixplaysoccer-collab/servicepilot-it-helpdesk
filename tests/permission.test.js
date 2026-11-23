import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canManageTickets,
  canManageAssets
} from '../lib/permissions.js';

test('administrators can manage tickets and assets', () => {
  assert.equal(canManageTickets('admin'), true);
  assert.equal(canManageAssets('admin'), true);
});

test('technicians can manage tickets but not assets', () => {
  assert.equal(canManageTickets('technician'), true);
  assert.equal(canManageAssets('technician'), false);
});

test('viewers cannot modify tickets or assets', () => {
  assert.equal(canManageTickets('viewer'), false);
  assert.equal(canManageAssets('viewer'), false);
});

test('unknown roles cannot modify records', () => {
  assert.equal(canManageTickets('unknown'), false);
  assert.equal(canManageAssets('unknown'), false);
});
