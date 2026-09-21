const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
let session;
const routes = { DEFAULT_LOGIN_REDIRECT: '/tickets', apiAuthPrefix: '/api/auth', authRoutes: ['/auth/login'], publicApiRoutes: [], publicRoutes: ['/', '/auth/login'] };
const source = fs.readFileSync(path.join(__dirname, '../src/middleware.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const exportsObject = {};
vm.runInNewContext(code, { exports: exportsObject, URL, require: name => {
  if (name === './auth') return { auth: async () => session };
  if (name === './routes') return routes;
  if (name === 'next/server') return { NextResponse: { next: () => 'next', redirect: url => url.pathname } };
  throw Error(name);
}});
const visit = (route, role) => { session = role ? { user: { role, id: 'test-user' }, token: 'test-token' } : null; return exportsObject.default({ nextUrl: new URL(route, 'http://localhost') }); };
test('SUPER_ADMIN solo ve administración de plataforma, también al ingresar por URL', async () => {
  for (const route of ['/tickets', '/admin/tickets', '/admin/caja', '/notes', '/', '/auth/login', '/admin/users']) assert.equal(await visit(route, 'SUPER_ADMIN'), '/admin/empresas');
  assert.equal(await visit('/admin/empresas', 'SUPER_ADMIN'), 'next');
  assert.equal(await visit('/api/auth/signout', 'SUPER_ADMIN'), 'next');
});
test('administración de plataforma no admite operadores ni administradores de empresa', async () => {
  for (const role of ['USER', 'ADMIN']) assert.equal(await visit('/admin/empresas', role), '/403');
  assert.equal(await visit('/admin/empresas'), '/auth/login');
  assert.equal(await visit('/admin/tickets', 'ADMIN'), 'next');
  assert.equal(await visit('/admin/tickets', 'USER'), '/403');
  assert.equal(await visit('/tickets', 'USER'), 'next');
});
