# Installation Receipt

## 已安装

- 项目级规则：`AGENTS.md`
- 用户级 skill：`/Users/wuwoo/.codex/skills/butler-dispatch-project`

## 安装决策

只安装 `butler-dispatch-project` skill。原因：

- 它直接对应当前仓库的真实工作流：管家调配、多管家派单、订单状态、请假、评价、财务导出、微信小程序、后台管理、权限、账号绑定、审计和回执。
- 它包含可复用的报告/回执质量 validator。
- 它不会污染系统级或其它项目专用 skill。

未安装：

- PDF skill patch：属于系统技能增强建议，不适合本轮直接改系统 skill。
- YuYing display skill 边界 patch：该 skill 属于其它项目，本轮不应改动。
- longrun/automation：需要更长观察周期和人工确认。

## 验证

- `uv run --with pyyaml python /Users/wuwoo/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/wuwoo/.codex/skills/butler-dispatch-project`：通过。
- `node /Users/wuwoo/.codex/skills/butler-dispatch-project/scripts/product_quality_validator.mjs codex_self_distillation_universal_v1_20260707_115707/15_real_or_semireal_validation/fixture_after.md`：90 分，通过。
- `npm run typecheck`：通过。
- `npm run lint`：通过。

## 回滚

- 删除项目根目录 `AGENTS.md` 可回滚项目级规则。
- 删除 `/Users/wuwoo/.codex/skills/butler-dispatch-project` 可回滚用户级 skill。

## 未执行

- 未运行 `npm run build`，因为本轮只安装规则和 skill，未改运行时代码。
- 未运行 `npm run miniprogram:build`，因为未改小程序源码。
- 未执行数据库、备份、推送、发布等高风险动作。
