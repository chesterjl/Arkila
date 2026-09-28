module.exports = {
  ROLES: { CUSTOMER: 'customer', OWNER: 'owner', ADMIN: 'admin' },
  PUBLIC_ROLES: ['customer', 'owner'],

  ID_LIMITS: { owner: 2, customer: 1 },

  DELIVERY_METHODS: [
    'self_pickup_self_return',      
    'self_pickup_owner_pickup',     
    'owner_delivery_self_return',   
    'owner_delivery_owner_pickup',  
  ],
  
  VEHICLE_TYPES: ['sedan', 'suv', 'hatchback', 'van', 'pickup', 'motorcycle', 'other'],
  FUEL_TYPES: ['gasoline', 'diesel', 'electric', 'hybrid'],

  CAR_LISTING_STATUS: {
    PENDING: 'pending',     // just created / re-submitted, waiting on the admin, not publicly visible
    APPROVED: 'approved',   // admin verified the registration doc, listing is public and bookable
    REJECTED: 'rejected',   // admin rejected it (e.g. bad/mismatched registration doc); cannot be rented
    SUSPENDED: 'suspended', // was approved, admin paused it; cannot receive NEW requests, existing bookings unaffected
  },
  
  BOOKING_STATUS: {
    PENDING: 'pending',       // request submitted, waiting for owner review
    REJECTED: 'rejected',     // owner rejected request / ID verification failed
    APPROVED: 'approved',     // owner approved, waiting for downpayment
    CONFIRMED: 'confirmed',   // downpayment paid
    ONGOING: 'ongoing',       // vehicle picked up
    RETURNED: 'returned',     // vehicle returned, waiting for owner condition check
    COMPLETED: 'completed',   // owner verified condition -> balance can be paid
    CANCELLED: 'cancelled',
  },

  BLOCKING_STATUSES: ['approved', 'confirmed', 'ongoing', 'returned'],
    // keep BLOCKING_STATUSES as is (committed bookings) and add:
  ACTIVE_BOOKING_STATUSES: ['pending', 'approved', 'confirmed', 'ongoing', 'returned'], // anything that holds a car

  BOOKING_LIMITS: {
    MAX_DAYS: 30,                 // longest single rental
    MAX_ADVANCE_DAYS: 180,        // how far ahead a rental can start
    MAX_PENDING_PER_CUSTOMER: 3,  // open requests per customer
    NOTE_MAX: 500,                // max length for notes/reasons
  },  

  ID_TYPES: ['Drivers License', 'Passport', 'SSID / UMID', 'Postal ID', 'Voters ID', 'National ID'],
};  