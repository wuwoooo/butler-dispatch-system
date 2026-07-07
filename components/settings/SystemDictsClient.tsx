"use client";

import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography
} from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  businessDictTypeMeta,
  editableBusinessDictTypes,
  type EditableBusinessDictType
} from "@/lib/business-config";
import { SortableTable } from "@/components/tables/SortableTable";
import type { SystemDictRecord } from "@/types/domain";

type ApiResult<T> =
  | { success: true; data: T; message: string }
  | { success: false; error: { code: string; message: string } };

type DictFormValues = {
  dictLabel: string;
  dictValue?: string;
  sortOrder: number;
  status: boolean;
  remark?: string;
};

const emptyDictValues: DictFormValues = {
  dictLabel: "",
  dictValue: "",
  sortOrder: 0,
  status: true,
  remark: ""
};

function DictEditorModal({
  open,
  dictType,
  editing,
  initialValues,
  onCancel,
  onSubmit
}: {
  open: boolean;
  dictType: EditableBusinessDictType;
  editing: SystemDictRecord | null;
  initialValues: DictFormValues;
  onCancel: () => void;
  onSubmit: (values: DictFormValues) => Promise<void>;
}) {
  const meta = businessDictTypeMeta[dictType];

  return (
    <Modal
      open={open}
      title={
        <span>
          <i className="fa-solid fa-book" style={{ color: "var(--primary)", marginRight: 8 }} />
          {editing ? `编辑${meta.label}` : `新增${meta.label}`}
        </span>
      }
      width={560}
      destroyOnHidden
      footer={null}
      onCancel={onCancel}
    >
      <Form<DictFormValues>
        key={`${editing?.id ?? "create"}-${dictType}`}
        layout="vertical"
        initialValues={initialValues}
        onFinish={onSubmit}
      >
        <Form.Item label="配置分类">
          <Input value={meta.label} disabled />
        </Form.Item>
        <Form.Item name="dictLabel" label="显示名称" rules={[{ required: true, message: "请输入显示名称" }]}>
          <Input placeholder={`例如：${meta.label === "请假类型" ? "事假" : meta.label === "拒单原因" ? "时间冲突" : "准时"}`} />
        </Form.Item>
        <Form.Item
          name="dictValue"
          label="系统内部值"
          extra={`可留空，系统会自动生成。${meta.valueHint}`}
        >
          <Input placeholder="留空由系统自动生成" />
        </Form.Item>
        <Form.Item name="sortOrder" label="排序" rules={[{ required: true, message: "请输入排序值" }]}>
          <Input type="number" />
        </Form.Item>
        <Form.Item name="status" label="启用状态" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={3} placeholder="选填，用于给管理员补充说明。" />
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

export function SystemDictsClient() {
  const { message } = App.useApp();
  const [items, setItems] = useState<SystemDictRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 100, total: 0 });
  const [currentUser, setCurrentUser] = useState<{ roleCode: string } | null>(null);
  const [editing, setEditing] = useState<SystemDictRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const [activeType, setActiveType] = useState<EditableBusinessDictType>("leave_type");
  const [editorInitialValues, setEditorInitialValues] = useState<DictFormValues>(emptyDictValues);

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

  async function loadData(
    page = pagination.page,
    pageSize = pagination.pageSize
  ) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        scope: "business"
      });

      const data = await request<{
        items: SystemDictRecord[];
        pagination: { page: number; pageSize: number; total: number };
      }>(`/api/system-dicts?${params.toString()}`);
      setItems(data.items);
      setPagination(data.pagination);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载业务配置失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadBootstrap() {
    const me = await request<{ user: { roleCode: string } }>("/api/auth/me");
    setCurrentUser(me.user);
  }

  async function submit(values: DictFormValues) {
    try {
      if (editing) {
        await request(`/api/system-dicts/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({
            dictType: activeType,
            ...values
          })
        });
        message.success("更新成功");
      } else {
        await request("/api/system-dicts", {
          method: "POST",
          body: JSON.stringify({
            dictType: activeType,
            ...values
          })
        });
        message.success("创建成功");
      }
      setModalOpen(false);
      setEditing(null);
      setEditorInitialValues(emptyDictValues);
      await loadData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "保存失败");
    }
  }

  async function toggleEnabled(record: SystemDictRecord, enabled: boolean) {
    try {
      await request(`/api/system-dicts/${record.id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: enabled
        })
      });
      message.success(enabled ? "已启用" : "已停用");
      await loadData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "更新状态失败");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClientReady(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBootstrap()
      .then(() => loadData(1, 100))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canEdit = currentUser?.roleCode === "admin";

  const groupedItems = useMemo(() => {
    const groups = new Map<EditableBusinessDictType, SystemDictRecord[]>();
    for (const dictType of editableBusinessDictTypes) {
      groups.set(dictType, []);
    }

    for (const item of items) {
      const dictType = item.dictType as EditableBusinessDictType;
      if (groups.has(dictType)) {
        groups.get(dictType)?.push(item);
      }
    }

    return groups;
  }, [items]);

  const tabItems = editableBusinessDictTypes.map((dictType) => {
    const meta = businessDictTypeMeta[dictType];
    const dataSource = groupedItems.get(dictType) ?? [];

    return {
      key: dictType,
      label: meta.label,
      children: (
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {meta.description}
            </Typography.Text>
            <Space wrap size={[4, 4]}>
              {meta.usageLocations.map((location) => (
                <Tag key={location} color="blue">
                  {location}
                </Tag>
              ))}
            </Space>
          </div>

          <SortableTable<SystemDictRecord>
            rowKey="id"
            loading={loading}
            dataSource={dataSource}
            pagination={false}
            columns={[
              { title: "显示名称", dataIndex: "label", key: "label", width: 180 },
              { title: "排序", dataIndex: "sort", key: "sort", width: 80 },
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
                render: (value: string | null) => value || "-"
              },
              {
                title: "操作",
                key: "action",
                width: 160,
                render: (_, record) =>
                  canEdit ? (
                    <Space>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => {
                          setActiveType(dictType);
                          setEditing(record);
                          setEditorInitialValues({
                            dictLabel: record.label,
                            dictValue: record.value,
                            sortOrder: record.sort,
                            status: record.enabled,
                            remark: record.remark ?? ""
                          });
                          setModalOpen(true);
                        }}
                      >
                        编辑
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        danger={record.enabled}
                        onClick={() => toggleEnabled(record, !record.enabled)}
                      >
                        {record.enabled ? "停用" : "启用"}
                      </Button>
                    </Space>
                  ) : (
                    "-"
                  )
              }
            ]}
          />
        </Space>
      )
    };
  });

  return (
    <section className="page-panel">
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            业务配置
          </Typography.Title>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                loadData(1, 100);
              }}
            >
              刷新
            </Button>
            {canEdit ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditing(null);
                  setEditorInitialValues(emptyDictValues);
                  setModalOpen(true);
                }}
              >
                新增{businessDictTypeMeta[activeType].label}
              </Button>
            ) : null}
          </Space>
        </Space>

        <Tabs
          activeKey={activeType}
          items={tabItems}
          onChange={(key) => setActiveType(key as EditableBusinessDictType)}
        />
      </Space>

      {clientReady ? (
        <DictEditorModal
          open={modalOpen}
          dictType={activeType}
          editing={editing}
          initialValues={editorInitialValues}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
            setEditorInitialValues(emptyDictValues);
          }}
          onSubmit={submit}
        />
      ) : null}
    </section>
  );
}
