# NEXT CODEX PROMPT

请继续基于 `codex_self_distillation_universal_v1_20260707_115707` 做第二轮执行。

## 二轮目标

1. 审阅 `09_AGENTS_md_patch_candidate.md`。
2. 如果我明确说“安装 AGENTS”，把候选内容安装到项目根目录 `AGENTS.md`。
3. 安装后运行 `npm run typecheck`、`npm run lint`。
4. 使用 `14_validators/product_quality_validator_candidate.mjs` 检查最终回执。
5. 如果我明确说“创建 skill”，再基于 `11_new_skill_candidates/butler_dispatch_project_skill_candidate.md` 创建本地 skill。

## 约束

- 没有我明确确认，不要安装正式 skill。
- 没有我明确确认，不要执行备份、推送、发布、真实数据库迁移。
- 不要覆盖我已有未提交改动。

## 验收

最终回复必须说明：

- 安装了什么。
- 跑了什么验证。
- 哪些没跑及原因。
- 如何回滚。
