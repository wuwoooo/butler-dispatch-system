"use client";

import {
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  SearchOutlined
} from "@ant-design/icons";
import {
  App,
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Typography,
  type TablePaginationConfig
} from "antd";
import type { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import {
  LeaveStatusTag,
  LeaveTypeTag,
  leaveStatusOptions,
  leaveTypeOptions
} from "@/components/status/StatusTags";
import type { LeaveRecord } from "@/types/domain";
import { formatDateTime } from "@/utils/format";
import { SortableTable } from "@/components/tables/SortableTable";

type ApiResult<T> =
  | { success: true; data: T; message: string }
  | { success: false; error: { code: string; message: string } };

type CurrentUser = {
  id: string;
  roleCode: string;
};

type LeaveFilterValues = {
  butlerName?: string;
  butlerPhone?: string;
  status?: string;
  leaveType?: string;
  leaveRange?: [Dayjs, Dayjs];
  createdRange?: [Dayjs, Dayjs];
};

type RejectLeaveModalProps = {
  open: boolean;
  target: LeaveRecord | null;
  onCancel: () => void;
  onSubmit: (values: { rejectReason: string }) => Promise<void>;
};

function RejectLeaveModal({
  open,
  target,
  onCancel,
  onSubmit
}: RejectLeaveModalProps) {
  return (
    <Modal
      title={target ? `驳回 ${target.butler?.name ?? "管家"} 的请假申请` : "驳回请假"}
      open={open}
      destroyOnHidden
      footer={null}
      onCancel={onCancel}
    >
      <Form<{ rejectReason: string }>
        key={target?.id ?? "empty"}
        layout="vertical"
        onFinish={onSubmit}
      >
        <Form.Item
          label="驳回原因"
          name="rejectReason"
          rules={[{ required: true, message: "请输入驳回原因" }]}
        >
          <Input.TextArea rows={4} maxLength={500} showCount />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onCancel}>取消</Button>
            <Button danger type="primary" htmlType="submit">
              确认驳回
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function LeavesClient() {
  const { message, modal } = App.useApp();
  const [filterForm] = Form.useForm();
  const [filters, setFilters] = useState<LeaveFilterValues>({});
  const [clientReady, setClientReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [items, setItems] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const [detail, setDetail] = useState<LeaveRecord | null>(null);
  const [rejectTarget, setRejectTarget] = useState<LeaveRecord | null>(null);
  const canAudit =
    currentUser?.roleCode === "admin" || currentUser?.roleCode === "dispatcher";

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
      throw new Error(
        result.success ? "请求失败" : result.error?.message ?? "请求失败"
      );
    }

    return result.data;
  }

  async function loadCurrentUser() {
    const data = await request<{ user: CurrentUser }>("/api/auth/me");
    setCurrentUser(data.user);
  }

  async function loadLeaves(
    page = pagination.page,
    pageSize = pagination.pageSize,
    nextFilters?: LeaveFilterValues
  ) {
    setLoading(true);
    try {
      const values = nextFilters ?? filters;
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize)
      });

      for (const key of ["butlerName", "butlerPhone", "status", "leaveType"] as const) {
        const value = values[key];

        if (value) {
          params.set(key, value);
        }
      }

      if (values.leaveRange?.[0]) {
        params.set("leaveStartTime", values.leaveRange[0].toDate().toISOString());
      }
      if (values.leaveRange?.[1]) {
        params.set("leaveEndTime", values.leaveRange[1].toDate().toISOString());
      }
      if (values.createdRange?.[0]) {
        params.set(
          "createdStartTime",
          values.createdRange[0].toDate().toISOString()
        );
      }
      if (values.createdRange?.[1]) {
        params.set("createdEndTime", values.createdRange[1].toDate().toISOString());
      }

      const data = await request<{
        items: LeaveRecord[];
        pagination: { page: number; pageSize: number; total: number };
      }>(`/api/leaves?${params.toString()}`);
      setItems(data.items);
      setPagination(data.pagination);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载请假记录失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClientReady(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCurrentUser()
      .then(() => loadLeaves(1, 10))
      .catch((error) =>
        message.error(error instanceof Error ? error.message : "初始化失败")
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function approveLeave(record: LeaveRecord) {
    modal.confirm({
      title: "确认审核通过",
      content: "审核通过前系统会再次检查订单冲突，请确认继续。",
      okText: "通过",
      cancelText: "取消",
      onOk: async () => {
        try {
          await request(`/api/leaves/${record.id}/approve`, { method: "POST" });
          message.success("请假审核已通过");
          await loadLeaves();
        } catch (error) {
          message.error(error instanceof Error ? error.message : "审核失败");
        }
      }
    });
  }

  async function submitReject(values: { rejectReason: string }) {
    if (!rejectTarget) {
      return;
    }

    try {
      await request(`/api/leaves/${rejectTarget.id}/reject`, {
        method: "POST",
        body: JSON.stringify(values)
      });
      message.success("请假审核已驳回");
      setRejectTarget(null);
      await loadLeaves();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "驳回失败");
    }
  }

  return (
    <section className="page-panel">
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            请假管理
          </Typography.Title>
          <Button icon={<ReloadOutlined />} onClick={() => loadLeaves()}>
            刷新
          </Button>
        </Space>

        <Form
          form={filterForm}
          layout="inline"
          onValuesChange={(_, allValues: LeaveFilterValues) => setFilters(allValues)}
        >
          <Form.Item name="butlerName">
            <Input placeholder="管家姓名" allowClear style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="butlerPhone">
            <Input placeholder="管家手机号" allowClear style={{ width: 150 }} />
          </Form.Item>
          <Form.Item name="status">
            <Select
              allowClear
              placeholder="请假状态"
              style={{ width: 140 }}
              options={leaveStatusOptions}
            />
          </Form.Item>
          <Form.Item name="leaveType">
            <Select
              allowClear
              placeholder="请假类型"
              style={{ width: 130 }}
              options={leaveTypeOptions}
            />
          </Form.Item>
          <Form.Item name="leaveRange">
            <DatePicker.RangePicker
              showTime
              placeholder={["请假开始", "请假结束"]}
            />
          </Form.Item>
          <Form.Item name="createdRange">
            <DatePicker.RangePicker
              showTime
              placeholder={["创建开始", "创建结束"]}
            />
          </Form.Item>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={() => loadLeaves(1, pagination.pageSize, filters)}
          >
            搜索
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              filterForm.resetFields();
              setFilters({});
              loadLeaves(1, pagination.pageSize, {});
            }}
          >
            重置
          </Button>
        </Form>

        <SortableTable<LeaveRecord>
          rowKey="id"
          loading={loading}
          dataSource={items}
          scroll={{ x: 1500 }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true
          }}
          onChange={(nextPagination: TablePaginationConfig) =>
            loadLeaves(nextPagination.current || 1, nextPagination.pageSize || 10)
          }
          columns={[
            { title: "管家姓名", dataIndex: ["butler", "name"], width: 120 },
            {
              title: "手机号",
              dataIndex: ["butler", "phone"],
              width: 140
            },
            {
              title: "请假开始",
              dataIndex: "startAt",
              width: 180,
              render: formatDateTime
            },
            {
              title: "请假结束",
              dataIndex: "endAt",
              width: 180,
              render: formatDateTime
            },
            {
              title: "类型",
              dataIndex: "leaveType",
              width: 100,
              render: (value) => <LeaveTypeTag value={value} />
            },
            { title: "原因", dataIndex: "reason", width: 180 },
            {
              title: "状态",
              dataIndex: "status",
              width: 110,
              render: (value) => <LeaveStatusTag value={value} />
            },
            { title: "审核人", dataIndex: ["reviewer", "name"], width: 120 },
            {
              title: "审核时间",
              dataIndex: "reviewedAt",
              width: 180,
              render: formatDateTime
            },
            { title: "驳回原因", dataIndex: "reviewRemark", width: 180 },
            {
              title: "创建时间",
              dataIndex: "createdAt",
              width: 180,
              render: formatDateTime
            },
            {
              title: "操作",
              fixed: "right",
              width: 220,
              render: (_, record) => (
                <Space>
                  <Button type="link" onClick={() => setDetail(record)}>
                    详情
                  </Button>
                  {canAudit && record.status === "pending" ? (
                    <>
                      <Button
                        type="link"
                        icon={<CheckOutlined />}
                        onClick={() => approveLeave(record)}
                      >
                        通过
                      </Button>
                      <Button
                        type="link"
                        danger
                        icon={<CloseOutlined />}
                        onClick={() => setRejectTarget(record)}
                      >
                        驳回
                      </Button>
                    </>
                  ) : null}
                </Space>
              )
            }
          ]}
        />
      </Space>

      <Drawer
        title="请假详情"
        size={680}
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
      >
        {detail ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="detail-card-group">
              <div className="detail-card-title">
                <i className="fa-solid fa-calendar-minus" /> 申请基本信息
              </div>
              <Descriptions className="modern-descriptions" column={2} size="small">
                <Descriptions.Item label="管家">{detail.butler?.name}</Descriptions.Item>
                <Descriptions.Item label="手机号">
                  {detail.butler?.phone ?? "-"}
                </Descriptions.Item>
                <Descriptions.Item label="请假类型">
                  <LeaveTypeTag value={detail.leaveType} />
                </Descriptions.Item>
                <Descriptions.Item label="请假状态">
                  <LeaveStatusTag value={detail.status} />
                </Descriptions.Item>
                <Descriptions.Item label="开始时间">
                  {formatDateTime(detail.startAt)}
                </Descriptions.Item>
                <Descriptions.Item label="结束时间">
                  {formatDateTime(detail.endAt)}
                </Descriptions.Item>
              </Descriptions>
            </div>

            <div className="detail-card-group">
              <div className="detail-card-title">
                <i className="fa-solid fa-file-text" /> 请假原因说明
              </div>
              <div className="soft-text-card soft-text-card-primary">{detail.reason || "未填写请假具体原因"}</div>
            </div>

            {detail.status !== "pending" ? (
              <div className="detail-card-group">
                <div className="detail-card-title">
                  <i className="fa-solid fa-user-shield" /> 审核与反馈信息
                </div>
                <Descriptions className="modern-descriptions" column={2} size="small">
                  <Descriptions.Item label="审核人">{detail.reviewer?.name || "系统"}</Descriptions.Item>
                  <Descriptions.Item label="审核时间">
                    {formatDateTime(detail.reviewedAt)}
                  </Descriptions.Item>
                </Descriptions>
                {detail.status === "rejected" ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px", fontWeight: 500 }}>驳回原因</div>
                    <div className="soft-text-card" style={{ borderLeftColor: "#ef4444", color: "#b91c1c", background: "rgba(254, 242, 242, 0.8)" }}>{detail.reviewRemark || "-"}</div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>

      {clientReady ? (
        <RejectLeaveModal
          open={Boolean(rejectTarget)}
          target={rejectTarget}
          onCancel={() => setRejectTarget(null)}
          onSubmit={submitReject}
        />
      ) : null}
    </section>
  );
}
