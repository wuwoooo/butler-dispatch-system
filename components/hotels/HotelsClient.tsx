"use client";

import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { SortableTable } from "@/components/tables/SortableTable";
import type {
  HotelRoomTypeRecord,
  HotelSummary
} from "@/types/domain";
import { formatDateTime } from "@/utils/format";

type ApiResult<T> =
  | { success: true; data: T; message: string }
  | { success: false; error: { code: string; message: string } };

type CurrentUser = {
  roleCode: string;
  hotelId: string | null;
};

type HotelFormValues = {
  code: string;
  name: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  phone?: string;
  status: "active" | "disabled";
};

type RoomTypeFormValues = {
  code?: string;
  name: string;
  sort: number;
  enabled: boolean;
  remark?: string;
};

type HotelDetail = HotelSummary & {
  users?: Array<{
    id: string;
    username: string;
    name: string;
    phone?: string | null;
    status: string;
  }>;
};

type HotelModalState = {
  open: boolean;
  mode: "create" | "edit";
  hotel: HotelSummary | null;
  initialValues: HotelFormValues;
};

type RoomTypeModalState = {
  open: boolean;
  roomType: HotelRoomTypeRecord | null;
  initialValues: RoomTypeFormValues;
};

type HotelFilterValues = {
  keyword?: string;
  status?: string;
};

const emptyHotelValues: HotelFormValues = {
  code: "",
  name: "",
  address: "",
  contactName: "",
  contactPhone: "",
  phone: "",
  status: "active"
};

const emptyRoomTypeValues: RoomTypeFormValues = {
  code: "",
  name: "",
  sort: 1,
  enabled: true,
  remark: ""
};

type HotelEditorModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialValues: HotelFormValues;
  onCancel: () => void;
  onSubmit: (values: HotelFormValues) => Promise<void>;
};

