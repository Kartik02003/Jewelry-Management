export interface Client {
  id: string;
  name: string;
  phone?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Craftsman {
  id: string;
  name: string;
  phone?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface JewelryOrder {
  id: string;
  client_id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface JewelryImage {
  id: string;
  jewelry_id: string;
  storage_path: string;
  created_at: string;
}

export interface JewelryMaterial {
  id: string;
  jewelry_id: string;
  material_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  making_rate?: number;
  purity_percentage?: number;
  pure_quantity?: number;
  created_at: string;
  updated_at: string;
}

export interface ClientPayment {
  id: string;
  client_id?: string;
  jewelry_id?: string | null;
  amount: number;
  payment_date: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientGoldReceived {
  id: string;
  client_id: string;
  quantity: number;
  received_date: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CraftsmanTransaction {
  id: string;
  craftsman_id: string;
  jewelry_id?: string | null;
  transaction_date: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  craftsman?: Craftsman;
  jewelry?: JewelryOrder & { client?: Client };
}

export interface CraftsmanMaterialGiven {
  id: string;
  transaction_id: string;
  material_name: string;
  quantity: number;
  unit: string;
  notes?: string | null;
  created_at: string;
}

export interface CraftsmanItemReceived {
  id: string;
  transaction_id: string;
  item_name: string;
  gross_quantity: number;
  unit: string;
  carat?: string;
  purity_percentage: number;
  pure_quantity: number;
  cost_per_gram?: number;
  making_cost: number;
  received_date?: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CraftsmanPayment {
  id: string;
  craftsman_id: string;
  transaction_id: string;
  item_received_id?: string | null;
  amount: number;
  payment_date: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  item?: CraftsmanItemReceived;
}
