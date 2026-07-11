// Shared enums used across the domain.

// The physical activities a vendor can perform for a flex/signage job.
export enum ServiceType {
  DESIGN = 'DESIGN',
  PRINTING = 'PRINTING',
  FABRICATION = 'FABRICATION',
  INSTALLATION = 'INSTALLATION',
  TRANSPORT = 'TRANSPORT',
  OTHER = 'OTHER',
}

// Lifecycle of a client requirement (the order we manage end to end).
export enum RequirementStatus {
  NEW = 'NEW', // requirement collected from client
  ASSIGNED = 'ASSIGNED', // work items assigned to vendor(s)
  VENDOR_QUOTED = 'VENDOR_QUOTED', // vendors gave their costs
  SENT_TO_CLIENT = 'SENT_TO_CLIENT', // our marked-up quotation shared with client
  NEGOTIATING = 'NEGOTIATING', // client asked for a better price -> back to vendor
  ACCEPTED = 'ACCEPTED', // client accepted the quotation
  INVOICED = 'INVOICED', // invoice raised
  REJECTED = 'REJECTED',
  CLOSED = 'CLOSED',
}

// Status of an individual work item within a requirement.
export enum RequirementItemStatus {
  PENDING = 'PENDING', // not yet assigned to a vendor
  ASSIGNED = 'ASSIGNED', // assigned, awaiting vendor cost
  QUOTED = 'QUOTED', // vendor cost captured
}

// Status of a quotation revision shared with the client.
export enum QuotationStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  REVISION_REQUESTED = 'REVISION_REQUESTED', // client wants a lower price
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export enum InvoiceStatus {
  RAISED = 'RAISED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}
