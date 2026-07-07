"use client";

import { Alert, Button, Card, Form, Input, Typography } from "antd";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import MatrixRain from "@/components/layout/MatrixRain";

type LoginFormValues = {
  username: string;
  password: string;
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(values: LoginFormValues) {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message ?? "登录失败");
      }

      const redirectTo = searchParams.get("redirect") || "/dashboard";
      router.replace(redirectTo);
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <MatrixRain />
      {/* 现代背景流动光晕 */}
      <div className="login-bg-orb-1" />
      <div className="login-bg-orb-2" />
      <div className="login-bg-orb-3" />
      
      <Card className="login-card">
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <Image
            src="/logo.png"
            alt="Logo"
            width={44}
            height={44}
            style={{
              width: 44,
              height: 44,
              objectFit: "contain",
              borderRadius: 8,
              boxShadow: "0 8px 24px rgba(79, 70, 229, 0.18)",
              flexShrink: 0
            }}
          />
          <div>
            <Typography.Title level={3} style={{ margin: 0, fontWeight: 800, letterSpacing: "-0.5px" }}>
              阿鹏哥管家调配
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Web 管理后台
            </Typography.Text>
          </div>
        </div>

        {/* 科技彩色流光分割线 */}
        <div 
          style={{
            height: "2px",
            width: "100%",
            background: "linear-gradient(90deg, rgba(79, 70, 229, 0.02) 0%, rgba(79, 70, 229, 0.45) 15%, rgba(139, 92, 246, 0.8) 50%, rgba(236, 72, 153, 0.45) 85%, rgba(236, 72, 153, 0.02) 100%)",
            marginTop: 4,
            marginBottom: 24
          }} 
        />

        {error ? (
          <Alert
            showIcon
            type="error"
            message={error}
            style={{ marginTop: 24, marginBottom: 8 }}
          />
        ) : null}

        <Form<LoginFormValues>
          layout="vertical"
          onFinish={handleLogin}
          style={{ marginTop: 24 }}
          initialValues={{ username: "admin" }}
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            {/* 使用 Font Awesome 图标代替原图标 */}
            <Input 
              prefix={<i className="fa-solid fa-user" style={{ color: "var(--text-muted)", marginRight: 6, fontSize: 13 }} />} 
              autoComplete="username" 
            />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            {/* 使用 Font Awesome 图标代替原图标 */}
            <Input.Password
              prefix={<i className="fa-solid fa-lock" style={{ color: "var(--text-muted)", marginRight: 6, fontSize: 13 }} />}
              autoComplete="current-password"
            />
          </Form.Item>

          <Button
            block
            type="primary"
            htmlType="submit"
            loading={loading}
            size="large"
          >
            登录
          </Button>
        </Form>
      </Card>
      <IcpFooter />
    </main>
  );
}

function LoginShell() {
  return (
    <main className="login-page">
      <MatrixRain />
      <div className="login-bg-orb-1" />
      <div className="login-bg-orb-2" />
      <div className="login-bg-orb-3" />
      <Card className="login-card" loading />
      <IcpFooter />
    </main>
  );
}

function IcpFooter() {
  return (
    <Typography.Link
      className="login-icp-footer"
      href="https://beian.miit.gov.cn/"
      target="_blank"
      rel="noopener noreferrer"
    >
      滇ICP备2025068996号
    </Typography.Link>
  );
}
