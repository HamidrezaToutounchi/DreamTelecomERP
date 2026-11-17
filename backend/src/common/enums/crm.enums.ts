export enum Role {
  SALES_REP = 'SALES_REP',
  SALES_MANAGER = 'SALES_MANAGER',
}

export enum LeadStatus {
  NEW = 'NEW',
  CALLED_NO_ANSWER = 'CALLED_NO_ANSWER',
  CALLED_REACHED = 'CALLED_REACHED',
  MEETING_SCHEDULED = 'MEETING_SCHEDULED',
  MEETING_DONE = 'MEETING_DONE',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST',
}

export enum CustomerType {
  CORPORATE = 'CORPORATE',
  INDIVIDUAL = 'INDIVIDUAL',
  DEALER = 'DEALER',
}

export enum InteractionType {
  PHONE_CALL = 'PHONE_CALL',
  IN_PERSON_MEETING = 'IN_PERSON_MEETING',
  ONLINE_MEETING = 'ONLINE_MEETING',
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  NOTE = 'NOTE',
}

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REVISED = 'REVISED',
}

export enum Currency {
  TRY = 'TRY',
  USD = 'USD',
  EUR = 'EUR',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
}

export enum AppModule {
  // CRM Modülleri
  LEADS = 'LEADS',
  CUSTOMERS = 'CUSTOMERS',
  QUOTES = 'QUOTES',
  SALES = 'SALES',
  PRODUCTS = 'PRODUCTS',
  REPORTS = 'REPORTS',
  // Stok & Sevkiyat Modülleri
  STOCK_VIEW = 'STOCK_VIEW',
  STOCK_ENTRY = 'STOCK_ENTRY',
  STOCK_EXIT = 'STOCK_EXIT',
  STOCK_ADJUSTMENT = 'STOCK_ADJUSTMENT',
  WAREHOUSES = 'WAREHOUSES',
  SUPPLIERS = 'SUPPLIERS',
  FAULTS = 'FAULTS',
  STOCK_REPORTS = 'STOCK_REPORTS',
  // Yönetim Modülleri
  USERS = 'USERS',
  ROLES = 'ROLES',
  APPROVAL_SETTINGS = 'APPROVAL_SETTINGS',
  COMPANIES = 'COMPANIES',
  CATEGORIES = 'CATEGORIES',
  AUDIT_LOGS = 'AUDIT_LOGS',
}

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'cancel';
