# YuYing Display Skill Boundary Candidate

## 结论

该 skill 与当前项目无直接关系，不建议改成通用前端验收 skill。它的 description 已限定 YuYingPets Display-App/admin-web，当前管家调配系统不应触发。

## 风险

中文 UI、后台页面、截图矩阵等关键词可能让 agent 误以为可复用，但项目领域完全不同。

## 边界 patch 候选

```md
Do not use for unrelated Chinese admin systems, generic Next.js backends, or non-YuYingPets projects even if they involve screenshots, viewport checks, dashboards, or display pages.
```

## 替代建议

为本项目新建独立 `butler-dispatch-project` skill，而不是复用 YuYing skill。
