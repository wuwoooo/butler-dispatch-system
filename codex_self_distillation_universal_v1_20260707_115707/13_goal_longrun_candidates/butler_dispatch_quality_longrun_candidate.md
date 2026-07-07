# Longrun Candidate: Butler Dispatch Quality Watch

## 目标

周期性扫描项目中的业务规则、文档、测试/构建状态和 agent 规则候选，防止状态流转、权限、双端契约逐步漂移。

## 不允许

- 不允许自动执行真实数据库迁移。
- 不允许自动推送、部署、备份。
- 不允许无新证据时空转。

## Heartbeat

每轮必须记录：

- `artifact_delta`：新增/变化的代码、文档、报告。
- `validator_delta`：新增/变化的验证命令和结果。
- `repair_delta`：修复了哪些失败项。
- `blocked_queue`：阻塞项和需要人工确认的动作。

## 停止条件

- 连续两轮没有 artifact_delta、validator_delta、repair_delta。
- 同一阻塞项连续三轮无法推进。
- 用户要求停止。

## 候选执行命令

- `npm run typecheck`
- `npm run lint`
- `npm run miniprogram:build`
- `npm run build`

这些命令应根据变更范围选择，不应在无关任务里机械全跑。
