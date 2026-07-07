"use client";

import {
  Avatar,
  App as AntdApp,
  Badge,
  Breadcrumb,
  Button,
  Dropdown,
  Form,
  Input,
  Layout,
  Menu,
  Modal,
  Space,
  Typography,
  type MenuProps
} from "antd";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { canAccess, type Resource } from "@/lib/permissions";
import type { AuthenticatedUser } from "@/types/auth";

const { Header, Sider, Content } = Layout;

type MenuConfig = {
  key: string;
  label: string;
  resource: Resource;
  icon: React.ReactNode;
};

type ChangePasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

// 使用 Font Awesome 图标库替换原有的 Ant Design 图标
const menus: MenuConfig[] = [
  { key: "/dashboard", label: "工作台", resource: "dashboard", icon: <i className="fa-solid fa-gauge-high admin-menu-icon" /> },
  { key: "/orders", label: "订单管理", resource: "orders", icon: <i className="fa-solid fa-file-invoice admin-menu-icon" /> },
  { key: "/dispatch", label: "派单管理", resource: "dispatch", icon: <i className="fa-solid fa-route admin-menu-icon" /> },
  { key: "/butlers", label: "管家管理", resource: "butlers", icon: <i className="fa-solid fa-user-tie admin-menu-icon" /> },
  { key: "/hotels", label: "酒店管理", resource: "hotels", icon: <i className="fa-solid fa-hotel admin-menu-icon" /> },
  { key: "/leaves", label: "请假管理", resource: "leaves", icon: <i className="fa-solid fa-calendar-check admin-menu-icon" /> },
  { key: "/reviews", label: "评价管理", resource: "reviews", icon: <i className="fa-solid fa-star admin-menu-icon" /> },
  { key: "/finance", label: "财务统计", resource: "finance", icon: <i className="fa-solid fa-coins admin-menu-icon" /> },
  { key: "/abnormal-records", label: "异常记录", resource: "abnormalRecords", icon: <i className="fa-solid fa-triangle-exclamation admin-menu-icon" /> },
  { key: "/accounts", label: "账号管理", resource: "accounts", icon: <i className="fa-solid fa-users-gear admin-menu-icon" /> },
  { key: "/settings", label: "业务配置", resource: "settings", icon: <i className="fa-solid fa-sliders admin-menu-icon" /> },
  { key: "/logs", label: "操作日志", resource: "logs", icon: <i className="fa-solid fa-clipboard-list admin-menu-icon" /> }
];

const roleLabels: Record<AuthenticatedUser["roleCode"], string> = {
  admin: "管理员",
  hotel_frontdesk: "酒店前台",
  dispatcher: "调配员",
  butler: "管家",
  finance: "财务人员"
};

