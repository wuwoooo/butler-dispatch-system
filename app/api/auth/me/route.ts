import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/request";
import { successResponse } from "@/lib/response";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiUser(request);

  if (!user) {
    return response;
  }

  return successResponse({ user });
}
