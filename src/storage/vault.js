const DB = "pallas-athena";
const KEY_ID = "aes-gcm";
const BOARD_ID = "main";

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("secrets")) db.createObjectStore("secrets");
      if (!db.objectStoreNames.contains("boards")) db.createObjectStore("boards");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getKey() {
  const db = await openDb();
  const existing = await requestResult(db.transaction("secrets").objectStore("secrets").get(KEY_ID));
  if (existing) {
    return crypto.subtle.importKey("raw", existing, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  }
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const raw = await crypto.subtle.exportKey("raw", key);
  await requestResult(db.transaction("secrets", "readwrite").objectStore("secrets").put(raw, KEY_ID));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function saveBoard(board) {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(board));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const db = await openDb();
  await requestResult(
    db.transaction("boards", "readwrite").objectStore("boards").put(
      { iv: Array.from(iv), data: Array.from(new Uint8Array(cipher)) },
      BOARD_ID,
    ),
  );
}

export async function loadBoard() {
  const db = await openDb();
  const stored = await requestResult(db.transaction("boards").objectStore("boards").get(BOARD_ID));
  if (!stored) return null;
  const key = await getKey();
  const iv = new Uint8Array(stored.iv);
  const data = new Uint8Array(stored.data);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return JSON.parse(new TextDecoder().decode(plain));
}
