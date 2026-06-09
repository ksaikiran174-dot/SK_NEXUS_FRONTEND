import { openDB } from 'idb';

const DB_NAME = 'RestaurantOfflineDB';
const STORE_NAME = 'offline_orders';

// 🚀 Initialize and upgrade the database structural layers
export const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // We use a custom local string token ID as our unique look-up primary key
        db.createObjectStore(STORE_NAME, { keyPath: 'localId' });
      }
    },
  });
};

// 💾 SAVE: Cache an order payload securely to browser memory
export const saveOfflineOrder = async (order) => {
  const db = await initDB();
  const localOrder = {
    ...order,
    localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Bulletproof temporary ID
    syncStatus: 'pending',
    retryCount: 0
  };
  await db.put(STORE_NAME, localOrder);
  return localOrder;
};

// 📖 READ: Fetch all pending cached items waiting for internet
export const getPendingOrders = async () => {
  const db = await initDB();
  return db.getAll(STORE_NAME);
};

// 🧼 DELETE: Erase the temporary file record once FastAPI confirms creation
export const deleteOfflineOrder = async (localId) => {
  const db = await initDB();
  await db.delete(STORE_NAME, localId);
};