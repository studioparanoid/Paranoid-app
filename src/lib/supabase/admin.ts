import { createClient } from "@supabase/supabase-js";

const SERVICE_ROLE_ENV_NAMES = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SERVICE_KEY",
  "SUPABASE_SECRET_KEY",
];

function getServerEnvValue(name: string) {
  const value = process.env[name]?.trim();

  return value || "";
}

function getServiceRoleKey() {
  for (const name of SERVICE_ROLE_ENV_NAMES) {
    const value = getServerEnvValue(name);

    if (value) {
      return { name, value };
    }
  }

  return null;
}

function getServiceRoleEnvDebug() {
  return SERVICE_ROLE_ENV_NAMES.map(
    (name) => `${name}=${getServerEnvValue(name) ? "set" : "missing"}`
  ).join(", ");
}

function readJwtPayload(token: string) {
  try {
    const [, payload] = token.split(".");
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded =
      typeof atob === "function"
        ? atob(normalized)
        : Buffer.from(normalized, "base64").toString("utf8");

    return JSON.parse(decoded) as { role?: string };
  } catch {
    return null;
  }
}

export function getSupabaseAdminClient() {
  const url = getServerEnvValue("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getServiceRoleKey();

  if (!url || !serviceRoleKey) {
    const publishableKey = getServerEnvValue("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    if (!url || !publishableKey) {
      throw new Error("Configuração Supabase incompleta no servidor.");
    }
    return createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return createClient(url, serviceRoleKey.value, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getRequiredSupabaseAdminClient() {
  const url = getServerEnvValue("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getServiceRoleKey();

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não está configurada.");
  }

  if (!serviceRoleKey) {
    throw new Error(
      `Service role da Supabase não está configurada no servidor. Estado: ${getServiceRoleEnvDebug()}.`
    );
  }

  const payload = readJwtPayload(serviceRoleKey.value);

  if (payload?.role && payload.role !== "service_role") {
    throw new Error(
      `${serviceRoleKey.name} não é uma service role key válida.`
    );
  }

  return createClient(url, serviceRoleKey.value, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
