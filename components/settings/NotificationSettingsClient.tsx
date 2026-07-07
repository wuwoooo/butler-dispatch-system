"use client";

import { App, Button, Form, Input, Modal, Space, Switch, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import {
  notificationTypeMeta,
  notificationTypeOptions,
  type NotificationConfigValue
} from "@/lib/notification-config";
import { SortableTable } from "@/components/tables/SortableTable";
import type { SystemDictRecord } from "@/types/domain";

type ApiResult<T> =
  | { success: true; data: T; message: string }
  | { success: false; error: { code: string; message: string } };

type NotificationConfigFormValues = {
  dictLabel: string;
  status: boolean;
  remark?: string;
};

function NotificationEditorModal({
  open,
  editing,
  onCancel,
  onSubmit
}: {
  open: boolean;
  editing: SystemDictRecord | null;
  onCancel: () => void;
  onSubmit: (values: NotificationConfigFormValues) => Promise<void>;
}) {
  const meta = editing ? notificationTypeMeta[editing.value as NotificationConfigValue] : null;

  return (
    <Modal
      open={open}
      title={editing ? `编辑${meta?.label ?? "通知配置"}` : "编辑通知配置"}
      width={560}
      destroyOnHidden
      footer={null}
      onCancel={onCancel}
    >
      <Form<NotificationConfigFormValues>
        key={editing?.id ?? "empty"}
        layout="vertical"
        initialValues={{
          dictLabel: editing?.label ?? "",
          status: editing?.enabled ?? true,
          remark: editing?.remark ?? ""
        }}
        onFinish={onSubmit}
      >
        <Form.Item label="事件名称">
          <Input value={meta?.label ?? editing?.label ?? "-"} disabled />
        </Form.Item>
        <Form.Item label="事件说明">
          <Input.TextArea value={meta?.description ?? "-"} rows={3} disabled />
        </Form.Item>
        <Form.Item name="dictLabel" label="显示名称" rules={[{ required: true, message: "请输入显示名称" }]}>
          <Input />
        </Form.Item>
        <Form.Item name="status" label="启用状态" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={3} placeholder="选填，例如关闭原因、使用说明。" />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onCancel}>取消</Button>
            <Button type="primary" htmlType="submit">
              保存
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function NotificationSettingsClient() {
  const { message } = App.useApp();
  const [items, setItems] = useState<SystemDictRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<SystemDictRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request<{
        items: SystemDictRecord[];
        pagination: { page: number; pageSize: number; total: number };
      }>("/api/system-dicts?scope=notification&page=1&pageSize=100");
      setItems(data.items);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载通知配置失败");
    } finally {
      setLoading(false);
    }
  }, [message]);

  async function submit(values: NotificationConfigFormValues) {
    if (!editing) {
      return;
    }

    try {
      await request(`/api/system-dicts/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify(values)
      });
      message.success("通知配置已更新");
      setModalOpen(false);
      setEditing(null);
      await loadData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "保存失败");
    }
  }

  async function toggleEnabled(record: SystemDictRecord, enabled: boolean) {
    try {
      await request(`/api/system-dicts/${record.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: enabled })
      });
      message.success(enabled ? "通知已启用" : "通知已停用");
      await loadData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "更新状态失败");
    }
  }

  async function initializeMissing() {
    const missingItems = mergedItems.filter((item) => item.missing);

    if (!missingItems.length) {
      message.info("当前没有缺失的通知事件配置");
      return;
    }

    try {
      for (const [index, item] of missingItems.entries()) {
        await request("/api/system-dicts?scope=notification", {
          method: "POST",
          body: JSON.stringify({
            dictType: "notification_type",
            dictLabel: item.label,
            dictValue: item.value,
            sortOrder: index + 1,
            status: true,
            remark: item.remark
          })
        });
      }

      message.success("缺失的通知事件配置已初始化");
      await loadData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "初始化通知配置失败");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData().catch(() => undefined);
  }, [loadData]);

  const byValue = new Map(items.map((item) => [item.value, item]));
  const mergedItems = notificationTypeOptions.map((option) => {
    const stored = byValue.get(option.value);
    return {
      id: stored?.id ?? option.value,
      dictType: "notification_type",
      label: stored?.label ?? option.label,
      value: option.value,
      sort: stored?.sort ?? 0,
      enabled: stored?.enabled ?? true,
      remark: stored?.remark ?? null,
      createdAt: stored?.createdAt,
      updatedAt: stored?.updatedAt,
      missing: !stored,
      description: option.description
    };
  });

  return (
    <section>
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <div
            style={{
              flex: 1,
              padding: 16,
              borderRadius: 12,
              background: "rgba(59, 130, 246, 0.08)",
              color: "#475569"
            }}
          >
            通知配置用于维护站内通知的显示名称和启停状态。通知事件类型固定，不支持新增或删除，避免影响现有业务触发链路。
          </div>
          <Button onClick={initializeMissing} disabled={!mergedItems.some((item) => item.missing)}>
            初始化缺失事件
          </Button>
        </Space>

        <SortableTable<(typeof mergedItems)[number]>
          rowKey="value"
          loading={loading}
          dataSource={mergedItems}
          pagination={false}
          columns={[
            { title: "事件名称", dataIndex: "label", key: "label", width: 180 },
            { title: "触发说明", dataIndex: "description", key: "description" },
            {
              title: "状态",
              dataIndex: "enabled",
              key: "enabled",
              width: 100,
              render: (value: boolean) => (value ? "启用" : "停用")
            },
            {
              title: "备注",
              dataIndex: "remark",
              key: "remark",
              width: 180,
              render: (value: string | null) => value || "-"
            },
            {
              title: "操作",
              key: "action",
              width: 180,
              render: (_, record) => (
                <Space>
                  <Button
                    type="link"
                    size="small"
                    disabled={record.missing}
                    onClick={() => {
                      if (record.missing) {
                        return;
                      }
                      setEditing(record as SystemDictRecord);
                      setModalOpen(true);
                    }}
                  >
                    编辑
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    danger={record.enabled}
                    disabled={record.missing}
                    onClick={() => {
                      if (record.missing) {
                        return;
                      }
                      toggleEnabled(record as SystemDictRecord, !record.enabled);
                    }}
                  >
                    {record.enabled ? "停用" : "启用"}
                  </Button>
                </Space>
              )
            }
          ]}
        />

        {mergedItems.some((item) => item.missing) ? (
          <Typography.Text type="warning">
            存在未初始化的通知事件配置，可点击“初始化缺失事件”自动补齐。
          </Typography.Text>
        ) : null}
      </Space>

      <NotificationEditorModal
        open={modalOpen}
        editing={editing}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={submit}
      />
    </section>
  );
}
