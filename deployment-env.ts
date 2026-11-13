/** Validate public browser settings before publishing the production bundle. */
export function assertDeploymentEnv(env: Record<string, string | undefined>): void {
  for (const name of ["VITE_BACKEND_URL", "VITE_SUPABASE_URL"]) {
    const value = env[name]?.trim();
    if (!value) throw new Error(`Set ${name} in the frontend deployment environment.`);
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`${name} must be a valid HTTPS base URL.`);
    }
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
      throw new Error(`${name} must be an HTTPS base URL without credentials, a path, or query parameters.`);
    }
  }

  const key = env.VITE_SUPABASE_ANON_KEY?.trim() || "";
  if (key.startsWith("sb_publishable_") && key.length > 20) return;

  // Legacy Supabase browser keys are JWTs whose role must be anon.
  if (key.split(".").length === 3) {
    try {
      const claims = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8"));
      if (claims.role === "anon") return;
    } catch {
      // Fail below without including the supplied key in build logs.
    }
  }
  throw new Error("Set VITE_SUPABASE_ANON_KEY to the Supabase publishable or legacy anon key. Private service-role/secret keys must never be bundled in the browser.");
}
