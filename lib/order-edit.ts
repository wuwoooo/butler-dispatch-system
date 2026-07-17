const transportUpdateFields = [
  "hotelId",
  "guestName",
  "guestPhone",
  "guestCount",
  "roomType",
  "roomNo",
  "pickupType",
  "transportDirection",
  "arrivalStation",
  "serviceStartAt",
  "serviceEndAt",
  "flightTrainNo",
  "requestedVehicleInfo",
  "requestedVehicleType",
  "settlementAmount",
  "specialNeeds",
  "remark"
] as const;

const nullableFields = [
  "roomType",
  "roomNo",
  "flightTrainNo",
  "requestedVehicleInfo",
  "requestedVehicleType",
  "settlementAmount",
  "specialNeeds",
  "remark"
] as const;

export function buildTransportOrderUpdatePayload(
  values: Record<string, unknown>
) {
  const payload = Object.fromEntries(
    transportUpdateFields.map((field) => [field, values[field]])
  );

  for (const field of nullableFields) {
    if (payload[field] === undefined || payload[field] === "") {
      payload[field] = null;
    }
  }

  return payload;
}
