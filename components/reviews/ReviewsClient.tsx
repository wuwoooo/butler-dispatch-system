"use client";

import {
  DownloadOutlined,
  PlusOutlined,
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
  Rate,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  Row,
  Col,
  type TablePaginationConfig
} from "antd";
import type { Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { ComplaintTag } from "@/components/status/StatusTags";
import type {
  ButlerSummary,
  HotelSummary,
  OrderRecord,
  ReviewRecord
} from "@/types/domain";
import { formatDateTime } from "@/utils/format";
import { SortableTable } from "@/components/tables/SortableTable";

type ApiResult<T> =
  | { success: true; data: T; message: string }
  | { success: false; error: { code: string; message: string } };

type CurrentUser = {
  id: string;
  roleCode: string;
};

type ReviewFilterValues = {
  orderId?: string;
  butlerId?: string;
  hotelId?: string;
  reviewerRole?: string;
  complaintFlag?: string;
  createdRange?: [Dayjs, Dayjs];
};

type ReviewFormValues = {
  orderId: string;
  butlerId: string;
  overallScore: number;
  attitudeScore: number;
  punctualityScore: number;
  communicationScore: number;
  tags?: string[];
  content?: string;
  complaintFlag?: boolean;
};

type PendingReviewItem = {
  key: string;
  orderId: string;
  orderNo: string;
  hotelName: string;
  guestName: string;
  butlerId: string;
  butlerName: string;
  completedAt?: string | null;
  orderUpdatedAt: string;
};

const reviewerRoleOptions = [
  { label: "酒店前台", value: "hotel_frontdesk" },
  { label: "调配员", value: "dispatcher" },
  { label: "管理员", value: "admin" }
];

const roleLabels: Record<string, string> = {
  admin: "管理员",
  hotel_frontdesk: "酒店前台",
  dispatcher: "调配员",
  butler: "管家",
  finance: "财务"
};

const reviewableOrderStatuses = ["pending_review", "reviewed", "completed"];

const defaultReviewValues = {
  overallScore: 5,
  attitudeScore: 5,
  punctualityScore: 5,
  communicationScore: 5,
  complaintFlag: false
};

function canRoleCreateReview(roleCode?: string | null) {
  return roleCode === "admin" || roleCode === "dispatcher" || roleCode === "hotel_frontdesk";
}

export function ReviewsClient() {
  const { message } = App.useApp();
  const [filterForm] = Form.useForm();
  const [reviewForm] = Form.useForm<ReviewFormValues>();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [hotels, setHotels] = useState<HotelSummary[]>([]);
  const [butlers, setButlers] = useState<ButlerSummary[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [pendingReviews, setPendingReviews] = useState<PendingReviewItem[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const [detail, setDetail] = useState<ReviewRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("补录评价");

  const canCreate =
    currentUser?.roleCode === "admin" ||
    currentUser?.roleCode === "dispatcher" ||
    currentUser?.roleCode === "hotel_frontdesk";

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

  async function loadBootstrap() {
    const me = await request<{ user: CurrentUser }>("/api/auth/me");
    setCurrentUser(me.user);

    const [reviewableOrders, existingRoleReviews, hotelData] = await Promise.all([
      loadReviewableOrders(),
      canRoleCreateReview(me.user.roleCode)
        ? loadReviewsByRole(me.user.roleCode)
        : Promise.resolve([]),
      me.user.roleCode !== "butler"
        ? request<{ items: HotelSummary[] }>("/api/hotels")
        : Promise.resolve({ items: [] })
    ]);
    setOrders(reviewableOrders);
    setPendingReviews(buildPendingReviews(reviewableOrders, existingRoleReviews));
    setHotels(hotelData.items);

    if (["admin", "dispatcher", "finance"].includes(me.user.roleCode)) {
      const butlerData = await request<{ items: ButlerSummary[] }>("/api/butlers");
      setButlers(butlerData.items);
    }
  }

  async function loadReviewableOrders() {
    const results = await Promise.all(
      reviewableOrderStatuses.map((status) => loadOrdersByStatus(status))
    );
    const orderMap = new Map<string, OrderRecord>();

    for (const result of results) {
      for (const order of result) {
        orderMap.set(order.id, order);
      }
    }

    return Array.from(orderMap.values()).sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  }

  async function loadOrdersByStatus(status: string) {
    const pageSize = 100;
    const firstPage = await request<{
      items: OrderRecord[];
      pagination: { page: number; pageSize: number; total: number };
    }>(`/api/orders?page=1&pageSize=${pageSize}&status=${status}`);
    const totalPages = Math.ceil(firstPage.pagination.total / pageSize);

    if (totalPages <= 1) {
      return firstPage.items;
    }

    const restPages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) => index + 2).map((page) =>
        request<{
          items: OrderRecord[];
          pagination: { page: number; pageSize: number; total: number };
        }>(`/api/orders?page=${page}&pageSize=${pageSize}&status=${status}`)
      )
    );

    return [firstPage, ...restPages].flatMap((page) => page.items);
  }

  async function loadReviewsByRole(reviewerRole: string) {
    const pageSize = 100;
    const firstPage = await request<{
      items: ReviewRecord[];
      pagination: { page: number; pageSize: number; total: number };
    }>(`/api/reviews?page=1&pageSize=${pageSize}&reviewerRole=${reviewerRole}`);
    const totalPages = Math.ceil(firstPage.pagination.total / pageSize);

    if (totalPages <= 1) {
      return firstPage.items;
    }

    const restPages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) => index + 2).map((page) =>
        request<{
          items: ReviewRecord[];
          pagination: { page: number; pageSize: number; total: number };
        }>(`/api/reviews?page=${page}&pageSize=${pageSize}&reviewerRole=${reviewerRole}`)
      )
    );

    return [firstPage, ...restPages].flatMap((page) => page.items);
  }

  function buildPendingReviews(
    reviewableOrders: OrderRecord[],
    existingRoleReviews: ReviewRecord[]
  ) {
    const reviewedAssignmentIds = new Set(
      existingRoleReviews.map((review) => review.assignmentId)
    );

    return reviewableOrders
      .flatMap((order) =>
        (order.assignments ?? [])
          .filter(
            (assignment) =>
              assignment.status === "completed" &&
              !reviewedAssignmentIds.has(assignment.id)
          )
          .map((assignment): PendingReviewItem => ({
            key: `${order.id}-${assignment.id}`,
            orderId: order.id,
            orderNo: order.orderNo,
            hotelName: order.hotel?.name ?? "-",
            guestName: order.guestName,
            butlerId: assignment.butler?.id ?? "",
            butlerName: assignment.butler?.name ?? "-",
            completedAt: assignment.completedAt,
            orderUpdatedAt: order.updatedAt
          }))
      )
      .filter((item) => item.butlerId)
      .sort(
        (left, right) =>
          new Date(right.completedAt ?? right.orderUpdatedAt).getTime() -
          new Date(left.completedAt ?? left.orderUpdatedAt).getTime()
      );
  }

  async function loadReviews(page = pagination.page, pageSize = pagination.pageSize) {
    setLoading(true);
    try {
      const values = filterForm.getFieldsValue() as ReviewFilterValues;
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize)
      });

      for (const key of [
        "orderId",
        "butlerId",
        "hotelId",
        "reviewerRole",
        "complaintFlag"
      ] as const) {
        const value = values[key];

        if (value) {
          params.set(key, value);
        }
      }

      if (values.createdRange?.[0]) {
        params.set("startTime", values.createdRange[0].toDate().toISOString());
      }
      if (values.createdRange?.[1]) {
        params.set("endTime", values.createdRange[1].toDate().toISOString());
      }

      const data = await request<{
        items: ReviewRecord[];
        pagination: { page: number; pageSize: number; total: number };
      }>(`/api/reviews?${params.toString()}`);
      setReviews(data.items);
      setPagination(data.pagination);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载评价失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBootstrap()
      .then(() => loadReviews(1, 10))
      .catch((error) =>
        message.error(error instanceof Error ? error.message : "初始化失败")
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orderOptions = useMemo(
    () =>
      orders.map((order) => ({
        label: `${order.orderNo} / ${order.hotel?.name ?? "-"} / ${order.guestName}`,
        value: order.id
      })),
    [orders]
  );
  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );
  const reviewButlerOptions = useMemo(
    () =>
      (selectedOrder?.assignments ?? [])
        .filter((assignment) => assignment.status === "completed")
        .map((assignment) => ({
          label: assignment.butler?.name ?? "-",
          value: assignment.butler?.id ?? ""
        }))
        .filter((item) => item.value),
    [selectedOrder]
  );

  async function submitReview(values: ReviewFormValues) {
    try {
      await request("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          complaintFlag: Boolean(values.complaintFlag),
          tags: values.tags ?? []
        })
      });
      message.success("评价已提交");
      setModalOpen(false);
      setSelectedOrderId(null);
      setModalTitle("补录评价");
      reviewForm.resetFields();
      await Promise.all([loadBootstrap(), loadReviews()]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "提交评价失败");
    }
  }

  function openManualReviewModal() {
    setModalTitle("补录评价");
    setSelectedOrderId(null);
    reviewForm.resetFields();
    reviewForm.setFieldsValue(defaultReviewValues);
    setModalOpen(true);
  }

  function openPendingReviewModal(item: PendingReviewItem) {
    setModalTitle("提交评价");
    setSelectedOrderId(item.orderId);
    reviewForm.resetFields();
    reviewForm.setFieldsValue({
      ...defaultReviewValues,
      orderId: item.orderId,
      butlerId: item.butlerId
    });
    setModalOpen(true);
  }

  return (
    <section className="page-panel">
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            评价管理
          </Typography.Title>
          <Space>
            <Button icon={<DownloadOutlined />} disabled>
              导出
            </Button>
            {canCreate ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openManualReviewModal}
              >
                补录评价
              </Button>
            ) : null}
          </Space>
        </Space>

        {canCreate ? (
          <div className="detail-card-group">
            <div className="detail-card-title">
              <i className="fa-solid fa-clipboard-check" /> 待评价订单
            </div>
            <SortableTable<PendingReviewItem>
              rowKey="key"
              size="small"
              pagination={false}
              dataSource={pendingReviews}
              locale={{ emptyText: "暂无待评价订单" }}
              columns={[
                { title: "订单编号", dataIndex: "orderNo", width: 170 },
                { title: "酒店", dataIndex: "hotelName", width: 180 },
                { title: "客人", dataIndex: "guestName", width: 110 },
                { title: "待评价管家", dataIndex: "butlerName", width: 130 },
                {
                  title: "服务完成时间",
                  dataIndex: "completedAt",
                  width: 180,
                  render: formatDateTime
                },
                {
                  title: "操作",
                  width: 100,
                  render: (_, record) => (
                    <Button type="link" onClick={() => openPendingReviewModal(record)}>
                      评价
                    </Button>
                  )
                }
              ]}
            />
          </div>
        ) : null}

        <Form form={filterForm} layout="inline">
          <Form.Item name="orderId">
            <Input placeholder="订单 ID" allowClear style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="butlerId">
            <Select
              allowClear
              showSearch
              placeholder="管家"
              style={{ width: 160 }}
              options={butlers.map((butler) => ({
                label: butler.name,
                value: butler.id
              }))}
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="hotelId">
            <Select
              allowClear
              showSearch
              placeholder="酒店"
              style={{ width: 180 }}
              options={hotels.map((hotel) => ({
                label: hotel.name,
                value: hotel.id
              }))}
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="reviewerRole">
            <Select
              allowClear
              placeholder="评价角色"
              style={{ width: 140 }}
              options={reviewerRoleOptions}
            />
          </Form.Item>
          <Form.Item name="complaintFlag">
            <Select
              allowClear
              placeholder="是否投诉"
              style={{ width: 130 }}
              options={[
                { label: "投诉", value: "true" },
                { label: "正常", value: "false" }
              ]}
            />
          </Form.Item>
          <Form.Item name="createdRange">
            <DatePicker.RangePicker showTime placeholder={["评价开始", "评价结束"]} />
          </Form.Item>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={() => loadReviews(1, pagination.pageSize)}
          >
            搜索
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              filterForm.resetFields();
              loadReviews(1, pagination.pageSize);
            }}
          >
            重置
          </Button>
        </Form>

        <SortableTable<ReviewRecord>
          rowKey="id"
          loading={loading}
          dataSource={reviews}
          scroll={{ x: 1600 }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true
          }}
          onChange={(nextPagination: TablePaginationConfig) =>
            loadReviews(nextPagination.current || 1, nextPagination.pageSize || 10)
          }
          columns={[
            { title: "订单编号", dataIndex: ["order", "orderNo"], width: 170 },
            { title: "酒店", dataIndex: ["order", "hotel", "name"], width: 180 },
            { title: "管家", dataIndex: ["butler", "name"], width: 120 },
            {
              title: "管家手机号",
              dataIndex: ["butler", "phone"],
              width: 140
            },
            { title: "评价人", dataIndex: ["reviewer", "name"], width: 120 },
            {
              title: "评价角色",
              dataIndex: "reviewerRole",
              width: 110,
              render: (value) => roleLabels[value] ?? value
            },
            { title: "综合", dataIndex: "overallScore", width: 80 },
            { title: "态度", dataIndex: "attitudeScore", width: 80 },
            { title: "准时", dataIndex: "punctualityScore", width: 80 },
            { title: "沟通", dataIndex: "communicationScore", width: 80 },
            {
              title: "投诉",
              dataIndex: "complaintFlag",
              width: 100,
              render: (value) => <ComplaintTag value={value} />
            },
            { title: "评价内容", dataIndex: "content", width: 220 },
            {
              title: "评价时间",
              dataIndex: "createdAt",
              width: 180,
              render: formatDateTime
            },
            {
              title: "操作",
              fixed: "right",
              width: 90,
              render: (_, record) => (
                <Button type="link" onClick={() => setDetail(record)}>
                  详情
                </Button>
              )
            }
          ]}
        />
      </Space>

      <Modal
        title={
          <span>
            <i className="fa-solid fa-comment-medical" style={{ color: "var(--primary)", marginRight: 8 }} />
            {modalTitle}
          </span>
        }
        open={modalOpen}
        width={680}
        forceRender
        okText="提交评价"
        cancelText="取消"
        onCancel={() => {
          setModalOpen(false);
          setSelectedOrderId(null);
          setModalTitle("补录评价");
          reviewForm.resetFields();
        }}
        onOk={() => reviewForm.submit()}
      >
        <Form<ReviewFormValues>
          form={reviewForm}
          layout="vertical"
          initialValues={defaultReviewValues}
          onFinish={submitReview}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="订单"
                name="orderId"
                rules={[{ required: true, message: "请选择订单" }]}
              >
                <Select
                  showSearch
                  placeholder="选择待评价订单"
                  options={orderOptions}
                  optionFilterProp="label"
                  onChange={(value) => {
                    setSelectedOrderId(value);
                    reviewForm.setFieldValue("butlerId", undefined);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="评价管家"
                name="butlerId"
                rules={[{ required: true, message: "请选择管家" }]}
              >
                <Select
                  placeholder="先选择订单"
                  options={reviewButlerOptions}
                  disabled={!selectedOrder}
                />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ background: "#f8fafc", borderRadius: 12, padding: "10px 12px 0px 12px", marginBottom: 12, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", marginBottom: 8 }}>
              <i className="fa-solid fa-star" style={{ color: "var(--warning)", marginRight: 6 }} /> 评分详情
            </div>
            <Row gutter={16}>
              {[
                ["overallScore", "综合评分"],
                ["attitudeScore", "服务态度"],
                ["punctualityScore", "准时评分"],
                ["communicationScore", "沟通评分"]
              ].map(([name, label]) => (
                <Col span={12} key={name}>
                  <Form.Item
                    label={label}
                    name={name}
                    rules={[{ required: true, message: `请设置${label}` }]}
                  >
                    <Rate style={{ fontSize: 18 }} />
                  </Form.Item>
                </Col>
              ))}
            </Row>
          </div>

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item label="标签" name="tags">
                <Select
                  mode="tags"
                  placeholder="如：准时、热情、细心"
                  tokenSeparators={[",", "，"]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="是否投诉" name="complaintFlag" valuePropName="checked">
                <Switch checkedChildren="投诉" unCheckedChildren="正常" style={{ marginTop: 4 }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="评价内容" name="content">
            <Input.TextArea rows={3} maxLength={1000} showCount placeholder="请输入具体评价内容..." />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="评价详情"
        size={660}
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
      >
        {detail ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="detail-card-group">
              <div className="detail-card-title">
                <i className="fa-solid fa-file-invoice" /> 关联业务信息
              </div>
              <Descriptions className="modern-descriptions" column={2} size="small">
                <Descriptions.Item label="订单编号">{detail.order?.orderNo}</Descriptions.Item>
                <Descriptions.Item label="所属酒店">{detail.order?.hotel?.name}</Descriptions.Item>
                <Descriptions.Item label="关联管家">{detail.butler?.name}</Descriptions.Item>
                <Descriptions.Item label="评价人">{detail.reviewer?.name} ({roleLabels[detail.reviewerRole || ""] || "未知"})</Descriptions.Item>
                <Descriptions.Item label="是否投诉">
                  <ComplaintTag value={detail.complaintFlag} />
                </Descriptions.Item>
                <Descriptions.Item label="评价时间">{formatDateTime(detail.createdAt)}</Descriptions.Item>
              </Descriptions>
            </div>

            <div className="detail-card-group">
              <div className="detail-card-title">
                <i className="fa-solid fa-star-half-stroke" style={{ color: "var(--warning)" }} /> 服务星级评分
              </div>
              <Descriptions className="modern-descriptions" column={2} size="small">
                <Descriptions.Item label="综合评分"><Rate disabled defaultValue={detail.overallScore} style={{ fontSize: 15 }} /></Descriptions.Item>
                <Descriptions.Item label="服务态度"><Rate disabled defaultValue={detail.attitudeScore} style={{ fontSize: 15 }} /></Descriptions.Item>
                <Descriptions.Item label="准时评分"><Rate disabled defaultValue={detail.punctualityScore} style={{ fontSize: 15 }} /></Descriptions.Item>
                <Descriptions.Item label="沟通评分"><Rate disabled defaultValue={detail.communicationScore} style={{ fontSize: 15 }} /></Descriptions.Item>
              </Descriptions>
            </div>

            <div className="detail-card-group">
              <div className="detail-card-title">
                <i className="fa-solid fa-quote-left" /> 评价具体内容
              </div>
              {Array.isArray(detail.tags) && detail.tags.length > 0 ? (
                <Space wrap style={{ marginBottom: 12 }}>
                  {(detail.tags as string[]).map((tag) => (
                    <Tag key={tag} color="processing" style={{ borderRadius: 6 }}>{tag}</Tag>
                  ))}
                </Space>
              ) : null}
              <div className="soft-text-card soft-text-card-primary">{detail.content || "无评价具体描述内容"}</div>
            </div>
          </div>
        ) : null}
      </Drawer>
    </section>
  );
}
