"use client";

import { Space, Tag, Typography } from "antd";

export function ModulePlaceholder({
  title,
  description,
  tags
}: {
  title: string;
  description: string;
  tags: string[];
}) {
  return (
    <section className="page-panel" style={{ display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      {/* 装饰发光微丸 */}
      <div 
        style={{
          position: "absolute",
          top: "-50px",
          right: "-50px",
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.02) 60%, transparent 100%)",
          filter: "blur(20px)",
          pointerEvents: "none"
        }} 
      />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 20, zIndex: 2 }}>
        {/* 精美建设中图标 stack，呼吸动画效果 */}
        <div 
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)",
            border: "1px solid rgba(79, 70, 229, 0.15)",
            display: "grid",
            placeItems: "center",
            fontSize: 26,
            color: "var(--primary)",
            boxShadow: "0 8px 24px rgba(79, 70, 229, 0.05)",
            animation: "breathGlow 4s infinite ease-in-out"
          }}
        >
          <i className="fa-solid fa-helmet-safety" />
        </div>

        <div>
          <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 8, fontWeight: 800 }}>
            {title}
          </Typography.Title>
          <Typography.Paragraph 
            type="secondary" 
            style={{ 
              maxWidth: 600, 
              fontSize: 14, 
              lineHeight: 1.6, 
              color: "var(--text-muted)", 
              marginBottom: 0 
            }}
          >
            {description}
          </Typography.Paragraph>
        </div>

        <div className="module-tags-panel" style={{ width: "100%", margin: 0, background: "rgba(248, 250, 252, 0.4)", border: "1px solid rgba(226, 232, 240, 0.6)" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            模块标签 (Module Tags)
          </div>
          <Space wrap size={[8, 8]}>
            {tags.map((tag) => (
              <Tag 
                key={tag} 
                style={{
                  border: "1px solid rgba(79, 70, 229, 0.15)",
                  background: "rgba(224, 231, 255, 0.3)",
                  color: "var(--primary)",
                  borderRadius: 6,
                  padding: "2px 10px",
                  fontWeight: 600,
                  margin: 0
                }}
              >
                {tag}
              </Tag>
            ))}
          </Space>
        </div>
      </div>
    </section>
  );
}
