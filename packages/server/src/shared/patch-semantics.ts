/**
 * patchSemantics — R8: PUT must not erase fields the client didn't send.
 *
 * WHY THIS EXISTS:
 * If the API rebuilds the entire record from the payload, an old browser tab
 * (opened before a deploy that added new fields) will wipe those fields,
 * return 200 OK, and leave no trace. The rule: missing fields keep their
 * current value.
 *
 * Convention:
 * - `undefined` (field absent in payload) → keep the existing value
 * - `null`      (client explicitly sent null) → clear the value
 * - any value   → overwrite
 */

/**
 * Merge incoming payload onto the existing record.
 * Only fields present (not undefined) in payload overwrite the existing value.
 *
 * @param existing — current record from DB (plain object, not Prisma model instance)
 * @param payload — request body (parsed JSON)
 * @param protectedFields — fields that must never be overwritten via API
 *   (e.g., 'id', 'createdAt', 'version')
 * @returns merged object safe to pass to Prisma update
 */
export function patchSemantics<T extends Record<string, unknown>>(
  existing: T,
  payload: Record<string, unknown>,
  protectedFields: readonly string[] = ['id', 'createdAt', 'updatedAt', 'version'],
): Partial<T> {
  const merged: Record<string, unknown> = {};

  for (const key of Object.keys(payload)) {
    if (protectedFields.includes(key)) continue;
    if (payload[key] !== undefined) {
      merged[key] = payload[key];
    }
  }

  return merged as Partial<T>;
}
