// constant.js

module.exports = {
  ROLES: {
    CUSTOMER: 'customer',
    OWNER: 'owner',
    ADMIN: 'admin',
  },

  PUBLIC_ROLES: ['customer', 'owner'],

  ID_LIMITS: {
    owner: 2,
    customer: 1,
  },

  DELIVERY_METHODS: [
    'self_pickup_self_return',
    'self_pickup_owner_pickup',
    'owner_delivery_self_return',
    'owner_delivery_owner_pickup',
  ],

  VEHICLE_TYPES: [
    'sedan',
    'suv',
    'hatchback',
    'van',
    'pickup',
    'motorcycle',
    'other',
  ],

  FUEL_TYPES: [
    'gasoline',
    'diesel',
    'electric',
    'hybrid',
  ],

  CAR_LISTING_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    SUSPENDED: 'suspended',
  },

  BOOKING_STATUS: {
    PENDING: 'pending',
    REJECTED: 'rejected',
    APPROVED: 'approved',
    CONFIRMED: 'confirmed',
    ONGOING: 'ongoing',
    RETURNED: 'returned',
    // Balance has been completely paid, but the customer
    // still needs to decide whether to leave a review.
    REVIEW_PENDING: 'review_pending',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  },

  BLOCKING_STATUSES: [
    'approved',
    'confirmed',
    'ongoing',
    'returned',
  ],

  // Any status here means the booking still holds the car.
  ACTIVE_BOOKING_STATUSES: [
    'pending',
    'approved',
    'confirmed',
    'ongoing',
    'returned',
    'review_pending',
  ],

  PLATFORM_FEE_PERCENT: 10,

  BOOKING_LIMITS: {
    MAX_DAYS: 30,
    MAX_ADVANCE_DAYS: 180,
    MAX_PENDING_PER_CUSTOMER: 3,
    NOTE_MAX: 500,
  },

  REVIEW_LIMITS: {
    MESSAGE_MAX: 500,
  },
};  