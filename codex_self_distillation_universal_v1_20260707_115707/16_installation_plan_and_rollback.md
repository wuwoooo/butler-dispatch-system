# Installation Plan And Rollback

## 安装顺序

1. 人工审阅 `09_AGENTS_md_patch_candidate.md`。
2. 若接受，把代码块内容保存为项目根目录 `AGENTS.md`。
3. 运行一次低风险验证：`npm run typecheck`、`npm run lint`。
4. 二轮观察 agent 是否按 AGENTS 规则输出验证和风险。
5. 若仍稳定，再考虑安装 `11_new_skill_candidates/butler_dispatch_project_skill_candidate.md` 为个人 skill。

## 不建议直接安装

- 不直接安装 worker/longrun automation。
- 不直接修改系统级 skill。
- 不把备份发布脚本纳入自动化。

## 回滚方式

- AGENTS：删除或还原项目根目录 `AGENTS.md`。
- Skill：从 `$CODEX_HOME/skills` 移除对应 skill 目录。
- Validator：删除本输出目录或停止引用脚本。
- Worker/longrun：不安装则无需回滚；若后续安装，保留安装提交，使用 git revert。

## 人工确认项

- 是否允许创建正式项目 `AGENTS.md`。
- 是否允许新建本地 `butler-dispatch-project` skill。
- 是否允许未来运行数据库相关命令。
- 是否允许未来运行备份/推送脚本。
