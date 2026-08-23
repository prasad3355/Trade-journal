export const DB_NAME = "TradeFolioDB";
export const DB_VERSION = 3; // Bumped for full image rollback support
export const STORE_TRADES = "trades";
export const STORE_IMAGES = "trade_images";
export const STORE_ROLLBACK = "rollback_cache";
export const STORE_IMAGES_ROLLBACK = "rollback_images_cache";

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject(event.target.error);

    request.onsuccess = async (event) => {
      const db = event.target.result;
      try {
        await ensureMigration(db);
        resolve(db);
      } catch (err) {
        reject(err);
      }
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_TRADES)) {
        db.createObjectStore(STORE_TRADES, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        const imgStore = db.createObjectStore(STORE_IMAGES, { keyPath: "id" });
        imgStore.createIndex("tradeId", "tradeId", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_ROLLBACK)) {
        db.createObjectStore(STORE_ROLLBACK, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_IMAGES_ROLLBACK)) {
        db.createObjectStore(STORE_IMAGES_ROLLBACK, { keyPath: "id" });
      }
    };
  });
}

function base64ToBlob(base64Data) {
  const parts = base64Data.split(";base64,");
  const contentType = parts[0].split(":")[1] || "image/png";
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}

async function ensureMigration(db) {
  // Check if we need to migrate any base64 images
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_TRADES, STORE_IMAGES, STORE_ROLLBACK], "readwrite");
    const tradesStore = tx.objectStore(STORE_TRADES);
    const imagesStore = tx.objectStore(STORE_IMAGES);
    const rollbackStore = tx.objectStore(STORE_ROLLBACK);

    const getAllReq = tradesStore.getAll();
    getAllReq.onsuccess = () => {
      const allTrades = getAllReq.result;

      const tradesNeedMigration = allTrades.filter(t =>
        (t.images && t.images.some(img => img.startsWith("data:input") || img.startsWith("data:image"))) ||
        (t.image && t.image.startsWith("data:image"))
      );

      if (tradesNeedMigration.length === 0) {
        return resolve();
      }

      console.warn(`[DB Migration] Migrating ${tradesNeedMigration.length} trades with inline Base64 images to safe Blob storage...`);

      // 1. Create safety snapshot
      allTrades.forEach(t => rollbackStore.put(t));

      try {
        let blobsCreated = 0;

        tradesNeedMigration.forEach(trade => {
          let staticPaths = [];

          const processBase64 = (imgStr, idx) => {
            if (imgStr.startsWith("data:image")) {
              const blob = base64ToBlob(imgStr);
              const imgId = `img-${trade.id}-${idx}-${Date.now()}`;
              imagesStore.put({
                id: imgId,
                tradeId: trade.id,
                mimeType: blob.type,
                data: blob,
                createdAt: new Date().toISOString()
              });
              blobsCreated++;
            } else if (imgStr.startsWith("/")) {
              staticPaths.push(imgStr);
            }
          };

          if (trade.images && Array.isArray(trade.images)) {
            trade.images.forEach((img, i) => processBase64(img, i));
          } else if (trade.image) {
            processBase64(trade.image, 0);
          }

          // 2. Strip large payloads and retain static
          trade.images = staticPaths;
          trade.image = staticPaths.length > 0 ? staticPaths[0] : null;
          // Mark migrated
          trade.storageSchemaVersion = 2;

          tradesStore.put(trade);
        });

        tx.oncomplete = () => {
          console.log(`[DB Migration] Success! Converted ${blobsCreated} base64 references to Blob records.`);
          // Note: We leave rollback store intact indefinitely purely as an absolute safety net 
          // for the user until phase 5.3 cleanup if ever necessary.
          resolve();
        };

        tx.onerror = (e) => {
          console.error("Migration transaction failed!", e);
          // Automatic IDB transaction abort will rollback everything natively.
          reject(e);
        };
      } catch (err) {
        tx.abort();
        reject(err);
      }
    };

    getAllReq.onerror = () => reject(getAllReq.error);
  });
}

// --------------------------------------------------------------------------
// TRADE CRUD
// --------------------------------------------------------------------------

export async function getAllTrades() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_TRADES, "readonly");
    const store = transaction.objectStore(STORE_TRADES);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTradeToDB(trade) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_TRADES, "readwrite");
    const store = transaction.objectStore(STORE_TRADES);
    const request = store.put(trade);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveTradesToDB(tradesList) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_TRADES, "readwrite");
    const store = transaction.objectStore(STORE_TRADES);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    tradesList.forEach((trade) => store.put(trade));
  });
}

