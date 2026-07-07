# 项目说明样本（after）

## 任务

为管家调配系统补充可验收的项目交接说明，避免只用功能清单冒充完成。

## 证据路径

- `README.md`：现有功能、API、默认账号。
- `package.json`：`npm run lint`、`npm run typecheck`、`npm run miniprogram:build`、`npm run build`。
- `prisma/schema.prisma`：订单、多管家派单、请假、评价、结算模型。
- `lib/order-status.ts`：派单、确认、取消、完成后的订单状态刷新。

## 验证

- 本样本是 candidate，不代表真实业务改动。
- 后续安装前应运行：`npm run typecheck`、`npm run lint`、`npm run miniprogram:build`。

## 风险和回滚

- 未连接数据库，未运行 migration，未执行备份脚本。
- 若安装 AGENTS 后影响 agent 行为，可删除项目根目录 `AGENTS.md` 回滚。

## 可复用沉淀

- 将业务不变量沉淀到 `AGENTS.md`。
- 将项目触发词沉淀为 `butler-dispatch-project` skill。
- 将报告质量检查沉淀为 validator。
