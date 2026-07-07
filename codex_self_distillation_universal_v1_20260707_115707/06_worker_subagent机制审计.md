# Worker / Subagent 机制审计

## 当前状态

当前项目没有发现正式 worker/subagent 配置、runner 级并发分工文件或 agent 交接规范。实际工程工作依赖单 agent 直接阅读、修改和验证。

## 是否需要 worker

需要，但应按任务复杂度启用，避免所有小改都流程化。

必须启用 worker 或串行模拟 worker 的场景：

- 跨 Web 管理后台和微信小程序的同一业务改动。
- 订单、派单、请假、评价、结算等状态流转变更。
- 权限、登录、账号绑定、解绑、密码重置。
- 导出、批量清理、备份、发布等高风险动作。
- 用户要求审计、蒸馏、验收、回执、长期任务。

不建议启用 worker 的场景：

- 单个文案修正。
- 单个样式微调且不影响布局。
- 明确无业务逻辑的重命名。
- 用户要求快速回答而非改代码。

## 推荐模板

| Worker | 输入 | 输出 | 验收 |
| --- | --- | --- | --- |
| ResearchWorker | 用户目标、项目路径、相关文件 | 事实摘要和证据路径 | 每条结论有路径 |
| EvidenceWorker | 扫描结果、文件列表 | 证据索引、可信度、时间戳 | 无证据项标记 `evidence_missing` |
| PlanningWorker | 目标和证据 | 实施顺序、风险、验证标准 | 可执行且范围明确 |
| ExecutionWorker | 计划和文件 | 代码/文档/candidate | 不覆盖无关改动 |
| ReviewWorker | diff 和业务规则 | 问题清单、遗漏、反例 | 指向文件和规则 |
| ValidatorWorker | 产物和阈值 | 分数、失败项、返工清单 | 可重复运行 |
| IntegrationWorker | 多路结果 | 合并后的最终产物 | 冲突已解决 |
| ReceiptWorker | 最终产物和验证结果 | 简洁回执、handoff、下一步 | 人类可快速接手 |

## 本项目专用 worker 文件

详见 `12_worker_subagent_candidates/butler_dispatch_worker_candidates.md`。
