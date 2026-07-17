export type HotelSummary = {
  id: string;
  code?: string;
  name: string;
  address?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  phone?: string | null;
  status?: string;
  roomTypes?: HotelRoomTypeRecord[];
  rooms?: HotelRoomRecord[];
  _count?: {
    users: number;
    orders: number;
    roomTypes: number;
    rooms: number;
  };
};

export type HotelRoomTypeRecord = {
  id: string;
  hotelId?: string;
  code?: string | null;
  name: string;
  sort: number;
  enabled: boolean;
  remark?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type HotelRoomRecord = {
  id: string;
  hotelId: string;
  roomTypeId: string;
  roomNo: string;
  enabled: boolean;
  remark?: string | null;
  createdAt?: string;
  updatedAt?: string;
  roomType: Pick<HotelRoomTypeRecord, "id" | "code" | "name" | "enabled">;
};

export type ButlerSummary = {
  id: string;
  code?: string;
  name: string;
  phone?: string;
  status?: string;
  vehicleType?: "sedan" | "suv" | "business" | null;
  vehicleInfo?: string | null;
  dispatchEnabled?: boolean;
  averageScore?: number | string;
  reviewCount?: number;
  activeAssignments?: ButlerActiveAssignmentRecord[];
};

export type ButlerActiveAssignmentRecord = {
  id: string;
  status: string;
  assignedAt?: string;
  confirmedAt?: string | null;
  pickedGuestAt?: string | null;
  serviceStartedAt?: string | null;
  order?: {
    id: string;
    orderNo?: string;
    guestName?: string;
    checkInDate?: string;
    checkOutDate?: string;
    arrivalTime?: string;
    hotel?: {
      name: string;
    } | null;
  } | null;
};

export type UserSummary = {
  id: string;
  username?: string;
  name: string;
  roleCode?: string;
  status?: string;
};

export type OrderAssignmentRecord = {
  id: string;
  orderId?: string;
  status: string;
  assignedAt?: string;
  confirmedAt?: string | null;
  rejectedAt?: string | null;
  pickedGuestAt?: string | null;
  serviceStartedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  rejectReason?: string | null;
  remark?: string | null;
  butler?: ButlerSummary;
  assignedBy?: UserSummary | null;
};

export type StayExtensionRecord = {
  id: string;
  assignmentId: string;
  originalCheckOutAt: string;
  requestedCheckOutAt: string;
  reason?: string | null;
  status: "pending" | "approved" | "rejected";
  requestedBy?: UserSummary;
  reviewedBy?: UserSummary | null;
  reviewedAt?: string | null;
  reviewRemark?: string | null;
  createdAt: string;
};

export type OrderRecord = {
  id: string;
  orderNo: string;
  hotel?: HotelSummary;
  hotelId?: string;
  createdBy?: UserSummary;
  createdById?: string;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  serviceMode?: "stay" | "transport";
  transportDirection?: "pickup" | "dropoff" | null;
  serviceStartAt?: string;
  serviceEndAt?: string;
  checkInDate: string;
  checkOutDate?: string | null;
  roomType?: string | null;
  roomNo?: string | null;
  pickupType: string;
  arrivalStation: string;
  arrivalTime: string;
  flightTrainNo?: string | null;
  destination?: string | null;
  requestedVehicleType?: "sedan" | "suv" | "business" | null;
  requestedVehicleInfo?: string | null;
  specialNeeds?: string | null;
  status: string;
  remark?: string | null;
  settlementAmount?: string | number | null;
  settlementStatus?: string;
  createdAt: string;
  updatedAt: string;
  assignments?: OrderAssignmentRecord[];
  stayExtensions?: StayExtensionRecord[];
  rejectRecords?: Array<{
    id: string;
    reason: string;
    createdAt: string;
    butler?: ButlerSummary;
    createdBy?: UserSummary | null;
  }>;
  operationLogs?: Array<{
    id: string;
    operationType: string;
    remark?: string | null;
    createdAt: string;
    operator?: UserSummary | null;
  }>;
  notifications?: Array<{
    id: string;
    title: string;
    createdAt: string;
    recipient?: UserSummary | null;
  }>;
};

export type AvailableButlerRecord = ButlerSummary & {
  available: boolean;
  unavailableReasons: string[];
  recommended: boolean;
  recommendedVehicleType: "sedan" | "suv" | "business";
  recommendationSource: "order_request" | "guest_count";
  user?: UserSummary | null;
};

export type LeaveRecord = {
  id: string;
  butlerId: string;
  butler?: ButlerSummary;
  leaveType: string;
  reason: string;
  startAt: string;
  endAt: string;
  status: string;
  reviewerId?: string | null;
  reviewer?: UserSummary | null;
  reviewedAt?: string | null;
  reviewRemark?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReviewRecord = {
  id: string;
  orderId: string;
  assignmentId: string;
  butlerId: string;
  reviewerId: string;
  reviewerRole: string;
  score: number;
  overallScore: number;
  attitudeScore: number;
  punctualityScore: number;
  communicationScore: number;
  complaintFlag: boolean;
  content?: string | null;
  tags?: string[] | unknown;
  createdAt: string;
  updatedAt: string;
  order?: Pick<OrderRecord, "id" | "orderNo" | "guestName"> & {
    hotel?: HotelSummary;
  };
  butler?: ButlerSummary;
  reviewer?: UserSummary;
};

export type ButlerStatisticsRecord = {
  butlerId: string;
  code?: string;
  name: string;
  phone: string;
  status: string;
  orderCount: number;
  completedOrderCount: number;
  guestCount: number;
  rejectCount: number;
  rejectRate: number;
  averageScore: number;
  goodReviewRate: number;
  leaveDays: number;
  reviewCount: number;
};

export type NotificationRecord = {
  id: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  readAt?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OperationLogRecord = {
  id: string;
  operationType: string;
  targetType: string;
  targetId?: string | null;
  remark?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  createdAt: string;
  operator?: UserSummary | null;
};

export type SystemDictRecord = {
  id: string;
  dictType: string;
  label: string;
  value: string;
  sort: number;
  enabled: boolean;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FinanceOrderRecord = {
  id: string;
  orderNo: string;
  hotelName: string;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  serviceMode?: "stay" | "transport";
  transportDirection?: "pickup" | "dropoff" | null;
  serviceStartAt?: string;
  serviceEndAt?: string;
  checkInDate: string;
  checkOutDate?: string | null;
  pickupType: string;
  arrivalStation: string;
  arrivalTime: string;
  flightTrainNo?: string | null;
  status: string;
  butlerNames: string[];
  serviceCompletedAt?: string | null;
  serviceStartedAt?: string | null;
  serviceDuration?: string | null;
  frontdeskAverageScore: number;
  dispatcherAverageScore: number;
  settlementAmount?: string | number | null;
  settlementStatus: string;
  settlementRemark?: string | null;
  createdAt: string;
};

export type ButlerServiceRecord = {
  id: string;
  butlerName: string;
  butlerPhone: string;
  orderNo: string;
  hotelName: string;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  checkInDate: string;
  checkOutDate?: string | null;
  pickupType: string;
  arrivalTime: string;
  assignmentStatus: string;
  isRejected: boolean;
  isCompleted: boolean;
  overallScore: number;
  confirmedAt?: string | null;
  pickedGuestAt?: string | null;
  serviceStartedAt?: string | null;
  completedAt?: string | null;
  serviceDuration?: string | null;
};

export type HotelStatisticRecord = {
  hotelId: string;
  hotelName: string;
  orderCount: number;
  completedOrderCount: number;
  inServiceOrderCount: number;
  pendingDispatchOrderCount: number;
  pendingReviewOrderCount: number;
  cancelledOrderCount: number;
  guestCount: number;
  airportOrderCount: number;
  trainOrderCount: number;
  averageScore: number;
};

export type AbnormalRecordItem = {
  id: string;
  abnormalType: string;
  description: string;
  status: string;
  handleResult?: string | null;
  handledAt?: string | null;
  createdAt: string;
  order?: Pick<
    OrderRecord,
    "id" | "orderNo" | "guestName" | "checkInDate" | "checkOutDate" | "roomType" | "roomNo"
  > & {
    hotel?: HotelSummary;
  };
  butler?: ButlerSummary | null;
  createdBy?: UserSummary | null;
  handledBy?: UserSummary | null;
};
