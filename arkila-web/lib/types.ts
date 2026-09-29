// Enums & Literal Types
export type Role = "customer" | "owner" | "admin";
export type ListingStatus = "pending" | "approved" | "rejected" | "suspended";
export type OwnerStatus = "pending" | "approved" | "rejected";

export const VEHICLE_TYPES = [
  "sedan",
  "suv",
  "hatchback",
  "van",
  "pickup",
  "motorcycle",
  "other",
] as const;

export const FUEL_TYPES = [
  "gasoline",
  "diesel",
  "electric",
  "hybrid",
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];
export type FuelType = (typeof FUEL_TYPES)[number];

export type DeliveryMethod =
  | "self_pickup_self_return"
  | "self_pickup_owner_pickup"
  | "owner_delivery_self_return"
  | "owner_delivery_owner_pickup";

export type BookingStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "confirmed"
  | "ongoing"
  | "returned"
  | "review_pending"
  | "completed";

export type PaymentStatus = "unpaid" | "pending" | "paid" | "expired";

export type PaymentMethod = "online" | "f2f";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  phone: string;
  address: string;
  brandName?: string;
  ownerStatus?: OwnerStatus;
  rejectionReason?: string;
  isSuspended?: boolean;
  suspensionReason?: string;
  suspendedAt?: string;
  earnings?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOverview {
  totalCustomers: number;
  totalOwners: number;
  totalCars: number;
  pendingOwners: number;
  pendingCars: number;
}

export interface AdminStats {
  totalCustomers: number;
  totalOwners: number;
  totalCars: number;
  pendingOwners: number;
  pendingCars: number;
  suspendedAccounts: number;
  suspendedCars: number;
  completedRentals: number;
  grossVolume: number;
  platformFees: number;
  ownerPayouts: number;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token: string;
  expiresIn: string;
  user: User;
}

export interface IdDocument {
  _id: string;
  user: string | User;
  imageUrl: string;
  imagePublicId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Car {
  _id: string;
  owner: string | User; 
  name: string;
  description: string;
  rentalPrice: number;
  imageUrl: string;
  imagePublicId: string;
  vehicleType: VehicleType;
  fuelType: FuelType;
  location: string;
  seats: number;
  isAvailable: boolean;
  registrationImageUrl: string;
  registrationImagePublicId: string;
  listingStatus: ListingStatus;
  adminNote?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CarFilterQuery {
  location?: string;
  vehicleType?: VehicleType;
  fuelType?: FuelType;
  seats?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

export interface PaymentSubDocument {
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  amountReceived?: number; // f2f only
  invoiceId?: string;      // Xendit invoice ID
  invoiceUrl?: string;     // Xendit payment link
  paidAt?: string;
}

export interface ConditionReport {
  isGoodCondition?: boolean;
  notes?: string;
  checkedAt?: string;
}

export interface Booking {
  _id: string;
  customer: string | User;
  owner: string | User;
  car: string | Car;
  idDocument: string | IdDocument;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalPrice: number;
  serviceFeePercent?: number;
  serviceFee?: number;
  ownerPayout?: number;
  payout?: { status: "pending" | "released"; amount?: number; releasedAt?: string };
  deliveryMethod: DeliveryMethod;
  downPayment: PaymentSubDocument;
  balancePayment: PaymentSubDocument;
  status: BookingStatus;
  rejectionReason?: string;
  conditionReport?: ConditionReport;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingPayload {
  carId: string;
  startDate: string;
  endDate: string;
  deliveryMethod?: DeliveryMethod;
}

export interface ReturnCarPayload {
  isGoodCondition: boolean;
  notes?: string;
}

export interface PaymentSchema {
  amount: number;
  status: 'unpaid' | 'pending' | 'paid' | 'expired';
  method: 'online' | 'f2f';
  amountReceived?: number;
  invoiceId?: string;
  invoiceUrl?: string;
  paidAt?: string;
}

export interface Point {
  label: string;
  value: number;
}

// Reviews
export interface PublicReview {
  _id: string;
  message: string;
  createdAt: string;
  reviewerName: string;
}

export interface Review {
  _id: string;
  booking: string;
  car?: string;
  customer?: string;
  owner?: string;
  message?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ReviewEligibility {
  success: boolean;
  canReview: boolean;
  review: Review | null;
}

export interface CreateReviewPayload {
  message: string;
}

