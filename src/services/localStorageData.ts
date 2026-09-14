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

const STORAGE_KEY = 'jewelry_craftsman_db_v2';

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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to local storage', err);
  }
};
