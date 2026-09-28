export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://stucco-epileptic-gumminess.ngrok-free.dev";

export const API_ENDPOINTS = {
  REGISTER: "/users/register",                 
  LOGIN: "/users/login",
  GET_MY_INFO: "/users/info",
  UPDATE_MY_INFO: "/users/info",                
  UPDATE_PASSWORD: "/users/password",                

  GET_ADMIN_USERS: (role?: string) => `/users/admin/users${role ? `?role=${role}` : ""}`,
  GET_ADMIN_PENDING_OWNERS: "/users/admin/owners/pending",
  APPROVE_OWNER: (id: string) => `/users/admin/owners/${id}/approve`,
  REJECT_OWNER: (id: string) => `/users/admin/owners/${id}/reject`,

  GET_CARS: "/cars",                          
  GET_CAR: (id: string) => `/cars/${id}`,     
  CREATE_CAR: "/cars",                       
  UPDATE_CAR: (id: string) => `/cars/${id}`,  
  DELETE_CAR: (id: string) => `/cars/${id}`,   
  GET_OWNER_CARS_LIST: "/cars/owner",                    
  GET_OWNER_PENDING_CARS_LIST: "/cars/owner/pending",    

  APPROVE_CAR: (id: string) => `/cars/${id}/approve`, 
  REJECT_CAR: (id: string) => `/cars/${id}/reject`,   
  SUSPEND_CAR: (id: string) => `/cars/${id}/suspend`,  
  REINSTATE_CAR: (id: string) => `/cars/${id}/reinstate`, 
  GET_ADMIN_CARS_LIST: "/cars/admin",           
  GET_ADMIN_PENDING_CARS_LIST: "/cars/admin/pending",   

  CREATE_BOOKING: "/bookings",                 
  GET_CUSTOMER_PENDING_BOOKINGS: "/bookings/customer",            
  GET_CUSTOMER_BOOKINGS_HISTORY: "/bookings/customer/history",          
  GET_BOOKING: (id: string) => `/bookings/${id}`, 
  CANCEL_BOOKING: (id: string) => `/bookings/${id}/cancel`,   
  PAY_DOWNPAYMENT: (id: string) => `/bookings/${id}/pay-downpayment`, 
  PAY_BALANCE: (id: string) => `/bookings/${id}/pay-balance`, 

  GET_OWNER_PENDING_BOOKINGS: "/bookings/owner/pending",
  GET_OWNER_BOOKING_HISTORY: "/bookings/owner/history",  
  CONDITION_REPORT: (id: string) => `/bookings/${id}/condition-report`,
  APPROVE_BOOKING: (id: string) => `/bookings/${id}/approve`, 
  REJECT_BOOKING: (id: string) => `/bookings/${id}/reject`,  
  PICKUP_BOOKING: (id: string) => `/bookings/${id}/pickup`, 
  RETURN_BOOKING: (id: string) => `/bookings/${id}/return`,  
  COMPLETE_BOOKING: (id: string) => `/bookings/${id}/complete`, 
  
  VERIFY_BOOKING: (id: string) => `/payments/${id}/verify-payment`, 
  CONFIRM_BALANCE_F2F: (customerId: string) => `bookings/${customerId}/check-payment-f2f`,
  // ML demand prediction (proxied through the Express backend -> FastAPI service)
  PREDICT_DEMAND: "/ml/predict-demand",
  RECOMMEND_CARS: "/ml/recommend-cars",
};