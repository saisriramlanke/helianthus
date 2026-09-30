export type AddressCheck = { ok: true; address: string } | { ok: false; reason: "empty" | "too_long" };

const MAX_ADDRESS_LENGTH = 300;

/** Trims and validates user input before any API call. */
export function checkAddress(input: unknown): AddressCheck {
  const address = typeof input === "string" ? input.trim().replace(/\s+/g, " ") : "";
  if (address.length === 0) return { ok: false, reason: "empty" };
  if (address.length > MAX_ADDRESS_LENGTH) return { ok: false, reason: "too_long" };
  return { ok: true, address };
}
