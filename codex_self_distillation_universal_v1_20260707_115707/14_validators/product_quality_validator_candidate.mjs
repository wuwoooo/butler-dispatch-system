#!/usr/bin/env node
import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node product_quality_validator_candidate.mjs <markdown-file>");
  process.exit(2);
}

const text = fs.readFileSync(file, "utf8");

const checks = [
  {
    name: "回答用户目标",
    maxPoints: 15,
    test: () => /任务|目标|task|用户/.test(text),
    rework: "补充任务目标，并说明产物如何满足目标。"
  },
  {
    name: "证据路径",
    maxPoints: 15,
    test: () => /`[^`]+`/.test(text) || /\/[A-Za-z0-9_.\-/\u4e00-\u9fa5]+/.test(text),
    rework: "为关键结论补充文件路径、命令输出或证据位置。"
  },
  {
    name: "结构清晰",
    maxPoints: 10,
    test: () => /^#{1,3}\s+/m.test(text) && text.split(/\n#{1,3}\s+/).length >= 3,
    rework: "增加清晰标题结构，至少包含入口、发现、下一步。"
  },
  {
    name: "非空话",
    maxPoints: 10,
    test: () => {
      const vague = (text.match(/建议优化|持续完善|提升质量|加强管理|最佳实践/g) || []).length;
      return vague <= 3 && text.length > 600;
    },
    rework: "减少泛泛建议，改成可执行 patch、命令、清单或证据。"
  },
  {
    name: "完成状态诚实",
    maxPoints: 15,
    test: () => /未做|没有做|dry-run|mock|草案|candidate|真实|半真实|验证/.test(text),
    rework: "明确区分 candidate、mock、dry-run 与真实完成。"
  },
  {
    name: "验证充分",
    maxPoints: 15,
    test: () => /npm run|validator|验证|评分|测试|build|lint|typecheck/.test(text),
    rework: "补充验证命令、评分表或人工验收标准。"
  },
  {
    name: "风险和回滚",
    maxPoints: 10,
    test: () => /风险|回滚|rollback|人工确认|高风险|未验证/.test(text),
    rework: "补充风险、回滚方式和人工确认项。"
  },
  {
    name: "可复用性",
    maxPoints: 10,
    test: () => /AGENTS|skill|validator|worker|复用|沉淀/.test(text),
    rework: "说明哪些内容可沉淀为 AGENTS、skill、validator 或 worker。"
  }
];

let score = 0;
const items = checks.map((check) => {
  const passed = check.test();
  const points = passed ? check.maxPoints : 0;
  score += points;
  return {
    name: check.name,
    points,
    maxPoints: check.maxPoints,
    evidence: passed ? "matched" : "missing",
    note: passed ? "ok" : check.rework
  };
});

const rework = items.filter((item) => item.points === 0).map((item) => item.note);
const status = score >= 80 ? "pass" : score >= 70 ? "needs_rework" : "fail";

console.log(JSON.stringify({ score, status, items, rework }, null, 2));
if (score < 70) {
  process.exit(1);
}
