"use client";

import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { ButlerStatisticsClient } from "@/components/butlers/ButlerStatisticsClient";
import { ButlerStatusTag } from "@/components/status/StatusTags";
import { SortableTable } from "@/components/tables/SortableTable";
import { formatDate, formatDateTime, maskPhone } from "@/utils/format";

type ApiResult<T> =
  | { success: true; data: T; message: string }
  | { success: false; error: { code: string; message: string } };

type Account = {
  id: string;
  username: string;
  status: "active" | "disabled";
  miniProgramBound: boolean;
  miniProgramBoundAt?: string | null;
  lastMiniProgramLoginAt?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
};

type ButlerActiveAssignment = {
  id: string;
  status: string;
  order?: {
    id: string;
    orderNo?: string;
    guestName?: string;
    checkInDate?: string;
    checkOutDate?: string;
    arrivalTime?: string;
    hotel?: {
      name: string;
    } | null;
  } | null;
};

type Butler = {
  id: string;
  name: string;
  phone: string;
  code?: string;
  status: string;
  dispatchEnabled: boolean;
  gender?: string | null;
  vehicleInfo?: string | null;
  averageScore?: number | string;
  reviewCount?: number;
  remark?: string | null;
  createdAt?: string;
  updatedAt?: string;
  user?: Account | null;
  activeAssignments?: ButlerActiveAssignment[];
};

type ButlerForm = {
  name: string;
  phone: string;
  gender?: string;
  vehicleInfo?: string;
  dispatchEnabled?: boolean;
  remark?: string;
  accountPassword?: string;
};

type ServiceStatus =
  | "available"
  | "pending_confirm"
  | "confirmed_waiting"
  | "in_service";

const currentAssignmentStatuses = [
  "pending_confirm",
  "confirmed",
  "picked_guest",
  "in_service"
];

const emptyValues: ButlerForm = {
  name: "",
  phone: "",
  dispatchEnabled: true,
  accountPassword: ""
};

function generateSixDigitPassword() {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return String(100000 + (values[0] % 900000));
  }

  return String(Math.floor(100000 + Math.random() * 900000));
}

function getAssignmentServiceEndAt(assignment: ButlerActiveAssignment) {
  const checkOutDate = assignment.order?.checkOutDate;
  if (!checkOutDate) {
    return null;
  }

  const endAt = new Date(checkOutDate);
  if (Number.isNaN(endAt.getTime())) {
    return null;
  }

  endAt.setHours(23, 59, 59, 999);
  return endAt;
}

function getAssignmentServiceStartAt(assignment: ButlerActiveAssignment) {
  const arrivalTime = assignment.order?.arrivalTime;
  const checkInDate = assignment.order?.checkInDate;
  if (!arrivalTime || !checkInDate) {
    return null;
  }

  const arrival = new Date(arrivalTime);
  const checkIn = new Date(checkInDate);
  if (Number.isNaN(arrival.getTime()) || Number.isNaN(checkIn.getTime())) {
    return null;
  }

  return new Date(Math.min(arrival.getTime(), checkIn.getTime()));
}

function isCurrentAssignment(assignment: ButlerActiveAssignment) {
  if (!currentAssignmentStatuses.includes(assignment.status)) {
    return false;
  }

  const now = new Date();

  if (assignment.status === "pending_confirm") {
    const startAt = getAssignmentServiceStartAt(assignment);
    return !startAt || startAt >= now;
  }

  if (assignment.status === "confirmed") {
    const endAt = getAssignmentServiceEndAt(assignment);
    return !endAt || endAt >= now;
  }

  return true;
}

function getDisplayServiceStatus(record: Butler): ServiceStatus {
  const statuses =
    record.activeAssignments?.filter(isCurrentAssignment).map((item) => item.status) ??
    [];

  if (statuses.some((status) => ["picked_guest", "in_service"].includes(status))) {
    return "in_service";
  }

  if (statuses.some((status) => status === "confirmed")) {
    return "confirmed_waiting";
  }

  if (statuses.some((status) => status === "pending_confirm")) {
    return "pending_confirm";
  }

  return "available";
}