export async function deleteTradeFromDB(id) {
  const db = await openDB();
  // We must also delete associated images in TradeImages store!
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_TRADES, STORE_IMAGES], "readwrite");

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    // Delete trade
    transaction.objectStore(STORE_TRADES).delete(id);

    // Delete associated images
    const imgStore = transaction.objectStore(STORE_IMAGES);
    const index = imgStore.index("tradeId");
    const req = index.getAllKeys(id);
    req.onsuccess = () => {
      req.result.forEach(imgId => imgStore.delete(imgId));
    };
  });
}

export async function clearAllTradesFromDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_TRADES, STORE_IMAGES], "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.objectStore(STORE_TRADES).clear();
    transaction.objectStore(STORE_IMAGES).clear();
  });
}

// --------------------------------------------------------------------------
// IMAGE APIs (LAZY LOADING)
// --------------------------------------------------------------------------

export async function saveTradeImage(tradeId, fileOrBlob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_IMAGES, "readwrite");
    const store = transaction.objectStore(STORE_IMAGES);

    const imgId = `img-${tradeId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const record = {
      id: imgId,
      tradeId: tradeId,
      mimeType: fileOrBlob.type || "image/png",
      data: fileOrBlob, // Blob automatically supported by IDB
      createdAt: new Date().toISOString()
    };

    const req = store.put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

export async function getTradeImages(tradeId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_IMAGES, "readonly");
    const store = transaction.objectStore(STORE_IMAGES);
    const index = store.index("tradeId");

    const request = index.getAll(tradeId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function clearTradeImages(tradeId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_IMAGES, "readwrite");
    const imgStore = transaction.objectStore(STORE_IMAGES);
    const index = imgStore.index("tradeId");
    const request = index.getAllKeys(tradeId);
    request.onsuccess = () => {
      request.result.forEach(imgId => imgStore.delete(imgId));
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// --------------------------------------------------------------------------
// ADVANCED BACKUP OPERATIONS
// --------------------------------------------------------------------------

export async function getAllTradeImagesMetadata() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_IMAGES, "readonly");
    const store = transaction.objectStore(STORE_IMAGES);
    const request = store.getAll();
    request.onsuccess = () => {
      // Strip actual blob data from result to avoid OOM crash during export
      const metadata = request.result.map(img => ({
        id: img.id,
        tradeId: img.tradeId,
        mimeType: img.mimeType,
        createdAt: img.createdAt
      }));
      resolve(metadata);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function createRollbackSnapshot() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_TRADES, STORE_IMAGES, STORE_ROLLBACK, STORE_IMAGES_ROLLBACK], "readwrite");
    const tradesStore = transaction.objectStore(STORE_TRADES);
    const imagesStore = transaction.objectStore(STORE_IMAGES);
    const rollbackTradesStore = transaction.objectStore(STORE_ROLLBACK);
    const rollbackImagesStore = transaction.objectStore(STORE_IMAGES_ROLLBACK);

    // Clear caches
    rollbackTradesStore.clear();
    rollbackImagesStore.clear();

    // Pipeline trades
    const getTradesReq = tradesStore.getAll();
    getTradesReq.onsuccess = () => {
      getTradesReq.result.forEach(t => rollbackTradesStore.put(t));

      // Pipeline images
      const getImagesReq = imagesStore.getAll();
      getImagesReq.onsuccess = () => {
        getImagesReq.result.forEach(img => rollbackImagesStore.put(img));
      };
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function restoreRollbackSnapshot() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_TRADES, STORE_IMAGES, STORE_ROLLBACK, STORE_IMAGES_ROLLBACK], "readwrite");
    const tradesStore = transaction.objectStore(STORE_TRADES);
    const imagesStore = transaction.objectStore(STORE_IMAGES);
    const rollbackTradesStore = transaction.objectStore(STORE_ROLLBACK);
    const rollbackImagesStore = transaction.objectStore(STORE_IMAGES_ROLLBACK);

    const getTradesSnapshotReq = rollbackTradesStore.getAll();
    getTradesSnapshotReq.onsuccess = () => {
      const rollbackTrades = getTradesSnapshotReq.result;

      const getImagesSnapshotReq = rollbackImagesStore.getAll();
      getImagesSnapshotReq.onsuccess = () => {
        const rollbackImages = getImagesSnapshotReq.result;

        // Completely erase current state if we have a valid snapshot branch
        // (Technically rollback might be empty array if snapshot occurred on blank slate)
        if (rollbackTrades !== undefined) {
          tradesStore.clear();
          rollbackTrades.forEach(t => tradesStore.put(t));
        }
        if (rollbackImages !== undefined) {
          imagesStore.clear();
          rollbackImages.forEach(img => imagesStore.put(img));
        }
      };
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getAllTradeImagesRaw() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_IMAGES, "readonly");
    const store = transaction.objectStore(STORE_IMAGES);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
