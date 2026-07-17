import type { VehicleTypeValue } from "@/lib/vehicle-recommendation";

export type TransportHubType = "airport" | "train";

const defaultTransportFees: Record<
  "small" | "business",
  Record<TransportHubType, number>
> = {
  small: {
    airport: 100,
    train: 60
  },
  business: {
    airport: 130,
    train: 80
  }
};

export function getDefaultTransportFee(input: {
  pickupType: TransportHubType;
  vehicleType: VehicleTypeValue;
}) {
  const vehicleGroup = input.vehicleType === "business" ? "business" : "small";
  return defaultTransportFees[vehicleGroup][input.pickupType];
}

export function getDefaultTransportFeeText(input: {
  pickupType: TransportHubType;
  vehicleType: VehicleTypeValue;
}) {
  return getDefaultTransportFee(input).toFixed(2);
}

export function getDefaultTransportFeesByVehicleType(
  pickupType: TransportHubType
): Record<VehicleTypeValue, string> {
  return {
    sedan: getDefaultTransportFeeText({ pickupType, vehicleType: "sedan" }),
    suv: getDefaultTransportFeeText({ pickupType, vehicleType: "suv" }),
    business: getDefaultTransportFeeText({
      pickupType,
      vehicleType: "business"
    })
  };
}

export function getDefaultTransportFeeTotalText(input: {
  pickupType: TransportHubType;
  selectedVehicleTypes: Array<VehicleTypeValue | null | undefined>;
  fallbackVehicleType: VehicleTypeValue;
}) {
  const vehicleTypes =
    input.selectedVehicleTypes.length > 0
      ? input.selectedVehicleTypes
      : [input.fallbackVehicleType];

  return vehicleTypes
    .reduce(
      (total, vehicleType) =>
        total +
        getDefaultTransportFee({
          pickupType: input.pickupType,
          vehicleType: vehicleType ?? input.fallbackVehicleType
        }),
      0
    )
    .toFixed(2);
}