function HotelEditorModal({
  open,
  mode,
  initialValues,
  onCancel,
  onSubmit
}: HotelEditorModalProps) {
  return (
    <Modal
      open={open}
      title={mode === "create" ? "新建酒店" : "编辑酒店"}
      width={640}
      destroyOnHidden
      onCancel={onCancel}
      footer={null}
    >
      <Form
        key={`${mode}-${open ? "open" : "closed"}-${initialValues.code}-${initialValues.name}`}
        layout="vertical"
        initialValues={initialValues}
        onFinish={onSubmit}
      >
        {mode === "edit" ? (
          <Form.Item
            label="系统编码"
            name="code"
            extra="仅管理员可在编辑时调整编码，建议只在对接外部系统时修改。"
          >
            <Input placeholder="仅在需要对接外部系统时填写或修改" />
          </Form.Item>
        ) : null}
        <Form.Item label="酒店名称" name="name" rules={[{ required: true, message: "请输入酒店名称" }]}>
          <Input />
        </Form.Item>
        <Form.Item label="酒店地址" name="address">
          <Input />
        </Form.Item>
        <Form.Item label="联系人" name="contactName">
          <Input />
        </Form.Item>
        <Form.Item label="联系人电话" name="contactPhone">
          <Input />
        </Form.Item>
        <Form.Item label="酒店电话" name="phone">
          <Input />
        </Form.Item>
        <Form.Item label="状态" name="status" rules={[{ required: true, message: "请选择状态" }]}>
          <Select
            options={[
              { label: "启用", value: "active" },
              { label: "停用", value: "disabled" }
            ]}
          />
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

type RoomTypeEditorModalProps = {
  open: boolean;
  editingRoomType: HotelRoomTypeRecord | null;
  initialValues: RoomTypeFormValues;
  onCancel: () => void;
  onSubmit: (values: RoomTypeFormValues) => Promise<void>;
};

function RoomTypeEditorModal({
  open,
  editingRoomType,
  initialValues,
  onCancel,
  onSubmit
}: RoomTypeEditorModalProps) {
  return (
    <Modal
      open={open}
      title={editingRoomType ? "编辑房型" : "新增房型"}
      width={560}
      destroyOnHidden
      onCancel={onCancel}
      footer={null}
    >
      <Form
        key={`${editingRoomType?.id ?? "create"}-${open ? "open" : "closed"}-${initialValues.name}-${initialValues.sort}`}
        layout="vertical"
        initialValues={initialValues}
        onFinish={onSubmit}
      >
        {editingRoomType ? (
          <Form.Item
            label="系统编码"
            name="code"
            extra="仅管理员可在编辑时调整编码，留空不会覆盖当前编码。"
          >
            <Input placeholder="仅在需要对接外部系统时填写或修改" />
          </Form.Item>
        ) : null}
        <Form.Item label="房型名称" name="name" rules={[{ required: true, message: "请输入房型名称" }]}>
          <Input />
        </Form.Item>
        <Form.Item label="排序" name="sort" rules={[{ required: true, message: "请输入排序" }]}>
          <Input type="number" />
        </Form.Item>
        <Form.Item label="启用状态" name="enabled" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item label="备注" name="remark">
          <Input.TextArea rows={3} />
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

export function HotelsClient() {
  const { message } = App.useApp();
  const [filterForm] = Form.useForm();
  const [clientReady, setClientReady] = useState(false);
  const [filters, setFilters] = useState<HotelFilterValues>({});
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [hotels, setHotels] = useState<HotelSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [detail, setDetail] = useState<HotelDetail | null>(null);
  const [hotelModal, setHotelModal] = useState<HotelModalState>({
    open: false,
    mode: "create",
    hotel: null,
    initialValues: emptyHotelValues
  });
  const [roomTypeModal, setRoomTypeModal] = useState<RoomTypeModalState>({
    open: false,
    roomType: null,
    initialValues: emptyRoomTypeValues
  });

  const canManageHotels = currentUser?.roleCode === "admin";

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

  async function loadBootstrap() {
    const me = await request<{ user: CurrentUser }>("/api/auth/me");
    setCurrentUser(me.user);
  }

  async function loadHotels() {
    setLoading(true);
    try {
      const data = await request<{ items: HotelSummary[] }>("/api/hotels");
      setHotels(data.items);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载酒店失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadHotelDetail(hotelId: string) {
    setDrawerLoading(true);
    try {
      const data = await request<HotelDetail>(`/api/hotels/${hotelId}`);
      setDetail(data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载酒店详情失败");
    } finally {
      setDrawerLoading(false);
    }
  }

  useEffect(() => {
    // Ant Modal/Drawer 依赖 Portal，这里只在客户端挂载后渲染这些组件。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClientReady(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBootstrap()
      .then(() => loadHotels())
      .catch((error) =>
        message.error(error instanceof Error ? error.message : "初始化失败")
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredHotels = useMemo(() => {
    const keyword = String(filters.keyword ?? "").trim().toLowerCase();
    const status = filters.status;

    return hotels.filter((hotel) => {
      const matchesKeyword =
        !keyword ||
        hotel.name.toLowerCase().includes(keyword) ||
        String(hotel.code ?? "").toLowerCase().includes(keyword) ||
        String(hotel.contactName ?? "").toLowerCase().includes(keyword);
      const matchesStatus = !status || hotel.status === status;
      return matchesKeyword && matchesStatus;
    });
  }, [filters.keyword, filters.status, hotels]);

  const summary = useMemo(() => {
    const activeHotels = hotels.filter((hotel) => hotel.status === "active").length;
    const roomTypeCount = hotels.reduce(
      (sum, hotel) => sum + (hotel._count?.roomTypes ?? hotel.roomTypes?.length ?? 0),
      0
    );
    const frontdeskCount = hotels.reduce(
      (sum, hotel) => sum + (hotel._count?.users ?? 0),
      0
    );

    return {
      totalHotels: hotels.length,
      activeHotels,
      roomTypeCount,
      frontdeskCount
    };
  }, [hotels]);

  async function submitHotel(values: HotelFormValues) {
    try {
      const url =
        hotelModal.mode === "create"
          ? "/api/hotels"
          : `/api/hotels/${hotelModal.hotel?.id}`;
      const method = hotelModal.mode === "create" ? "POST" : "PUT";

      await request(url, {
        method,
        body: JSON.stringify(values)
      });

      message.success(hotelModal.mode === "create" ? "酒店已创建" : "酒店已更新");
      setHotelModal({
        open: false,
        mode: "create",
        hotel: null,
        initialValues: emptyHotelValues
      });
      await loadHotels();

      if (detail && hotelModal.hotel?.id === detail.id) {
        await loadHotelDetail(detail.id);
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : "保存酒店失败");
    }
  }

  async function submitRoomType(values: RoomTypeFormValues) {
    if (!detail) {
      return;
    }

    try {
      const isEdit = Boolean(roomTypeModal.roomType);
      const url = isEdit
        ? `/api/hotel-room-types/${roomTypeModal.roomType?.id}`
        : `/api/hotels/${detail.id}/room-types`;
      const method = isEdit ? "PUT" : "POST";

      await request(url, {
        method,
        body: JSON.stringify(values)
      });

      message.success(isEdit ? "房型已更新" : "房型已创建");
      setRoomTypeModal({
        open: false,
        roomType: null,
        initialValues: emptyRoomTypeValues
      });
      await Promise.all([loadHotels(), loadHotelDetail(detail.id)]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "保存房型失败");
    }
  }

  async function deleteRoomType(roomTypeId: string) {
    if (!detail) {
      return;
    }

    try {
      await request(`/api/hotel-room-types/${roomTypeId}`, {
        method: "DELETE"
      });
      message.success("房型已删除");
      await Promise.all([loadHotels(), loadHotelDetail(detail.id)]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "删除房型失败");
    }
  }

  return (
    <section className="page-panel">
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            酒店管理
          </Typography.Title>
          {canManageHotels ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() =>
                setHotelModal({
                  open: true,
                  mode: "create",
                  hotel: null,
                  initialValues: emptyHotelValues
                })
              }
            >
              新建酒店
            </Button>
          ) : null}
        </Space>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Typography.Text type="secondary">酒店总数</Typography.Text>
              <Typography.Title level={3} style={{ margin: "8px 0 0" }}>
                {summary.totalHotels}
              </Typography.Title>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Typography.Text type="secondary">启用酒店</Typography.Text>
              <Typography.Title level={3} style={{ margin: "8px 0 0" }}>
                {summary.activeHotels}
              </Typography.Title>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Typography.Text type="secondary">房型总数</Typography.Text>
              <Typography.Title level={3} style={{ margin: "8px 0 0" }}>
                {summary.roomTypeCount}
              </Typography.Title>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Typography.Text type="secondary">前台账号数</Typography.Text>
              <Typography.Title level={3} style={{ margin: "8px 0 0" }}>
                {summary.frontdeskCount}
              </Typography.Title>
            </Card>
          </Col>
        </Row>

        <Form
          form={filterForm}
          layout="inline"
          onValuesChange={(_, allValues: HotelFilterValues) => setFilters(allValues)}
        >
          <Form.Item name="keyword">
            <Input allowClear placeholder="酒店名称/联系人" style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="status">
            <Select
              allowClear
              placeholder="状态"
              style={{ width: 140 }}
              options={[
                { label: "启用", value: "active" },
                { label: "停用", value: "disabled" }
              ]}
            />
          </Form.Item>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={() => setHotels((prev) => [...prev])}
          >
            搜索
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              filterForm.resetFields();
              setFilters({});
              setHotels((prev) => [...prev]);
            }}
          >
            重置
          </Button>
        </Form>

        <SortableTable<HotelSummary>
          rowKey="id"
          loading={loading}
          dataSource={filteredHotels}
          scroll={{ x: 1500 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true
          }}
          columns={[
            { title: "酒店名称", dataIndex: "name", width: 220, fixed: "left" },
            { title: "地址", dataIndex: "address", width: 240 },
            { title: "联系人", dataIndex: "contactName", width: 120 },
            { title: "联系电话", dataIndex: "contactPhone", width: 140 },
            { title: "酒店电话", dataIndex: "phone", width: 140 },
            {
              title: "房型数",
              width: 100,
              render: (_, record) => record._count?.roomTypes ?? record.roomTypes?.length ?? 0
            },
            {
              title: "前台账号数",
              width: 110,
              render: (_, record) => record._count?.users ?? 0
            },
            {
              title: "订单数",
              width: 100,
              render: (_, record) => record._count?.orders ?? 0
            },
            {
              title: "房型预览",
              width: 240,
              render: (_, record) =>
                record.roomTypes?.length ? (
                  <Space wrap size={[4, 4]}>
                    {record.roomTypes.slice(0, 4).map((roomType) => (
                      <Tag key={roomType.id}>{roomType.name}</Tag>
                    ))}
                    {record.roomTypes.length > 4 ? (
                      <Tag>{`+${record.roomTypes.length - 4}`}</Tag>
                    ) : null}
                  </Space>
                ) : (
                  <Typography.Text type="secondary">未配置</Typography.Text>
                )
            },
            {
              title: "状态",
              dataIndex: "status",
              width: 100,
              render: (value: string) =>
                value === "active" ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>
            },
            {
              title: "更新时间",
              dataIndex: "updatedAt",
              width: 180,
              render: (value: string) => formatDateTime(value)
            },
            {
              title: "操作",
              fixed: "right",
              width: 180,
              render: (_, record) => (
                <Space>
                  <Button type="link" onClick={() => loadHotelDetail(record.id)}>
                    详情
                  </Button>
                  {canManageHotels ? (
                    <Button
                      type="link"
                      onClick={() =>
                        setHotelModal({
                          open: true,
                          mode: "edit",
                          hotel: record,
                          initialValues: {
                            code: record.code ?? "",
                            name: record.name,
                            address: record.address ?? "",
                            contactName: record.contactName ?? "",
                            contactPhone: record.contactPhone ?? "",
                            phone: record.phone ?? "",
                            status: (record.status as "active" | "disabled") ?? "active"
                          }
                        })
                      }
                    >
                      编辑
                    </Button>
                  ) : null}
                </Space>
              )
            }
          ]}
        />
      </Space>

      {clientReady ? (
        <>
          <HotelEditorModal
            open={hotelModal.open}
            mode={hotelModal.mode}
            initialValues={hotelModal.initialValues}
            onCancel={() =>
              setHotelModal({
                open: false,
                mode: "create",
                hotel: null,
                initialValues: emptyHotelValues
              })
            }
            onSubmit={submitHotel}
          />

          <Drawer
            title={detail ? `酒店详情 - ${detail.name}` : "酒店详情"}
            size={900}
            open={Boolean(detail)}
            onClose={() => setDetail(null)}
          >
            {detail ? (
              <Space orientation="vertical" size={20} style={{ width: "100%" }}>
                <Card size="small" loading={drawerLoading}>
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Typography.Text type="secondary">酒店名称</Typography.Text>
                      <div>{detail.name}</div>
                    </Col>
                    <Col span={12}>
                      <Typography.Text type="secondary">酒店状态</Typography.Text>
                      <div>{detail.status === "active" ? "启用" : "停用"}</div>
                    </Col>
                    <Col span={12}>
                      <Typography.Text type="secondary">联系人</Typography.Text>
                      <div>{detail.contactName || "-"}</div>
                    </Col>
                    <Col span={12}>
                      <Typography.Text type="secondary">联系电话</Typography.Text>
                      <div>{detail.contactPhone || "-"}</div>
                    </Col>
                    <Col span={12}>
                      <Typography.Text type="secondary">酒店电话</Typography.Text>
                      <div>{detail.phone || "-"}</div>
                    </Col>
                    <Col span={24}>
                      <Typography.Text type="secondary">酒店地址</Typography.Text>
                      <div>{detail.address || "-"}</div>
                    </Col>
                  </Row>
                </Card>

                <Card
                  size="small"
                  title="房型信息"
                  extra={
                    canManageHotels ? (
                      <Button
                        type="primary"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() =>
                          setRoomTypeModal({
                            open: true,
                            roomType: null,
                            initialValues: {
                              ...emptyRoomTypeValues,
                              sort: (detail.roomTypes?.length ?? 0) + 1
                            }
                          })
                        }
                      >
                        新增房型
                      </Button>
                    ) : null
                  }
                >
                  <Table<HotelRoomTypeRecord>
                    rowKey="id"
                    size="small"
                    pagination={false}
                    dataSource={detail.roomTypes ?? []}
                    locale={{ emptyText: "当前酒店还没有配置房型" }}
                    columns={[
                      { title: "房型名称", dataIndex: "name", width: 200 },
                      { title: "排序", dataIndex: "sort", width: 80 },
                      {
                        title: "状态",
                        dataIndex: "enabled",
                        width: 100,
                        render: (value: boolean) =>
                          value ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>
                      },
                      { title: "备注", dataIndex: "remark", render: (value: string) => value || "-" },
                      canManageHotels
                        ? {
                            title: "操作",
                            width: 180,
                            render: (_: unknown, record: HotelRoomTypeRecord) => (
                              <Space>
                                <Button
                                  type="link"
                                  size="small"
                                  onClick={() =>
                                    setRoomTypeModal({
                                      open: true,
                                      roomType: record,
                                      initialValues: {
                                        code: record.code ?? "",
                                        name: record.name,
                                        sort: record.sort,
                                        enabled: record.enabled,
                                        remark: record.remark ?? ""
                                      }
                                    })
                                  }
                                >
                                  编辑
                                </Button>
                                <Popconfirm
                                  title="确认删除该房型？"
                                  onConfirm={() => deleteRoomType(record.id)}
                                >
                                  <Button type="link" danger size="small">
                                    删除
                                  </Button>
                                </Popconfirm>
                              </Space>
                            )
                          }
                        : {}
                    ]}
                  />
                </Card>

                <Card size="small" title="前台账号">
                  <Table
                    rowKey="id"
                    size="small"
                    pagination={false}
                    dataSource={detail.users ?? []}
                    locale={{ emptyText: "当前酒店没有绑定前台账号" }}
                    columns={[
                      { title: "用户名", dataIndex: "username", width: 160 },
                      { title: "姓名", dataIndex: "name", width: 140 },
                      { title: "手机号", dataIndex: "phone", width: 140, render: (value: string) => value || "-" },
                      {
                        title: "状态",
                        dataIndex: "status",
                        width: 100,
                        render: (value: string) =>
                          value === "active" ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>
                      }
                    ]}
                  />
                </Card>
              </Space>
            ) : null}
          </Drawer>

          <RoomTypeEditorModal
            open={roomTypeModal.open}
            editingRoomType={roomTypeModal.roomType}
            initialValues={roomTypeModal.initialValues}
            onCancel={() =>
              setRoomTypeModal({
                open: false,
                roomType: null,
                initialValues: emptyRoomTypeValues
              })
            }
            onSubmit={submitRoomType}
          />
        </>
      ) : null}
    </section>
  );
}
