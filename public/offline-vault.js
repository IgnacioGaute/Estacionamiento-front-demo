// One encrypted consultation snapshot per browser. No auth token is persisted.
const DB = 'parking-offline-consultation-v1';
async function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('vault');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function access(mode, operation) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('vault', mode);
      const req = operation(tx.objectStore('vault'));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('No se pudo guardar la copia.'));
    });
  } finally { db.close(); }
}
async function key(password, salt) {
  const source = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' }, source, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function saveSnapshot(snapshot, password) {
  if (password.length < 12) throw new Error('Usá una frase de al menos 12 caracteres.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(password, salt), new TextEncoder().encode(JSON.stringify(snapshot)));
  await access('readwrite', store => store.put({ salt, iv, encrypted }, 'current'));
}
export async function openSnapshot(password) {
  const record = await access('readonly', store => store.get('current'));
  if (!record) throw new Error('No hay una copia guardada en este dispositivo.');
  let plain;
  try { plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: record.iv }, await key(password, record.salt), record.encrypted); }
  catch { throw new Error('La frase no coincide o la copia está dañada.'); }
  const snapshot = JSON.parse(new TextDecoder().decode(plain));
  if (snapshot.version !== 1 || !Number.isFinite(snapshot.expiresAt) || Date.now() > snapshot.expiresAt) throw new Error('La copia venció. Conectate y guardá una nueva.');
  return snapshot;
}
export async function clearSnapshot() { await access('readwrite', store => store.delete('current')); }