function renderReceptionDates(record: Butler) {
  const assignments = (record.activeAssignments ?? []).filter(isCurrentAssignment);

  if (assignments.length === 0) {
    return "-";
  }

  return (
    <Space orientation="vertical" size={4}>
      {assignments.map((assignment) => {
        const label =
          assignment.status === "pending_confirm"
            ? "待接单"
            : assignment.status === "confirmed"
              ? "准备接待"
              : "接待中";
        const color =
          assignment.status === "pending_confirm"
            ? "cyan"
            : assignment.status === "confirmed"
              ? "blue"
              : "green";
        const order = assignment.order;

        return (
          <Space key={assignment.id} size={6} wrap>
            <Tag color={color}>{label}</Tag>
            <Typography.Text>
              {formatDate(order?.checkInDate)} 至 {formatDate(order?.checkOutDate)}
            </Typography.Text>
            {order?.hotel?.name ? (
              <Typography.Text type="secondary">
                {order.hotel.name}
              </Typography.Text>
            ) : null}
          </Space>
        );
      })}
    </Space>
  );
}

function ButlerEditor({
  editing,
  onClose,
  onSubmit
}: {
  editing: Butler | "create";
  onClose: () => void;
  onSubmit: (values: ButlerForm) => Promise<void>;
}) {
  const create = editing === "create";
  const [form] = Form.useForm<ButlerForm>();
  const generatedPassword = useMemo(
    () => (create ? generateSixDigitPassword() : ""),
    [create]
  );
  const initialValues: ButlerForm = create
    ? { ...emptyValues, accountPassword: generatedPassword }
    : {
        name: editing.name,
        phone: editing.phone,
        gender: editing.gender ?? undefined,
        vehicleInfo: editing.vehicleInfo ?? undefined,
        dispatchEnabled: editing.dispatchEnabled,
        remark: editing.remark ?? ""
      };

  return (
    <Modal
      open
      destroyOnHidden
      footer={null}
      title={create ? "新增管家" : "编辑管家"}
      onCancel={onClose}
      width={620}
    >
      <Form
        form={form}
        key={`${create ? "create" : editing.id}-${
          editing === "create" ? "" : editing.updatedAt ?? ""
        }`}
        initialValues={initialValues}
        layout="vertical"
        onFinish={onSubmit}
      >
        <Form.Item
          label="姓名"
          name="name"
          rules={[{ required: true, message: "请输入管家姓名" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="手机号"
          name="phone"
          rules={[{ required: true, message: "请输入手机号" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="性别" name="gender">
          <Select
            allowClear
            options={[
              { label: "男", value: "male" },
              { label: "女", value: "female" }
            ]}
          />
        </Form.Item>
        <Form.Item label="车型信息" name="vehicleInfo" extra="例如：别克 GL8（7座）">
          <Input placeholder="品牌 / 型号 / 座位数" />
        </Form.Item>
        <Form.Item
          label="允许接收新派单"
          name="dispatchEnabled"
          valuePropName="checked"
          extra="暂停接单不会覆盖当前订单产生的服务状态。"
        >
          <Switch checkedChildren="允许" unCheckedChildren="暂停" />
        </Form.Item>

        {create ? (
          <>
            <Form.Item label="登录账号">
              <Input value="按管家姓名自动生成拼音账号" disabled />
            </Form.Item>
            <Form.Item
              label="初始密码"
              name="accountPassword"
              extra="系统自动生成 6 位数字密码，请保存后告知管家。"
              rules={[
                {
                  required: true,
                  pattern: /^\d{6}$/,
                  message: "初始密码必须是 6 位数字"
                }
              ]}
            >
              <Input
                autoComplete="off"
                readOnly
                addonAfter={
                  <Button
                    type="link"
                    size="small"
                    onClick={() => {
                      form.setFieldValue(
                        "accountPassword",
                        generateSixDigitPassword()
                      );
                    }}
                    style={{ paddingInline: 0 }}
                  >
                    重新生成
                  </Button>
                }
              />
            </Form.Item>
          </>
        ) : null}

        <Form.Item label="备注" name="remark">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ justifyContent: "flex-end", width: "100%" }}>
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" htmlType="submit">
              保存
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function ButlerManagementClient() {
  const { message, modal } = App.useApp();
  const [items, setItems] = useState<Butler[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Butler | "create" | null>(null);
  const [detail, setDetail] = useState<Butler | null>(null);
  const [keyword, setKeyword] = useState("");
  const [canManage, setCanManage] = useState(false);

  async function request<T>(url: string, init?: RequestInit) {
    const res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      }
    });
    const data = (await res.json()) as ApiResult<T>;
    if (!res.ok || !data.success) {
      throw new Error(data.success ? "请求失败" : data.error.message);
    }
    return data.data;
  }

  async function load() {
    setLoading(true);
    try {
      const data = await request<{ items: Butler[] }>("/api/butlers");
      setItems(data.items);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载管家失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([
        load(),
        request<{ user: { roleCode: string } }>("/api/auth/me").then((data) =>
          setCanManage(["admin", "dispatcher"].includes(data.user.roleCode))
        )
      ]).catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
    // 初始化请求仅执行一次，后续数据刷新由页面操作触发。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          !keyword ||
          [item.name, item.phone, item.user?.username].some((value) =>
            value?.includes(keyword)
          )
      ),
    [items, keyword]
  );

  async function save(values: ButlerForm) {
    try {
      if (editing === "create") {
        const created = await request<Butler>("/api/butlers", {
          method: "POST",
          body: JSON.stringify(values)
        });
        modal.success({
          title: "管家已创建",
          content: (
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="登录账号">
                {created.user?.username ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label="初始密码">
                {values.accountPassword}
              </Descriptions.Item>
            </Descriptions>
          )
        });
      } else if (editing) {
        await request(`/api/butlers/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(values)
        });
        message.success("管家已更新");
      }
      setEditing(null);
      void load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "保存失败");
    }
  }

  async function refreshDetail(id: string) {
    const data = await request<Butler>(`/api/butlers/${id}`);
    setDetail(data);
    void load();
  }

  function createAccount() {
    if (!detail) return;
    let password = "";
    modal.confirm({
      title: "开通管家账号",
      content: (
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            登录账号将按“{detail.name}”自动生成拼音，并在重名时追加数字。
          </Typography.Text>
          <Input.Password
            placeholder="初始密码（至少 8 位）"
            onChange={(event) => {
              password = event.target.value;
            }}
          />
        </Space>
      ),
      okText: "开通",
      cancelText: "取消",
      onOk: async () => {
        if (password.length < 8) {
          message.error("初始密码至少 8 位");
          throw new Error("invalid password");
        }
        try {
          const result = await request<{ user?: Account }>(
            `/api/butlers/${detail.id}/account`,
            {
              method: "POST",
              body: JSON.stringify({ password })
            }
          );
          message.success(`管家账号已开通：${result.user?.username ?? ""}`);
          await refreshDetail(detail.id);
        } catch (error) {
          message.error(error instanceof Error ? error.message : "开通失败");
          throw error;
        }
      }
    });
  }

  function accountAction(
    action: "enable" | "disable" | "unbind-miniprogram",
    title: string
  ) {
    if (!detail) return;
    modal.confirm({
      title,
      content: `确认对管家“${detail.name}”执行此操作？`,
      okText: "确认",
      cancelText: "取消",
      onOk: async () => {
        try {
          await request(`/api/butlers/${detail.id}/account/${action}`, {
            method: "POST"
          });
          message.success("操作成功");
          await refreshDetail(detail.id);
        } catch (error) {
          message.error(error instanceof Error ? error.message : "操作失败");
          throw error;
        }
      }
    });
  }

  function resetPassword() {
    if (!detail) return;
    modal.confirm({
      title: "确认重置管家账号密码",
      content: `确认将管家“${detail.name}”的账号密码重置为系统自动生成的 6 位数字密码？`,
      okText: "确认重置",
      cancelText: "取消",
      onOk: async () => {
        try {
          const result = await request<{ id: string; newPassword: string }>(
            `/api/butlers/${detail.id}/account/reset-password`,
            {
              method: "POST"
            }
          );
          modal.success({
            title: "管家账号密码已重置",
            content: (
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="管家">{detail.name}</Descriptions.Item>
                <Descriptions.Item label="登录账号">
                  {detail.user?.username ?? "-"}
                </Descriptions.Item>
                <Descriptions.Item label="新密码">
                  {result.newPassword}
                </Descriptions.Item>
              </Descriptions>
            )
          });
        } catch (error) {
          message.error(error instanceof Error ? error.message : "重置失败");
          throw error;
        }
      }
    });
  }

  const account = detail?.user;

  return (
    <Tabs
      items={[
        {
          key: "profiles",
          label: "管家档案",
          children: (
            <section className="page-panel">
              <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                <Space style={{ justifyContent: "space-between", width: "100%" }}>
                  <Typography.Title level={3} style={{ margin: 0 }}>
                    管家管理
                  </Typography.Title>
                  <Space>
                    <Button icon={<ReloadOutlined />} onClick={load}>
                      刷新
                    </Button>
                    {canManage ? (
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setEditing("create")}
                      >
                        新增管家
                      </Button>
                    ) : null}
                  </Space>
                </Space>
                <Space>
                  <Input
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder="姓名 / 手机号 / 登录账号"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    style={{ width: 260 }}
                  />
                  <Button onClick={() => setKeyword("")}>重置</Button>
                </Space>
                <SortableTable<Butler>
                  rowKey="id"
                  dataSource={filtered}
                  loading={loading}
                  scroll={{ x: 1680 }}
                  pagination={{ pageSize: 10, showSizeChanger: true }}
                  columns={[
                    { title: "管家姓名", dataIndex: "name", width: 120 },
                    {
                      title: "手机号",
                      dataIndex: "phone",
                      width: 140,
                      render: maskPhone
                    },
                    {
                      title: "登录账号",
                      width: 135,
                      render: (_, record) => record.user?.username ?? <Tag>未开通</Tag>
                    },
                    {
                      title: "当前服务状态",
                      width: 130,
                      render: (_, record) => (
                        <ButlerStatusTag value={getDisplayServiceStatus(record)} />
                      )
                    },
                    {
                      title: "接待日期",
                      width: 260,
                      render: (_, record) => renderReceptionDates(record)
                    },
                    {
                      title: "接单设置",
                      dataIndex: "dispatchEnabled",
                      width: 120,
                      render: (value) => (
                        <Tag color={value ? "success" : "warning"}>
                          {value ? "可接新单" : "暂停接单"}
                        </Tag>
                      )
                    },
                    {
                      title: "车型信息",
                      dataIndex: "vehicleInfo",
                      width: 160,
                      render: (value) => value || "-"
                    },
                    {
                      title: "平均评分",
                      dataIndex: "averageScore",
                      width: 100,
                      render: (value) => Number(value ?? 0).toFixed(2)
                    },
                    { title: "评价次数", dataIndex: "reviewCount", width: 100 },
                    {
                      title: "账号状态",
                      width: 100,
                      render: (_, record) =>
                        record.user ? (
                          <Tag color={record.user.status === "active" ? "success" : "default"}>
                            {record.user.status === "active" ? "启用" : "停用"}
                          </Tag>
                        ) : (
                          "-"
                        )
                    },
                    {
                      title: "小程序绑定",
                      width: 110,
                      render: (_, record) =>
                        record.user ? (
                          <Tag color={record.user.miniProgramBound ? "success" : "default"}>
                            {record.user.miniProgramBound ? "已绑定" : "未绑定"}
                          </Tag>
                        ) : (
                          "-"
                        )
                    },
                    {
                      title: "最近小程序登录",
                      width: 165,
                      render: (_, record) =>
                        formatDateTime(record.user?.lastMiniProgramLoginAt)
                    },
                    {
                      title: "最后后台登录",
                      width: 165,
                      render: (_, record) => formatDateTime(record.user?.lastLoginAt)
                    },
                    {
                      title: "操作",
                      fixed: "right",
                      width: 120,
                      render: (_, record) => (
                        <Space size={0}>
                          <Button type="link" onClick={() => setDetail(record)}>
                            详情
                          </Button>
                          {canManage ? (
                            <Button type="link" onClick={() => setEditing(record)}>
                              编辑
                            </Button>
                          ) : null}
                        </Space>
                      )
                    }
                  ]}
                />
              </Space>
              {editing ? (
                <ButlerEditor
                  editing={editing}
                  onClose={() => setEditing(null)}
                  onSubmit={save}
                />
              ) : null}
              {detail ? (
                <Modal
                  open
                  destroyOnHidden
                  footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
                  onCancel={() => setDetail(null)}
                  title="管家详情"
                  width={760}
                >
                  <Descriptions bordered size="small" column={2}>
                    <Descriptions.Item label="姓名">{detail.name}</Descriptions.Item>
                    <Descriptions.Item label="手机号">
                      {maskPhone(detail.phone)}
                    </Descriptions.Item>
                    <Descriptions.Item label="当前服务状态">
                      <ButlerStatusTag value={getDisplayServiceStatus(detail)} />
                    </Descriptions.Item>
                    <Descriptions.Item label="接单设置">
                      <Tag color={detail.dispatchEnabled ? "success" : "warning"}>
                        {detail.dispatchEnabled ? "可接新单" : "暂停接单"}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="接待日期" span={2}>
                      {renderReceptionDates(detail)}
                    </Descriptions.Item>
                    <Descriptions.Item label="车型信息">
                      {detail.vehicleInfo || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="登录账号">
                      {account?.username ?? "未开通"}
                    </Descriptions.Item>
                    <Descriptions.Item label="账号状态">
                      {account ? (account.status === "active" ? "启用" : "停用") : "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="账号创建时间">
                      {formatDateTime(account?.createdAt)}
                    </Descriptions.Item>
                    <Descriptions.Item label="最后后台登录">
                      {formatDateTime(account?.lastLoginAt)}
                    </Descriptions.Item>
                    <Descriptions.Item label="小程序绑定">
                      {account?.miniProgramBound ? "已绑定" : "未绑定"}
                    </Descriptions.Item>
                    <Descriptions.Item label="小程序绑定时间">
                      {formatDateTime(account?.miniProgramBoundAt)}
                    </Descriptions.Item>
                    <Descriptions.Item label="最近小程序登录">
                      {formatDateTime(account?.lastMiniProgramLoginAt)}
                    </Descriptions.Item>
                    <Descriptions.Item label="备注" span={2}>
                      {detail.remark || "-"}
                    </Descriptions.Item>
                  </Descriptions>
                  {canManage ? (
                    <Space wrap style={{ marginTop: 16 }}>
                      {!account ? (
                        <Button type="primary" onClick={createAccount}>
                          开通账号
                        </Button>
                      ) : (
                        <>
                          <Button onClick={resetPassword}>重置密码</Button>
                          <Button
                            onClick={() =>
                              accountAction(
                                account.status === "active" ? "disable" : "enable",
                                account.status === "active"
                                  ? "停用管家账号"
                                  : "启用管家账号"
                              )
                            }
                          >
                            {account.status === "active" ? "停用账号" : "启用账号"}
                          </Button>
                          {account.miniProgramBound ? (
                            <Button
                              danger
                              onClick={() =>
                                accountAction("unbind-miniprogram", "解绑微信小程序")
                              }
                            >
                              解绑微信
                            </Button>
                          ) : null}
                        </>
                      )}
                    </Space>
                  ) : null}
                </Modal>
              ) : null}
            </section>
          )
        },
        {
          key: "statistics",
          label: "管家统计",
          children: <ButlerStatisticsClient />
        }
      ]}
    />
  );
}
