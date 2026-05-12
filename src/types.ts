export type TransactionType = 'income' | 'expense';

export interface Account {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  ownerId: string;
}

export interface Transaction {
  id: string;
  amount: number;
  date: string;
  accountId: string;
  type: TransactionType;
  note?: string;
  ownerId: string;
  createdAt: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}
