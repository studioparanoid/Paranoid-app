import assert from "node:assert/strict";
import test from "node:test";
import { isMobileSimplificationEnabled } from "../src/lib/mobile-simplification/flag.ts";

const variableName = "NEXT_PUBLIC_MOBILE_SIMPLIFICATION_ENABLED";

function restoreEnvironment(previousValue) {
  if (previousValue === undefined) delete process.env[variableName];
  else process.env[variableName] = previousValue;
}

test("mobile simplification is enabled when the deployment variable is absent", () => {
  const previousValue = process.env[variableName];
  try {
    delete process.env[variableName];
    assert.equal(isMobileSimplificationEnabled(), true);
  } finally {
    restoreEnvironment(previousValue);
  }
});

test("mobile simplification only rolls back when explicitly disabled", () => {
  const previousValue = process.env[variableName];
  try {
    process.env[variableName] = "false";
    assert.equal(isMobileSimplificationEnabled(), false);
    process.env[variableName] = "true";
    assert.equal(isMobileSimplificationEnabled(), true);
  } finally {
    restoreEnvironment(previousValue);
  }
});
