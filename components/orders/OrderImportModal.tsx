"use client";

import { UploadOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload
} from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import type { HotelSummary } from "@/types/domain";

type ApiResult<T> =
  | { success: true; data: T; message: string }
  | { success: false; error: { code: string; message: string } };

type PreviewRow = {
  sourceSheet: string;
  sourceRow: number;
  sourceHotelName: string | null;
  hotelId: string | null;
  hotelName: string | null;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  roomType: string | null;
  roomNo: string | null;
  pickupType: "airport" | "train" | null;
  transportDirection: "pickup" | "dropoff" | null;
  serviceStartAt: string | null;
  serviceEndAt: string | null;
  arrivalStation: string;
  requestedVehicleInfo: string | null;
  requestedVehicleType: "sedan" | "suv" | "business" | null;
  recommendedVehicleType: "sedan" | "suv" | "business";
  recommendationSource: "order_request" | "guest_count";
  settlementAmount: string | null;
  remark: string | null;
  duplicate: boolean;
  errors: string[];
  warnings: string[];
};

type PreviewData = {
  fileName: string;
  rows: PreviewRow[];
  sheetErrors: string[];
};

const vehicleLabels = { sedan: "轿车", suv: "SUV", business: "商务车" } as const;

export function OrderImportModal({
  open,
  roleCode,
  hotels,
  onClose,
  onImported
}: {
  open: boolean;
  roleCode: string;
  hotels: HotelSummary[];
  onClose: () => void;
  onImported: () => Promise<void>;
}) {
  const { message } = App.useApp();
  const [file, setFile] = useState<File | null>(null);
  const [hotelId, setHotelId] = useState<string>();
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(false);

  const rows = useMemo(() => preview?.rows ?? [], [preview]);
  const validKeySet = useMemo(
    () =>
      new Set(
        rows
          .filter((row) => getEffectiveErrors(row).length === 0 && !row.duplicate)
          .map(rowKey)
      ),
    [rows]
  );

  function reset() {
    setFile(null);
    setHotelId(undefined);
    setPreview(null);
    setSelectedKeys([]);
  }

  async function previewFile() {
    if (!file) {
      message.warning("请先选择 .xls 或 .xlsx 文件");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      message.error("导入文件不能超过 5 MB");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (hotelId) formData.append("hotelId", hotelId);
      const response = await fetch("/api/orders/import/preview", {
        method: "POST",
        body: formData
      });
      const result = (await response.json()) as ApiResult<PreviewData>;
      if (!response.ok || !result.success) {
        throw new Error(result.success ? "预览失败" : result.error.message);
      }
      setPreview(result.data);
      setSelectedKeys(
        result.data.rows
          .filter((row) => getEffectiveErrors(row).length === 0 && !row.duplicate)
          .map(rowKey)
      );
    } catch (error) {
      message.error(error instanceof Error ? error.message : "解析导入文件失败");
    } finally {
      setLoading(false);
    }
  }

  function updateRow(key: React.Key, patch: Partial<PreviewRow>) {
    const fingerprintFieldChanged = [
      "guestPhone",
      "pickupType",
      "transportDirection"
    ].some((field) => Object.prototype.hasOwnProperty.call(patch, field));
    const effectivePatch = fingerprintFieldChanged
      ? { ...patch, duplicate: false }
      : patch;
    const currentRow = preview?.rows.find((row) => rowKey(row) === key);
    const nextRow = currentRow ? { ...currentRow, ...effectivePatch } : null;
    setPreview((current) =>
      current
        ? {
            ...current,
            rows: current.rows.map((row) =>
              rowKey(row) === key ? { ...row, ...effectivePatch } : row
            )
          }
        : current
    );
    if (nextRow && getEffectiveErrors(nextRow).length > 0) {
      setSelectedKeys((current) => current.filter((item) => item !== key));
    }
  }

  async function commit() {
    if (!preview || !file) return;
    const selectedRows = preview.rows.filter(
      (row) =>
        selectedKeys.includes(rowKey(row)) &&
        getEffectiveErrors(row).length === 0 &&
        !row.duplicate
    );
    if (selectedRows.length === 0) {
      message.warning("请至少选择一条有效订单");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (hotelId) formData.append("hotelId", hotelId);
      formData.append("rows", JSON.stringify(selectedRows.map(toCommitRow)));
      const response = await fetch("/api/orders/import/commit", {
        method: "POST",
        body: formData
      });
      const result = (await response.json()) as ApiResult<{ count: number }>;
      if (!response.ok || !result.success) {
        throw new Error(result.success ? "导入失败" : result.error.message);
      }
      message.success(`成功导入 ${result.data.count} 条订单`);
      reset();
      onClose();
      await onImported();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "提交导入失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title="批量导入接送订单"
      width={1180}
      destroyOnHidden
      confirmLoading={loading}
      okText={preview ? `导入已选 ${selectedKeys.length} 条` : "解析预览"}
      onOk={preview ? commit : previewFile}
      onCancel={() => {
        reset();
        onClose();
      }}
    >
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Alert
          type="info"
          showIcon
          title="支持 WPS/Excel 的 .xls 与 .xlsx，单次最多 500 条、文件最大 5 MB。"
          description="预览不写入数据库；交通订单默认占用 3 小时，可在提交前修改手机号、接送类型、接送地点、结束时间与收费。"
        />
        <Space wrap>
          <Upload
            accept=".xls,.xlsx"
            maxCount={1}
            showUploadList
            beforeUpload={(nextFile) => {
              setFile(nextFile);
              setPreview(null);
              return false;
            }}
            onRemove={() => {
              setFile(null);
              setPreview(null);
            }}
          >
            <Button icon={<UploadOutlined />}>选择订单表</Button>
          </Upload>
          {roleCode === "admin" ? (
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="酒店自动匹配，或手动指定"
              style={{ width: 280 }}
              value={hotelId}
              onChange={(value) => {
                setHotelId(value);
                setPreview(null);
              }}
              options={hotels.map((hotel) => ({ label: hotel.name, value: hotel.id }))}
            />
          ) : null}
          {preview ? (
            <Button onClick={previewFile} loading={loading}>重新解析</Button>
          ) : null}
        </Space>

        {preview?.sheetErrors.map((error) => (
          <Alert key={error} type="error" showIcon title={error} />
        ))}

        {preview ? (
          <>
            <Typography.Text type="secondary">
              有效可导入 {validKeySet.size} 条，当前已选 {selectedKeys.length} 条。
            </Typography.Text>
            <Table<PreviewRow>
              size="small"
              rowKey={rowKey}
              dataSource={preview.rows}
              pagination={false}
              scroll={{ x: 2200, y: 430 }}
              rowSelection={{
                selectedRowKeys: selectedKeys,
                onChange: setSelectedKeys,
                getCheckboxProps: (row) => ({ disabled: !validKeySet.has(rowKey(row)) })
              }}
              columns={[
                { title: "来源", width: 110, render: (_, row) => `${row.sourceSheet} / ${row.sourceRow}` },
                { title: "酒店", dataIndex: "hotelName", width: 170, render: (value) => value || "-" },
                { title: "客人", dataIndex: "guestName", width: 110 },
                {
                  title: "手机号",
                  dataIndex: "guestPhone",
                  width: 155,
                  render: (value, row) => (
                    <Input
                      value={value}
                      maxLength={32}
                      onChange={(event) =>
                        updateRow(rowKey(row), { guestPhone: event.target.value })
                      }
                    />
                  )
                },
                { title: "人数", dataIndex: "guestCount", width: 70 },
                {
                  title: "接送类型",
                  width: 130,
                  render: (_, row) => (
                    <Select
                      style={{ width: 110 }}
                      value={getTransportTypeValue(row)}
                      placeholder="请选择"
                      options={transportTypeOptions}
                      onChange={(value) => {
                        const [pickupType, transportDirection] = value.split(":") as [
                          "airport" | "train",
                          "pickup" | "dropoff"
                        ];
                        updateRow(rowKey(row), { pickupType, transportDirection });
                      }}
                    />
                  )
                },
                {
                  title: "接送地点",
                  dataIndex: "arrivalStation",
                  width: 170,
                  render: (value, row) => (
                    <Input
                      value={value}
                      maxLength={128}
                      onChange={(event) =>
                        updateRow(rowKey(row), { arrivalStation: event.target.value })
                      }
                    />
                  )
                },
                { title: "开始时间", dataIndex: "serviceStartAt", width: 165, render: (value) => value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-" },
                {
                  title: "结束时间",
                  dataIndex: "serviceEndAt",
                  width: 190,
                  render: (value, row) => (
                    <DatePicker
                      showTime
                      value={value ? dayjs(value) : null}
                      onChange={(next) => updateRow(rowKey(row), { serviceEndAt: next?.toISOString() ?? null })}
                    />
                  )
                },
                { title: "原表车型", dataIndex: "requestedVehicleInfo", width: 160, render: (value) => value || "-" },
                {
                  title: "推荐车型",
                  width: 120,
                  render: (_, row) => <Tag color="blue">{vehicleLabels[row.recommendedVehicleType]}</Tag>
                },
                {
                  title: "收费金额",
                  dataIndex: "settlementAmount",
                  width: 150,
                  render: (value, row) => (
                    <InputNumber<string>
                      stringMode
                      min="0"
                      precision={2}
                      prefix="¥"
                      value={value ?? undefined}
                      onChange={(next) => updateRow(rowKey(row), { settlementAmount: next })}
                    />
                  )
                },
                {
                  title: "校验结果",
                  width: 300,
                  fixed: "right",
                  render: (_, row) => {
                    const errors = getEffectiveErrors(row);
                    return (
                      <Space orientation="vertical" size={2}>
                        {errors.length === 0 ? <Tag color="success">可导入</Tag> : errors.map((item) => <Typography.Text key={item} type="danger">{item}</Typography.Text>)}
                        {row.warnings.map((item) => <Typography.Text key={item} type="warning">{item}</Typography.Text>)}
                      </Space>
                    );
                  }
                }
              ]}
            />
          </>
        ) : null}
      </Space>
    </Modal>
  );
}

function rowKey(row: PreviewRow) {
  return `${row.sourceSheet}:${row.sourceRow}`;
}

function toCommitRow(row: PreviewRow) {
  return {
    sourceSheet: row.sourceSheet,
    sourceRow: row.sourceRow,
    guestPhone: row.guestPhone,
    pickupType: row.pickupType,
    transportDirection: row.transportDirection,
    arrivalStation: row.arrivalStation,
    serviceEndAt: row.serviceEndAt,
    settlementAmount: row.settlementAmount
  };
}

function getEffectiveErrors(row: PreviewRow) {
  const errors = row.errors.filter(
    (error) => {
      if (error.includes("收费金额")) {
        return row.settlementAmount === null;
      }

      return (
        !error.includes("结束时间") &&
        !error.includes("预订人手机") &&
        !error.includes("目的地") &&
        !error.includes("无法从表格标题识别")
      );
    }
  );
  if (!row.guestPhone.trim()) {
    errors.push("请填写手机号");
  }
  if (!row.pickupType || !row.transportDirection) {
    errors.push("请选择接送类型");
  }
  if (!row.arrivalStation.trim()) {
    errors.push("请填写接送地点");
  }
  if (
    row.settlementAmount &&
    !/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(row.settlementAmount)
  ) {
    errors.push("请填写正确的收费金额");
  }
  if (
    !row.serviceStartAt ||
    !row.serviceEndAt ||
    new Date(row.serviceEndAt) <= new Date(row.serviceStartAt)
  ) {
    errors.push("结束时间必须晚于开始时间");
  }
  return Array.from(new Set(errors));
}

const transportTypeOptions = [
  { label: "接机", value: "airport:pickup" },
  { label: "送机", value: "airport:dropoff" },
  { label: "接站", value: "train:pickup" },
  { label: "送站", value: "train:dropoff" }
];

function getTransportTypeValue(row: PreviewRow) {
  return row.pickupType && row.transportDirection
    ? `${row.pickupType}:${row.transportDirection}`
    : undefined;
}
