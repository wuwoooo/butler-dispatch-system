"use client";

import {
  CheckOutlined,
  ReloadOutlined
} from "@ant-design/icons";
import {
  App,
  Button,
  DatePicker,
  Form,
  Select,
  Space,
  Tag,
  Typography
} from "antd";
import type { Dayjs } from "dayjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { notificationTypeMeta, notificationTypeOptions } from "@/lib/notification-config";
import type { NotificationRecord } from "@/types/domain";
import { formatDateTime } from "@/utils/format";
import { SortableTable } from "@/components/tables/SortableTable";

type ApiResult<T> =
  | { success: true; data: T; message: string }
  | { success: false; error: { code: string; message: string } };

function notifyUnreadCountChanged() {
  window.dispatchEvent(new Event("notifications:changed"));
}

export function NotificationsClient() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const [unreadCount, setUnreadCount] = useState(0);

  async function request<T>(url: string, init?: RequestInit) {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {})
      }
    });
    const result = (await response.json()) as ApiResult<T>;

    if (!response.ok || !result.success) {
      throw new Error(result.success ? "请求失败" : result.error.message);
    }

    return result.data;
  }

  async function loadUnreadCount() {
    const data = await request<{ count: number }>("/api/notifications/unread-count");
    setUnreadCount(data.count);
  }

  async function loadData(page = pagination.page, pageSize = pagination.pageSize) {
    setLoading(true);
    try {
      const values = form.getFieldsValue();
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize)
      });

      if (values.readStatus) {
        params.set("readStatus", values.readStatus);
      }
      if (values.notificationType) {
        params.set("notificationType", values.notificationType);
      }

      const range = values.dateRange as [Dayjs, Dayjs] | undefined;
      if (range?.[0]) {
        params.set("startDate", range[0].toDate().toISOString());
      }
      if (range?.[1]) {
        params.set("endDate", range[1].toDate().toISOString());
      }

      const data = await request<{
        items: NotificationRecord[];
        pagination: { page: number; pageSize: number; total: number };
      }>(`/api/notifications?${params.toString()}`);
      setItems(data.items);
      setPagination(data.pagination);
      await loadUnreadCount();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载通知失败");
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id: string) {
    try {
      await request(`/api/notifications/${id}/read`, { method: "POST" });
      notifyUnreadCountChanged();
      message.success("已标记为已读");
      await loadData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "操作失败");
    }
  }

  async function readAll() {
    try {
      await request("/api/notifications/read-all", { method: "POST" });
      notifyUnreadCountChanged();
      message.success("全部通知已标记为已读");
      await loadData(1, pagination.pageSize);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "操作失败");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData(1, 10).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="page-panel">
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            通知中心
          </Typography.Title>
          <Space>
            <Tag color={unreadCount > 0 ? "processing" : "default"}>未读 {unreadCount}</Tag>
            <Button icon={<CheckOutlined />} onClick={readAll}>
              全部已读
            </Button>
          </Space>
        </Space>

        <Form form={form} layout="inline">
          <Form.Item name="readStatus">
            <Select
              allowClear
              placeholder="读取状态"
              style={{ width: 140 }}
              options={[
                { label: "未读", value: "unread" },
                { label: "已读", value: "read" }
              ]}
            />
          </Form.Item>
          <Form.Item name="notificationType">
            <Select
              allowClear
              placeholder="通知类型"
              style={{ width: 180 }}
              options={notificationTypeOptions.map((item) => ({
                label: item.label,
                value: item.value
              }))}
            />
          </Form.Item>
          <Form.Item name="dateRange">
            <DatePicker.RangePicker showTime />
          </Form.Item>
          <Button type="primary" onClick={() => loadData(1, pagination.pageSize)}>
            查询
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => { form.resetFields(); loadData(1, pagination.pageSize); }}>
            重置
          </Button>
        </Form>

        <SortableTable<NotificationRecord>
          rowKey="id"
          loading={loading}
          dataSource={items}
          columns={[
            { title: "标题", dataIndex: "title", key: "title", width: 180 },
            { title: "内容", dataIndex: "content", key: "content" },
            {
              title: "类型",
              dataIndex: "type",
              key: "type",
              width: 160,
              render: (value: string) => notificationTypeMeta[value as keyof typeof notificationTypeMeta]?.label ?? value
            },
            {
              title: "关联订单",
              dataIndex: "targetId",
              key: "targetId",
              width: 160,
              render: (value: string, record) =>
                record.targetType === "ServiceOrder" && value ? (
                  <Link href={`/orders/${value}`}>查看订单</Link>
                ) : (
                  "-"
                )
            },
            {
              title: "状态",
              dataIndex: "isRead",
              key: "isRead",
              width: 100,
              render: (value: boolean) => value ? <Tag color="success">已读</Tag> : <Tag color="processing">未读</Tag>
            },
            { title: "创建时间", dataIndex: "createdAt", key: "createdAt", width: 180, render: (value: string) => formatDateTime(value) },
            { title: "读取时间", dataIndex: "readAt", key: "readAt", width: 180, render: (value: string) => formatDateTime(value) },
            {
              title: "操作",
              key: "action",
              width: 120,
              render: (_, record) =>
                record.isRead ? null : (
                  <Button size="small" type="link" onClick={() => markRead(record.id)}>
                    标记已读
                  </Button>
                )
            }
          ]}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (page, pageSize) => loadData(page, pageSize)
          }}
        />
      </Space>
    </section>
  );
}
