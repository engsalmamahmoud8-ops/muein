export type UserRole = 'customer' | 'employee' | 'admin';

export type RequestStatus =
  | 'pending'
  | 'applications_received'
  | 'assigned'
  | 'on_the_way'
  | 'inspection_started'
  | 'quotation_provided'
  | 'customer_approved_quotation'
  | 'work_in_progress'
  | 'waiting_customer_response'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';
export type ImageType = 'issue_photo' | 'progress_photo' | 'completion_proof' | 'avatar';

export const ALLOWED_NEXT_STATUS: Record<RequestStatus, RequestStatus[]> = {
  pending: ['applications_received', 'cancelled'],
  applications_received: ['assigned', 'cancelled'],
  assigned: ['on_the_way', 'cancelled'],
  on_the_way: ['inspection_started'],
  inspection_started: ['quotation_provided', 'work_in_progress'],
  quotation_provided: ['customer_approved_quotation', 'cancelled'],
  customer_approved_quotation: ['work_in_progress'],
  work_in_progress: ['waiting_customer_response', 'completed', 'disputed'],
  waiting_customer_response: ['work_in_progress', 'completed'],
  completed: [],
  cancelled: [],
  disputed: [],
};
