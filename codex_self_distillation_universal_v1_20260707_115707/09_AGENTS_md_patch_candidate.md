# AGENTS.md Patch Candidate

> 本文件是候选补丁，不是正式安装版本。人工确认后可复制为项目根目录 `AGENTS.md`。

```md
# AGENTS.md

## 语言

始终使用简体中文回复。

## 项目概况

本项目是管家调配系统，包含 Next.js App Router 管理后台、微信小程序、Prisma/MySQL 数据模型和多角色 API。修改时优先遵循现有分层：

- API route 放在 `app/api/**/route.ts`。
- 业务逻辑优先放在 `lib/**`。
- Web 管理后台页面放在 `app/(admin)/**`，复杂交互组件放在 `components/**`。
- 微信小程序页面、组件、服务放在 `miniprogram/**`。
- 数据模型和 migration 放在 `prisma/**`。

## 必须保护的业务不变量

- API 返回必须使用 `successResponse`、`errorResponse`、`handleApiError` 等统一响应工具。
- 请求参数必须优先使用 `lib/validators.ts` 中的 Zod schema。
- 后台登录使用 HttpOnly Cookie，小程序 API 使用 Bearer Token，但都基于同一 JWT 签名机制。
- 角色权限改动必须同步检查 `lib/permissions.ts`、后台菜单、API 权限和小程序入口。
- 订单是订单维度，管家分配必须通过 `OrderButlerAssignment` 表表达，不能把单个管家字段重新塞回订单。
- 多管家订单的确认、拒单、已接客、服务中、完成、取消派单必须维护 assignment 独立状态，并通过 `lib/order-status.ts` 刷新订单状态。
- 触及请假时必须检查时间冲突、管家状态刷新和已派单影响。
- 触及评价时必须关联具体 `assignmentId`，不能只评价订单或管家。
- 触及财务和导出时必须说明金额、结算状态、Excel 字段和筛选条件的影响。
- 关键业务动作应检查操作日志和站内通知是否需要同步更新。

## 验证命令

根据变更范围选择运行：

- 通用 TypeScript/ESLint：`npm run typecheck`、`npm run lint`
- Next 构建：`npm run build`
- 小程序 TypeScript：`npm run miniprogram:build`
- Prisma Client：`npm run prisma:generate`
- 数据库迁移状态：`npx prisma migrate status`

如果没有运行某条相关命令，最终回执必须说明原因。

## 高风险动作

以下动作必须先取得用户明确确认，不能自动执行：

- 真实数据库迁移、清库、批量更新历史数据。
- `scripts/backup-to-github.sh`、`git push`、发布、部署、远端备份。
- 外部账号、支付、真实客户触达、改价、库存、删除。

可以先生成 dry-run、fixture、candidate 或执行只读扫描，但不得误报为真实完成。

## Worker 启用规则

复杂任务必须显式拆成串行 worker 或真实 subagent：

- ResearchWorker：收集目标、代码路径、业务规则证据。
- PlanningWorker：定义修改范围、风险和验证命令。
- ExecutionWorker：执行最小必要改动。
- ReviewWorker：检查业务不变量、权限、状态流转和双端契约。
- ValidatorWorker：运行命令或评分脚本，输出失败项。
- ReceiptWorker：生成最终回执和未做事项。

小文案或单文件低风险改动可不启用 worker，但仍要说明验证情况。

## 产物质量

- 不用文件数量冒充完成。
- 不把 mock、dry-run、草案、只读扫描说成真实完成。
- 报告、审计、回执必须绑定证据路径；没有证据时标记 `evidence_missing`。
- 代码变更必须说明影响面、验证命令、残余风险和回滚方式。
- 用户已有未提交改动必须保留，不得擅自回退。
```
