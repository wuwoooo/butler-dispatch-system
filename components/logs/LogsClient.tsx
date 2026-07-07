"use client";

import {
  ReloadOutlined,
  SearchOutlined
} from "@ant-design/icons";
import {
  App,
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Typography
} from "antd";
import type { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { getRoleLabel, roleOptions } from "@/components/status/StatusTags";
import type { OperationLogRecord } from "@/types/domain";
import { getOperationTypeLabel, getTargetTypeLabel, operationTypeOptions, targetTypeOptions } from "@/lib/display";
import { formatDateTime } from "@/utils/format";
import { SortableTable } from "@/components/tables/SortableTable";

type ApiResult<T> =
  | { success: true; data: T; message: string }
  | { success: false; error: { code: string; message: string } };

type LogFilterValues = {
  operatorId?: string;
  operatorRole?: string;
  operationType?: string;
  targetType?: string;
  targetId?: string;
  keyword?: string;
  dateRange?: [Dayjs, Dayjs];
};

export function LogsClient() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [filters, setFilters] = useState<LogFilterValues>({});
  const [items, setItems] = useState<OperationLogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const [detail, setDetail] = useState<OperationLogRecord | null>(null);

  async function request<T>(url: string) {
    const response = await fetch(url);
    const result = (await response.json()) as ApiResult<T>;

    if (!response.ok || !result.success) {
      throw new Error(result.success ? "请求失败" : result.error.message);
    }

    return result.data;
  }

  async function loadData(
    page = pagination.page,
    pageSize = pagination.pageSize,
    nextFilters?: LogFilterValues
  ) {
    setLoading(true);
    try {
      const values = nextFilters ?? filters;
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize)
      });

      for (const key of [
        "operatorId",
        "operatorRole",
        "operationType",
        "targetType",
        "targetId",
        "keyword"
      ] as const) {
        const value = values[key];
        if (value) {
          params.set(key, value);
        }
      }

      const range = values.dateRange as [Dayjs, Dayjs] | undefined;
      if (range?.[0]) {
        params.set("startDate", range[0].toDate().toISOString());
      }
      if (range?.[1]) {
        params.set("endDate", range[1].toDate().toISOString());
      }

      const data = await request<{
        items: OperationLogRecord[];
        pagination: { page: number; pageSize: number; total: number };
      }>(`/api/logs?${params.toString()}`);
      setItems(data.items);
      setPagination(data.pagination);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载日志失败");
    } finally {
      setLoading(false);
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
        <Typography.Title level={3} style={{ margin: 0 }}>
          操作日志
        </Typography.Title>

        <Form
          form={form}
          layout="inline"
          onValuesChange={(_, allValues: LogFilterValues) => setFilters(allValues)}
        >
          <Form.Item name="operatorRole">
            <Select
              allowClear
              placeholder="操作人角色"
              style={{ width: 140 }}
              options={roleOptions}
            />
          </Form.Item>
          <Form.Item name="operationType">
            <Select allowClear showSearch placeholder="操作类型" style={{ width: 180 }} options={operationTypeOptions} optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="targetType">
            <Select allowClear showSearch placeholder="目标类型" style={{ width: 160 }} options={targetTypeOptions} optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="targetId">
            <Input allowClear placeholder="目标 ID" style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="keyword">
            <Input allowClear placeholder="关键字" style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="dateRange">
            <DatePicker.RangePicker showTime />
          </Form.Item>
          <Button type="primary" icon={<SearchOutlined />} onClick={() => loadData(1, pagination.pageSize, filters)}>
            查询
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => { form.resetFields(); setFilters({}); loadData(1, pagination.pageSize, {}); }}>
            重置
          </Button>
        </Form>

        <SortableTable<OperationLogRecord>
          rowKey="id"
          loading={loading}
          dataSource={items}
          scroll={{ x: 1400 }}
          columns={[
            { title: "操作人", dataIndex: ["operator", "name"], key: "operatorName", width: 140, render: (_, record) => record.operator?.name ?? "-" },
            { title: "角色", dataIndex: ["operator", "roleCode"], key: "operatorRole", width: 120, render: (_, record) => getRoleLabel(record.operator?.roleCode ?? "-") },
            { title: "操作类型", dataIndex: "operationType", key: "operationType", width: 180, render: (value: string) => getOperationTypeLabel(value) },
            { title: "目标类型", dataIndex: "targetType", key: "targetType", width: 160, render: (value: string) => getTargetTypeLabel(value) },
            { title: "目标 ID", dataIndex: "targetId", key: "targetId", width: 180 },
            { title: "操作说明", dataIndex: "remark", key: "remark" },
            { title: "操作时间", dataIndex: "createdAt", key: "createdAt", width: 180, render: (value: string) => formatDateTime(value) },
            {
              title: "详情",
              key: "detail",
              width: 100,
              render: (_, record) => (
                <Button type="link" size="small" onClick={() => setDetail(record)}>
                  查看
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

      <Drawer
        open={Boolean(detail)}
        title="日志详情"
        size={720}
        onClose={() => setDetail(null)}
      >
        {detail ? (
          <Space orientation="vertical" size={12} style={{ width: "100%" }}>
            <Typography.Text>操作类型：{getOperationTypeLabel(detail.operationType)}</Typography.Text>
            <Typography.Text>目标类型：{getTargetTypeLabel(detail.targetType)}</Typography.Text>
            <Typography.Text>目标 ID：{detail.targetId ?? "-"}</Typography.Text>
            <Typography.Text>操作说明：{detail.remark ?? "-"}</Typography.Text>
            <Typography.Text>操作时间：{formatDateTime(detail.createdAt)}</Typography.Text>
            <Typography.Text strong>操作前数据</Typography.Text>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0 }}>
              {JSON.stringify(detail.beforeData ?? null, null, 2)}
            </pre>
            <Typography.Text strong>操作后数据</Typography.Text>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0 }}>
              {JSON.stringify(detail.afterData ?? null, null, 2)}
            </pre>
          </Space>
        ) : null}
      </Drawer>
    </section>
  );
}
