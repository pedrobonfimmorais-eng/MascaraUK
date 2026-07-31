#!/usr/bin/env node
/**
 * Creates the FIRST administrator account (ADMINISTRADOR_PRINCIPAL) for a
 * fresh MascaraUK install. This is intentionally a terminal script, never a
 * public web form — anyone who can run it already has server/env access.
 *
 * Usage (Node 20.6+, which supports --env-file natively):
 *   node --env-file=.env.local scripts/create-admin.mjs
 *
 * Requires in the environment:
 *   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
 *   ADMIN_SETUP_SECRET (must be set to anything non-empty — this is the
 *   explicit "yes, I intend to run setup" confirmation).
 *
 * Refuses to run if an ADMINISTRADOR_PRINCIPAL already exists — additional
 * admins must be invited from inside the panel (/admin/administradores),
 * never created again through this script.
 */
import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const setupSecret = process.env.ADMIN_SETUP_SECRET;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Erro: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente antes de rodar este script.");
  process.exit(1);
}

if (!setupSecret) {
  console.error(
    "Erro: defina ADMIN_SETUP_SECRET no seu .env.local antes de rodar este script (é a confirmação de que você quer configurar o primeiro admin)."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: existingPrincipal, error: checkError } = await supabase
  .from("profiles")
  .select("id")
  .eq("role", "administrador_principal")
  .limit(1)
  .maybeSingle();

if (checkError) {
  console.error("Erro ao verificar administradores existentes:", checkError.message);
  process.exit(1);
}

if (existingPrincipal) {
  console.error(
    "Já existe um administrador principal cadastrado. Este script só cria o PRIMEIRO admin.\n" +
      "Para criar outros administradores, use o convite dentro do painel: /admin/administradores."
  );
  process.exit(1);
}

const rl = createInterface({ input: stdin, output: stdout });

const email = (await rl.question("E-mail do administrador principal: ")).trim();
const fullName = (await rl.question("Nome completo: ")).trim();
const password = await rl.question("Senha (mínimo 8 caracteres): ");

rl.close();

if (!email || !email.includes("@")) {
  console.error("E-mail inválido.");
  process.exit(1);
}

if (!password || password.length < 8) {
  console.error("A senha precisa ter pelo menos 8 caracteres.");
  process.exit(1);
}

const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (createError || !created.user) {
  console.error("Erro ao criar o usuário:", createError?.message ?? "desconhecido");
  process.exit(1);
}

const { error: profileError } = await supabase
  .from("profiles")
  .update({ role: "administrador_principal", full_name: fullName || null })
  .eq("id", created.user.id);

if (profileError) {
  console.error("Usuário criado, mas houve um erro ao definir o papel de administrador:", profileError.message);
  console.error(`Corrija manualmente no Supabase: profiles.role = 'administrador_principal' para o id ${created.user.id}`);
  process.exit(1);
}

console.log("\nAdministrador principal criado com sucesso.");
console.log(`E-mail: ${email}`);
console.log("Acesse /login com essas credenciais e configure a autenticação em duas etapas assim que possível.");
