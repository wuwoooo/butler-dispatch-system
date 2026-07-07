# Generic Worker Template Candidate

## Trigger

任务满足任一条件时启用：

- 跨多个模块或端。
- 涉及高风险业务状态。
- 用户要求审计、验收、蒸馏、回执。
- 需要证据、评分、验证或安装计划。

## Sequential simulation

当前环境即使不启用真实 subagent，也可按以下顺序串行模拟：

1. ResearchWorker：读取需求和关键文件，输出证据路径。
2. EvidenceWorker：建立证据索引，标记不可读和缺失项。
3. PlanningWorker：列修改范围、风险、验证命令。
4. ExecutionWorker：生成候选或代码变更。
5. ReviewWorker：对照业务不变量和用户目标审查。
6. ValidatorWorker：运行脚本或评分。
7. IntegrationWorker：合并冲突，更新入口回执。
8. ReceiptWorker：生成最终交接。

## Completion gate

没有 evidence、validator 或 receipt 的复杂任务不能标记为完成。
