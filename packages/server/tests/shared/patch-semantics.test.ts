/**
 * R8 — PUT must not erase fields the client didn't send.
 *
 * WHY THIS TEST EXISTS:
 * If the API rebuilds the entire record from the payload, an old browser tab
 * (opened before a deploy that added new fields) will wipe those fields,
 * return 200 OK, and leave no trace. The real-world damage: a tab opened
 * before the "loanAmount" field was added would silently erase all loan data
 * on any save.
 */

import { describe, it, expect } from 'vitest';
import { patchSemantics } from '../../src/shared/patch-semantics.js';

describe('R8: patchSemantics — PUT preserves missing fields', () => {
  const existing = {
    id: 1,
    fullName: 'Nguyễn Văn A',
    phone: '0901234567',
    position: 'Tài xế',
    department: 'Đội xe',
    isDriver: true,
    status: 'ACTIVE',
    version: 3,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-01'),
  };

  it('only updates fields present in payload', () => {
    const payload = { fullName: 'Nguyễn Văn B' };
    const merged = patchSemantics(existing, payload);

    expect(merged.fullName).toBe('Nguyễn Văn B');
    // phone was not in payload → should NOT be in merged (not overwritten)
    expect(merged).not.toHaveProperty('phone');
  });

  it('does NOT overwrite protected fields (id, createdAt, version)', () => {
    const payload = { id: 999, createdAt: new Date(), version: 100, fullName: 'Test' };
    const merged = patchSemantics(existing, payload);

    expect(merged).not.toHaveProperty('id');
    expect(merged).not.toHaveProperty('createdAt');
    expect(merged).not.toHaveProperty('version');
    expect(merged.fullName).toBe('Test');
  });

  it('allows null to explicitly clear a field', () => {
    const payload = { phone: null };
    const merged = patchSemantics(existing, payload);

    expect(merged.phone).toBeNull();
  });

  it('ignores undefined values in payload', () => {
    const payload = { fullName: 'Updated', phone: undefined };
    const merged = patchSemantics(existing, payload);

    expect(merged.fullName).toBe('Updated');
    expect(merged).not.toHaveProperty('phone');
  });

  it('handles empty payload — returns empty merge (no changes)', () => {
    const merged = patchSemantics(existing, {});
    expect(Object.keys(merged)).toHaveLength(0);
  });
});
