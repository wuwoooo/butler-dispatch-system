# Butler Dispatch Worker Candidates

## DispatchFlowReviewWorker

- 触发：修改派单、取消派单、确认、拒单、接客、完成服务。
- 输入：相关 API route、`lib/order-status.ts`、`prisma/schema.prisma`。
- 输出：状态流转表、边界案例、缺失日志/通知项。
- 验收：订单状态与 `OrderButlerAssignment.status` 不冲突；多管家场景有部分完成/部分拒单处理。

## PermissionReviewWorker

- 触发：新增后台菜单、API、账号功能、微信绑定。
- 输入：`lib/permissions.ts`、`app/(admin)/layout.tsx`、相关 API route、小程序入口。
- 输出：角色矩阵变更说明。
- 验收：admin/dispatcher/hotel_frontdesk/butler/finance 的访问边界明确。

## CrossEndContractWorker

- 触发：同一业务同时涉及后台和小程序。
- 输入：`app/api/**`、`miniprogram/services/**`、对应页面。
- 输出：请求/响应字段映射和兼容性风险。
- 验收：小程序请求层能处理 API 返回，401 和错误提示一致。

## FinanceExportWorker

- 触发：结算、金额、导出字段、筛选条件。
- 输入：`lib/finance.ts`、`lib/export.ts`、`lib/export-data.ts`、`app/api/export/**`。
- 输出：字段清单、金额规则、Excel 验收点。
- 验收：导出列与页面筛选一致，金额字段不丢精度。

## ReceiptWorker

- 触发：任何复杂任务完成前。
- 输入：diff、验证结果、未做事项。
- 输出：简洁中文最终回执。
- 验收：不超过必要长度，包含验证和风险。
