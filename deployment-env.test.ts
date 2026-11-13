import test from "node:test";
import assert from "node:assert/strict";
import { assertDeploymentEnv } from "./deployment-env.ts";

const browserJwt = (role: string) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.synthetic-signature`;
const valid = {
  VITE_BACKEND_URL: "https://backend.run.app",
  VITE_SUPABASE_URL: "https://synthetic-project.supabase.co",
  VITE_SUPABASE_ANON_KEY: browserJwt("anon"),
};

test("accepts legacy anon and publishable browser keys", () => {
  assert.doesNotThrow(() => assertDeploymentEnv(valid));
  assert.doesNotThrow(() => assertDeploymentEnv({ ...valid, VITE_SUPABASE_ANON_KEY: "sb_publishable_synthetic_browser_key" }));
});

test("accepts pasted settings with boundary whitespace", () => {
  assert.doesNotThrow(() => assertDeploymentEnv(Object.fromEntries(Object.entries(valid).map(([k, v]) => [k, ` ${v}\r\n`]))));
});

for (const name of Object.keys(valid)) {
  test(`rejects missing ${name}`, () => {
    assert.throws(() => assertDeploymentEnv({ ...valid, [name]: "" }));
  });
}

test("rejects private keys without including their values in errors", () => {
  for (const key of [browserJwt("service_role"), "sb_secret_synthetic_private_key"]) {
    assert.throws(() => assertDeploymentEnv({ ...valid, VITE_SUPABASE_ANON_KEY: key }), (error: Error) => {
      assert.ok(!error.message.includes(key));
      return /publishable or legacy anon/.test(error.message);
    });
  }
});

test("rejects insecure, credential-bearing, and malformed base URLs", () => {
  for (const url of ["http://backend.run.app", "https://user:password@backend.run.app", "https://backend.run.app/api", "https://backend.run.app?token=private", "not-a-url"]) {
    assert.throws(() => assertDeploymentEnv({ ...valid, VITE_BACKEND_URL: url }));
  }
});
