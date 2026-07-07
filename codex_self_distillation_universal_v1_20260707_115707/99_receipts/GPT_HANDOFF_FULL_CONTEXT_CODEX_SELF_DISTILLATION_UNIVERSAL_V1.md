# Full Context Handoff

## 用户任务

用户要求：根据 PDF《分享：Codex 自我蒸馏通用 Prompt：让你的本地 Agent 从历史工作中自动进化.pdf》对当前项目进行蒸馏优化。

## 输入 PDF 要点

- 先审计，后生成候选。
- 不覆盖正式 skill、正式配置、正式项目规则。
- 输出新的安全目录。
- 必须包含回执、总览、证据索引、工作流清单、skill 审计、worker 审计、质量诊断、优先级矩阵、AGENTS patch candidate、skill candidates、worker candidates、validator、验证报告、安装计划、二轮 prompt。
- 至少做一次真实或半真实验证。

## 当前项目

- 路径：`/Users/wuwoo/Desktop/work/_管家调配系统/butler-dispatch-system`
- 技术栈：Next.js App Router、TypeScript、Ant Design、Prisma、MySQL、微信小程序。
- 关键命令：`npm run lint`、`npm run typecheck`、`npm run miniprogram:build`、`npm run build`。
- 当前已有未提交改动：`app/globals.css`、`app/login/page.tsx`、`next-env.d.ts`，本轮未触碰。

## 本轮产物

输出目录：`codex_self_distillation_universal_v1_20260707_115707`

已创建所有要求的核心文件和子目录。正式业务代码未修改。

## 建议下一步

先让用户审阅 `00_GPT可点击回执.md` 和 `09_AGENTS_md_patch_candidate.md`。只有在用户明确说“安装 AGENTS”时，才把候选写到项目根目录。
