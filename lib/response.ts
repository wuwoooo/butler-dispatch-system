import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function successResponse<T>(
  data: T,
  message = "ok",
  init?: ResponseInit
) {
  return NextResponse.json(
    {
      success: true,
      data,
      message
    },
    init
  );
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  init?: ResponseInit
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message
      }
    },
    {
      status,
      ...init
    }
  );
}

export function validationErrorResponse(error: ZodError) {
  const firstIssue = error.issues[0];
  return errorResponse(
    "VALIDATION_ERROR",
    firstIssue?.message ?? "参数校验失败",
    422
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return validationErrorResponse(error);
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    return errorResponse("DUPLICATE_RECORD", "数据已存在，请检查唯一字段", 409);
  }

  console.error(error);
  return errorResponse("INTERNAL_SERVER_ERROR", "服务器内部错误", 500);
}
