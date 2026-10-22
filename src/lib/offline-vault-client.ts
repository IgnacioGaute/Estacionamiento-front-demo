export async function loadOfflineVault() {
  const moduleUrl = '/offline-vault.js';
  return import(/* webpackIgnore: true */ moduleUrl);
}
