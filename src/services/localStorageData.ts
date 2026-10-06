import { 
  Client, 
  Craftsman, 
  JewelryOrder, 
  JewelryImage, 
  JewelryMaterial, 
  ClientPayment, 
  ClientGoldReceived, 
  CraftsmanTransaction, 
  CraftsmanMaterialGiven, 
  CraftsmanItemReceived, 
  CraftsmanPayment 
} from '../types/database';

interface DatabaseStore {
  clients: Client[];
  craftsmen: Craftsman[];
  jewelry_orders: JewelryOrder[];
  jewelry_images: JewelryImage[];
  jewelry_materials: JewelryMaterial[];
  client_payments: ClientPayment[];
  client_gold_received: ClientGoldReceived[];
  craftsman_transactions: CraftsmanTransaction[];
  craftsman_materials_given: CraftsmanMaterialGiven[];
  craftsman_items_received: CraftsmanItemReceived[];
  craftsman_payments: CraftsmanPayment[];
}

const BASE_STORAGE_KEY = 'jewelry_craftsman_db_v2';

const getActiveStorageKey = (): string => {
  try {
    const localAuth = localStorage.getItem('jewelry_local_master_auth');
    if (localAuth) {
      return `jewelry_craftsman_db_${localAuth}`;
    }
  } catch {
    // fallback
  }
  return BASE_STORAGE_KEY;
};

const initialData: DatabaseStore = {
  clients: [],
  craftsmen: [],
  jewelry_orders: [],
  jewelry_images: [],
  jewelry_materials: [],
  client_payments: [],
  client_gold_received: [],
  craftsman_transactions: [],
  craftsman_materials_given: [],
  craftsman_items_received: [],
  craftsman_payments: [],
};

export const getLocalStore = (): DatabaseStore => {
  try {
    const key = getActiveStorageKey();
    let raw = localStorage.getItem(key);
    
    // Fallback to legacy single-user key if new user key is not found yet
    if (!raw && key !== BASE_STORAGE_KEY) {
      raw = localStorage.getItem(BASE_STORAGE_KEY);
    }

    if (!raw) {
      localStorage.setItem(key, JSON.stringify(initialData));
      return initialData;
    }
    const parsed = JSON.parse(raw);
    return {
      ...initialData,
      ...parsed,
    };
  } catch {
    return initialData;
  }
};

export const saveLocalStore = (data: DatabaseStore) => {
  try {
    const key = getActiveStorageKey();
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to local storage', err);
  }
};
