const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const jose = require('jose');
let config, current;
const secret = 'isolated-session-test-secret-only';
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/auth.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
vm.runInNewContext(code, {
  exports: {}, TextEncoder, process: { env: { NEXTAUTH_SECRET: secret, API_SECRET_TOKEN: 'test-internal' } },
  require(name) {
    if (name === 'next-auth') return { default: options => { config = options; return {}; } };
    if (name === 'next-auth/providers/credentials') return { default: options => options };
    if (name === 'jose') return jose;
    if (name === 'next-auth/jwt') return {};
    if (name === './schemas/auth/login.schema') return { loginSchema: { safeParse: data => ({ success: true, data }) } };
    if (name === './services/auth.service') return { loginUser: async () => current };
    if (name === './services/users.service') return { getUserById: async id => current?.id === id ? current : null };
    throw Error(name);
  },
});

test('sesión consulta permisos actuales e ignora identidad y rol enviados por el navegador', async () => {
  current = { id: 'user-a', email: 'a@example.test', username: 'a', firstName: 'A', lastName: 'Test', role: 'ADMIN', authVersion: 0 };
  const issued = await config.callbacks.jwt({ token: {}, user: current });
  assert.ok(issued.accessToken);
  const { payload } = await jose.jwtVerify(issued.accessToken, new TextEncoder().encode(secret));
  assert.equal(payload.id, current.id);
  assert.equal(payload.authVersion, 0);
  assert.equal(payload.role, undefined);
  current = { ...current, role: 'USER' };
  const refreshed = await config.callbacks.jwt({ token: issued, trigger: 'update', session: { user: { id: 'root', role: 'SUPER_ADMIN', firstName: 'Injected' } } });
  assert.equal(refreshed.sub, 'user-a');
  assert.equal(refreshed.role, 'USER');
  assert.equal(refreshed.firstName, 'A');
  current = { ...current, authVersion: 1 };
  assert.equal(await config.callbacks.jwt({ token: issued }), null);
  current = null;
  assert.equal(await config.callbacks.jwt({ token: issued }), null);
});

test('sin token válido no se renueva una sesión automáticamente', async () => {
  current = { id: 'user-a', role: 'USER', authVersion: 0 };
  for (const accessToken of [undefined, 'invalid', await new jose.SignJWT({ id: 'other', authVersion: 0 }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(new TextEncoder().encode(secret))]) {
    assert.equal(await config.callbacks.jwt({ token: { sub: current.id, accessToken } }), null);
  }
});