export function AdminShell({
  currentUser,
  children
}: {
  currentUser: AuthenticatedUser;
  children: React.ReactNode;
}) {
  const { message } = AntdApp.useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordForm] = Form.useForm<ChangePasswordFormValues>();

  const visibleMenus = useMemo(
    () => menus.filter((item) => canAccess(currentUser, item.resource, "view")),
    [currentUser]
  );

  const selectedKey =
    visibleMenus.find((item) => pathname.startsWith(item.key))?.key ||
    "/dashboard";
  const currentMenu = visibleMenus.find((item) => item.key === selectedKey);

  const menuItems: MenuProps["items"] = visibleMenus.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.label
  }));

  useEffect(() => {
    let active = true;

    if (!canAccess(currentUser, "notifications", "view")) {
      return;
    }

    fetch("/api/notifications/unread-count")
      .then((response) => response.json())
      .then((result) => {
        if (!active) {
          return;
        }

        if (result.success) {
          setUnreadCount(result.data.count);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [currentUser]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  async function handleChangePassword(values: ChangePasswordFormValues) {
    setPasswordSubmitting(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message ?? "密码修改失败");
      }

      message.success(result.message ?? "密码修改成功");
      setPasswordModalOpen(false);
      passwordForm.resetFields();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "密码修改失败");
    } finally {
      setPasswordSubmitting(false);
    }
  }

  return (
    <Layout className="admin-shell">
      <Sider
        className="admin-sider"
        width={244}
        collapsible
        collapsed={collapsed}
        trigger={null}
        breakpoint="lg"
        onBreakpoint={setCollapsed}
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div 
            className="admin-logo" 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 10, 
              padding: collapsed ? "0 24px" : "0 20px",
              justifyContent: collapsed ? "center" : "flex-start",
              transition: "padding 0.3s, justify-content 0.3s"
            }}
          >
            <Image
              src="/logo.png"
              alt="Logo"
              width={30}
              height={30}
              style={{
                width: 30,
                height: 30,
                objectFit: "contain",
                borderRadius: 6,
                boxShadow: "0 4px 12px rgba(79, 70, 229, 0.15)",
                flexShrink: 0
              }}
            />
            {!collapsed ? (
              <div className="admin-logo-text">
                <span>阿鹏哥管家调配</span>
                <small>Butler Dispatch</small>
              </div>
            ) : null}
          </div>
          
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[selectedKey]}
              items={menuItems}
              onClick={({ key }) => router.push(String(key))}
              className="admin-menu"
            />
          </div>

          <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)", padding: collapsed ? "12px 0" : "16px", display: "flex", flexDirection: collapsed ? "column" : "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Dropdown
              trigger={["click"]}
              placement="topRight"
              menu={{
                items: [
                  {
                    key: "change-password",
                    icon: <i className="fa-solid fa-key" />,
                    label: "修改密码",
                    onClick: () => setPasswordModalOpen(true)
                  },
                  {
                    key: "logout",
                    icon: <i className="fa-solid fa-right-from-bracket" />,
                    label: "退出登录",
                    onClick: handleLogout
                  }
                ]
              }}
            >
              <div
                className="admin-user-card-sider"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  padding: collapsed ? "8px" : "8px 12px",
                  borderRadius: 12,
                  transition: "background 0.3s",
                  flex: 1,
                  minWidth: 0,
                  justifyContent: collapsed ? "center" : "flex-start"
                }}
              >
                <Badge dot status="success">
                  <Avatar icon={<i className="fa-solid fa-user" style={{ fontSize: 13 }} />} />
                </Badge>
                {!collapsed && (
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
                    <Typography.Text style={{ color: "#f8fafc", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden", lineHeight: 1.2 }}>
                      {currentUser.name}
                    </Typography.Text>
                    <Typography.Text style={{ color: "#94a3b8", fontSize: 11, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden", lineHeight: 1.2 }}>
                      {roleLabels[currentUser.roleCode]}
                    </Typography.Text>
                  </div>
                )}
              </div>
            </Dropdown>

            <Button
              type="text"
              style={{ color: "#94a3b8", flexShrink: 0, width: collapsed ? 40 : 32 }}
              icon={collapsed ? <i className="fa-solid fa-indent" /> : <i className="fa-solid fa-outdent" />}
              onClick={() => setCollapsed((value) => !value)}
              className="admin-sider-collapse-btn"
            />
          </div>
        </div>
      </Sider>

      <Layout className="admin-main">
        <Header className="admin-header">
          <div className="admin-title-group">
            <Typography.Title level={4}>{currentMenu?.label ?? "工作台"}</Typography.Title>
            <Breadcrumb
              items={[
                { title: "后台" },
                { title: currentMenu?.label ?? "工作台" }
              ]}
            />
          </div>
          <Space>
            {canAccess(currentUser, "notifications", "view") ? (
              <Badge count={unreadCount} size="small">
                <Button
                  shape="circle"
                  icon={<i className="fa-solid fa-bell" />}
                  onClick={() => router.push("/notifications")}
                />
              </Badge>
            ) : null}
          </Space>
        </Header>

        <Content className="admin-content">{children}</Content>
      </Layout>

      <Modal
        title="修改密码"
        open={passwordModalOpen}
        okText="确认修改"
        cancelText="取消"
        confirmLoading={passwordSubmitting}
        destroyOnHidden
        onCancel={() => {
          setPasswordModalOpen(false);
          passwordForm.resetFields();
        }}
        onOk={() => passwordForm.submit()}
      >
        <Form<ChangePasswordFormValues>
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
        >
          <Form.Item
            label="原密码"
            name="currentPassword"
            rules={[{ required: true, message: "请输入原密码" }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[{ required: true, min: 8, message: "新密码至少 8 个字符" }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            label="确认新密码"
            name="confirmPassword"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "请确认新密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的新密码不一致"));
                }
              })
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
