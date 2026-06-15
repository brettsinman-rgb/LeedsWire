import assert from "node:assert/strict";
import {
  createAdminSessionCookieValue,
  isAdminPasswordConfigured,
  isValidAdminPassword,
  isValidAdminSessionValue,
} from "../src/lib/admin/auth";

const previousPassword = process.env.LEEDSWIRE_ADMIN_PASSWORD;

process.env.LEEDSWIRE_ADMIN_PASSWORD = "phase-1-secret";

assert.equal(isAdminPasswordConfigured(), true);
assert.equal(isValidAdminPassword("phase-1-secret"), true);
assert.equal(isValidAdminPassword("wrong-secret"), false);
assert.equal(isValidAdminSessionValue(createAdminSessionCookieValue()), true);
assert.equal(isValidAdminSessionValue("v1.invalid"), false);

delete process.env.LEEDSWIRE_ADMIN_PASSWORD;

assert.equal(isAdminPasswordConfigured(), false);
assert.equal(isValidAdminPassword("phase-1-secret"), false);
assert.equal(isValidAdminSessionValue(createAdminSessionCookieValue()), false);

if (previousPassword === undefined) {
  delete process.env.LEEDSWIRE_ADMIN_PASSWORD;
} else {
  process.env.LEEDSWIRE_ADMIN_PASSWORD = previousPassword;
}

console.log("admin auth tests passed");
