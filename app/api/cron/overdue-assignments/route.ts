import { NextRequest } from "next/server";
import { resolveOverdueAssignments } from "@/lib/overdue-assignments";
import { errorResponse, handleApiError, successResponse } from "@/lib/response";

export async function GET(request: NextRequest) {
  return runCron(request);
}

export async function POST(request: NextRequest) {
  return runCron(request);
}

async function runCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const headerSecret = request.headers.get("x-cron-secret");
    const bearerSecret = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "");
    const querySecret = request.nextUrl.searchParams.get("secret");

    if (![headerSecret, bearerSecret, querySecret].includes(secret)) {
      return errorResponse("FORBIDDEN", "定时任务密钥不正确", 403);
    }
  } else if (process.env.NODE_ENV === "production") {
    return errorResponse("CRON_SECRET_REQUIRED", "生产环境必须配置 CRON_SECRET", 500);
  }

  try {
    const dryRun = request.nextUrl.searchParams.get("dryRun") === "true";
    const result = await resolveOverdueAssignments({ dryRun });
    return successResponse(result, dryRun ? "过期派单扫描预览完成" : "过期派单处理完成");
  } catch (error) {
    return handleApiError(error);
  }
}
