# Skill Candidate: butler-dispatch-project

## Proposed name

`butler-dispatch-project`

## Description

Use when working in the `butler-dispatch-system` repo, especially for 管家调配系统, 多管家派单, 订单状态流转, 管家请假, 评价, 财务结算, Excel 导出, 通知, 操作日志, 微信小程序, 后台管理, 角色权限, 账号绑定, or project audit/receipt tasks. Enforces repo commands, API contracts, Web/miniprogram cross-checks, and business invariants.

## When to use

- 用户提到“管家调配系统”“派单”“多管家”“小程序”“后台管理”“请假审核”“财务导出”“账号绑定”。
- 修改 `app/api/**`、`lib/**`、`components/**`、`miniprogram/**`、`prisma/**`。
- 做审计、验收、回执、文档更新、handoff。

## When not to use

- 纯邮件、图片生成、PDF 排版、非本仓库任务。
- 与本项目无关的 YuYingPets 或其它项目。
- 用户只问通用 Next.js/Prisma 概念且不需要本仓库上下文。

## Required workflow

1. 读取 `README.md`、`package.json` 和受影响模块。
2. 判断影响面：Web、API、小程序、Prisma、权限、通知、日志、导出。
3. 修改前保护用户未提交改动。
4. 业务 API 使用统一响应和 Zod 校验。
5. 状态流转优先复用 `lib/order-status.ts`。
6. 双端变更检查 `miniprogram/services/request.ts` 和对应页面。
7. 运行或说明未运行 `npm run typecheck`、`npm run lint`、`npm run miniprogram:build`、`npm run build`。
8. 最终回执包含变更、验证、风险、回滚。

## Output contract

- 变更摘要。
- 证据路径。
- 验证命令与结果。
- 未验证项和原因。
- 是否需要人工确认。

## Validator

使用 `14_validators/product_quality_validator_candidate.mjs` 检查回执或报告质量；代码变更还必须跑项目脚本。
