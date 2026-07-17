export const vehicleTypeValues = ["sedan", "suv", "business"] as const;

export type VehicleTypeValue = (typeof vehicleTypeValues)[number];

export const vehicleTypeLabels: Record<VehicleTypeValue, string> = {
  sedan: "轿车",
  suv: "SUV",
  business: "商务车"
};

const businessVehiclePatterns = [
  /商务/i,
  /\bGL8\b/i,
  /\bM8\b/i,
  /\bMPV\b/i,
  /赛那/i,
  /奥德赛/i,
  /大霸王/i
];

export function detectVehicleType(value: unknown): VehicleTypeValue | null {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  if (businessVehiclePatterns.some((pattern) => pattern.test(text))) {
    return "business";
  }

  if (/SUV/i.test(text)) {
    return "suv";
  }

  if (/轿车|小车/i.test(text)) {
    return "sedan";
  }

  return null;
}

export function recommendVehicleTypeByGuestCount(
  guestCount: number
): VehicleTypeValue {
  if (guestCount >= 5) {
    return "business";
  }

  if (guestCount === 4) {
    return "suv";
  }

  return "sedan";
}

export function resolveRecommendedVehicle(input: {
  guestCount: number;
  requestedVehicleType?: VehicleTypeValue | null;
}) {
  if (input.requestedVehicleType) {
    return {
      vehicleType: input.requestedVehicleType,
      source: "order_request" as const
    };
  }

  return {
    vehicleType: recommendVehicleTypeByGuestCount(input.guestCount),
    source: "guest_count" as const
  };
}

export function sortVehicleRecommendationCandidates<
  T extends { available: boolean; recommended: boolean }
>(candidates: T[]) {
  return candidates
    .map((candidate, originalIndex) => ({ candidate, originalIndex }))
    .sort((left, right) => {
      const leftRank = left.candidate.available
        ? left.candidate.recommended
          ? 0
          : 1
        : 2;
      const rightRank = right.candidate.available
        ? right.candidate.recommended
          ? 0
          : 1
        : 2;
      return leftRank - rightRank || left.originalIndex - right.originalIndex;
    })
    .map((item) => item.candidate);
}
