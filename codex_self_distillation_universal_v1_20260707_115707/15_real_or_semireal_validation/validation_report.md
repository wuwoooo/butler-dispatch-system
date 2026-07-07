# 半真实验证报告

## 场景选择

P0 场景：防止报告/回执只写“功能很多、继续优化”而缺少证据、验证、风险和下一步。

选择原因：

- PDF 明确要求不要空泛总结、不要文件数量冒充完成。
- 当前项目 `README.md` 是主要交接入口，但更偏功能清单。
- 不需要真实外部权限，适合本轮验证。

## 样本

- Before fixture：`15_real_or_semireal_validation/fixture_before.md`
- After fixture：`15_real_or_semireal_validation/fixture_after.md`
- Validator：`14_validators/product_quality_validator_candidate.mjs`

## 验证状态

本验证是半真实 fixture，不代表真实历史失败样本；用于证明 validator 对“空泛报告”有区分能力。

## 实际运行结果

命令：

```bash
node codex_self_distillation_universal_v1_20260707_115707/14_validators/product_quality_validator_candidate.mjs codex_self_distillation_universal_v1_20260707_115707/15_real_or_semireal_validation/fixture_before.md
node codex_self_distillation_universal_v1_20260707_115707/14_validators/product_quality_validator_candidate.mjs codex_self_distillation_universal_v1_20260707_115707/15_real_or_semireal_validation/fixture_after.md
```

结果：

| 样本 | 分数 | 状态 | 关键问题 |
| --- | ---: | --- | --- |
| `fixture_before.md` | 15 | fail | 缺少任务目标、证据路径、结构、完成状态、风险回滚、复用沉淀 |
| `fixture_after.md` | 90 | pass | 仍可进一步减少泛泛表达，但已达到通过阈值 |

## 结论

建议将 validator 保留为候选，并在下一轮用于检查正式 `AGENTS.md` 安装回执或项目 handoff。该验证只证明脚本能识别报告质量底线，不证明业务功能已完成。
