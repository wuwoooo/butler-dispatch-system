# Skill 触发失败审计

本轮只审计可发现 skill 的触发适配度，不修改任何正式 skill。

| Skill | 路径 | 当前适配 | 触发风险 | 复用价值 | 主要问题 | 建议 |
| --- | --- | --- | ---: | ---: | --- | --- |
| `pdf` | `/Users/wuwoo/.codex/plugins/cache/openai-primary-runtime/pdf/.../SKILL.md` | 已触发 | 15 | 80 | PDF 读取够用，但对“基于 PDF 执行项目蒸馏”没有工程落地模板 | 增加“读取方法论 PDF 后生成 candidate 而非直接安装”的示例 |
| `yuying-display-feature-acceptance-guard` | `/Users/wuwoo/.codex/skills/yuying-display-feature-acceptance-guard/SKILL.md` | 不应触发 | 40 | 30 | 与本项目都是中文 Web/大屏验收，但名称和描述限定 YuYingPets | 保持不触发，避免跨项目误用 |
| `skill-creator` | `/Users/wuwoo/.codex/skills/.system/skill-creator/SKILL.md` | 本轮不直接触发 | 35 | 70 | 用户没有要求安装正式 skill，只要求项目蒸馏优化 | 二轮若选择安装新 skill，再触发 |
| `openai-docs` | `/Users/wuwoo/.codex/skills/.system/openai-docs/SKILL.md` | 不适用 | 10 | 20 | 本轮不需要查 OpenAI 文档 | 跳过 |
| `agently-mail` | `/Users/wuwoo/.agents/skills/agently-mail/SKILL.md` | 不适用 | 5 | 0 | 邮件任务无关 | 跳过 |

## 推荐 description patch

### pdf skill 补丁候选

```md
Use when a PDF contains process instructions, project audit criteria, or method prompts that must be converted into local project artifacts. Prefer extracting the document, mapping its requirements to repo evidence, and generating candidate reports or patches before modifying formal project rules.
```

### 新项目 skill 触发描述候选

```md
Use when working in the butler-dispatch-system repo, especially for 管家调配系统, 多管家派单, 订单状态流转, 请假审核, 评价, 财务导出, 微信小程序, 后台管理, 角色权限, 账号绑定, or project-specific audit/receipt tasks. It enforces repo commands, API contracts, cross-end checks, and business invariants.
```

## 结论

当前最大缺口不是已有 skill 装了没触发，而是本项目没有自己的 project skill 与 AGENTS 入口。建议先安装 AGENTS，再决定是否创建新 skill。
