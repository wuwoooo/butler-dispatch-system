import { NextRequest } from "next/server";
import { getButlerStatistics } from "@/lib/statistics";
import { writeOperationLog } from "@/lib/logger";
import { requireApiRoles } from "@/lib/request";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";
import { statisticsQuerySchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { user, response } = await requireApiRoles(request, ["butler"]);

  if (!user) {
    return response;
  }

  if (!user.butlerId) {
    return errorResponse("BUTLER_NOT_BOUND", "当前账号未绑定管家档案", 422);
  }

  try {
    const query = statisticsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const statistics = await getButlerStatistics(user.butlerId, query);

    await writeOperationLog({
      operatorId: user.id,
      operationType: "VIEW_BUTLER_STATISTICS",
      targetType: "Butler",
      targetId: user.butlerId,
      remark: "管家查看个人统计"
    });

    return successResponse(statistics);
  } catch (error) {
    return handleApiError(error);
  }
}
