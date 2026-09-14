import { 
  Client, 
  JewelryOrder, 
  JewelryMaterial, 
  ClientPayment, 
  ClientGoldReceived, 
  JewelryImage, 
  Craftsman, 
  CraftsmanTransaction, 
  CraftsmanMaterialGiven, 
  CraftsmanItemReceived, 
  CraftsmanPayment 
} from './database';

export interface JewelryWithDetails extends JewelryOrder {
  client?: Client;
  images: JewelryImage[];
  materials: JewelryMaterial[];
  payments: ClientPayment[];
  craftsman_transactions: CraftsmanTransactionWithDetails[];
  total_material_cost: number;
  total_paid: number;
  remaining_amount: number;
}

export interface ClientWithDetails extends Client {
  jewelry_orders_count?: number;
  jewelry_orders?: JewelryWithDetails[];
  payments?: ClientPayment[];
  gold_received?: ClientGoldReceived[];
  total_order_value?: number;
  total_paid?: number;
  total_remaining?: number;
  total_pure_gold?: number;
  total_gold_received?: number;
  total_gold_remaining?: number;
}

export interface CraftsmanItemWithPayments extends CraftsmanItemReceived {
  payments: CraftsmanPayment[];
  total_paid: number;
  remaining_making_cost: number;
}

export interface CraftsmanTransactionWithDetails extends CraftsmanTransaction {
  materials_given: CraftsmanMaterialGiven[];
  items_received: CraftsmanItemWithPayments[];
  payments: CraftsmanPayment[];
  total_pure_material: number;
  total_making_cost: number;
  total_paid: number;
  remaining_making_cost: number;
  total_pure_gold_given?: number;
  total_pure_gold_received?: number;
  total_pure_gold_remaining?: number;
}

export interface CraftsmanWithDetails extends Craftsman {
  transactions_count?: number;
  transactions?: CraftsmanTransactionWithDetails[];
  total_making_charges?: number;
  total_paid?: number;
  total_remaining?: number;
  total_pure_gold_given?: number;
  total_pure_gold_received?: number;
  total_pure_gold_remaining?: number;
}
