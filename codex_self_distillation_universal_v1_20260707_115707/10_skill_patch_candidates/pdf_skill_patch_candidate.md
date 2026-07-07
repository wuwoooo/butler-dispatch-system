# PDF Skill Patch Candidate

## 目标

增强 PDF skill 在“读取方法论 PDF 并落地为项目候选产物”场景中的触发和流程。

## Description patch

```md
Read, inspect, render, and verify PDF files. Also use when a PDF contains process instructions, audit criteria, or project improvement prompts that must be converted into local project artifacts. In that case, extract the PDF, map requirements to repo evidence, generate candidate reports/patches/validators first, and avoid installing formal rules until the user confirms.
```

## SKILL.md patch

```md
### Process-PDF-To-Project-Artifacts

When a PDF is a methodology or prompt rather than a final document:

1. Extract text and record page count.
2. Identify mandatory outputs, safety constraints, and validation requirements.
3. Scan the current repo for matching evidence paths.
4. Generate candidate artifacts in a new output directory.
5. Do not overwrite formal AGENTS.md, skills, automations, or config unless the user explicitly confirms.
6. Run at least one realistic or semi-realistic validation and mark its status honestly.
```

## Smoke test

- Input: a PDF prompt requiring candidate generation.
- Expected: output directory with receipt, evidence index, patch candidate, validator candidate, validation report.
- Forbidden: direct overwrite of formal project rules.
