"use client";

import { UploadOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  Upload
} from "antd";
import { useState } from "react";

type ApiResult<T> =
  | { success: true; data: T; message: string }
  | { success: false; error: { code: string; message: string } };

type ImportAction = "create" | "update" | "unchanged" | "conflict";

type PreviewRoomType = {
  key: string;
  sourceSheet: string;
  sourceRow: number;
  code: string;
  name: string;
  crsName: string | null;
  declaredRoomCount: number;
  rooms: Array<{ roomNo: string; remark: string | null }>;
  warnings: string[];
  errors: string[];
  action: ImportAction;
  conflict: string | null;
};

type PreviewRoom = {
  roomNo: string;
  roomTypeCode: string;
  roomTypeName: string;
  remark: string | null;
  action: ImportAction;
  conflict: string | null;
};

type ImportSummary = {
  declaredRoomCount: number;
  parsedRoomCount: number;
  roomTypes: Record<ImportAction, number>;
  rooms: Record<ImportAction, number>;
};

type PreviewData = {
  fileName: string;
  hotel: { id: string; name: string };
  roomTypes: PreviewRoomType[];
  rooms: PreviewRoom[];
  errors: string[];
  warnings: string[];
  summary: ImportSummary;
};

const actionLabels: Record<ImportAction, { label: string; color?: string }> = {
  create: { label: "新增", color: "success" },
  update: { label: "更新", color: "processing" },
  unchanged: { label: "不变" },
  conflict: { label: "冲突", color: "error" }
};

export function HotelRoomImportModal({
  open,
  hotel,
  onClose,
  onImported
}: {
  open: boolean;
  hotel: { id: string; name: string } | null;
  onClose: () => void;
  onImported: () => Promise<void>;
}) {
  const { message } = App.useApp();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setFile(null);
    setPreview(null);
  }

  async function postFile<T>(stage: "preview" | "commit") {
    if (!hotel || !file) throw new Error("请先选择房型表");
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`/api/hotels/${hotel.id}/rooms/import/${stage}`, {
      method: "POST",
      body: formData
    });
    const result = (await response.json()) as ApiResult<T>;
    if (!response.ok || !result.success) {
      throw new Error(result.success ? `${stage === "preview" ? "预览" : "导入"}失败` : result.error.message);
    }
    return result.data;
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
      setPreview(await postFile<PreviewData>("preview"));
    } catch (error) {
      message.error(error instanceof Error ? error.message : "解析房型表失败");
    } finally {
      setLoading(false);
    }
  }

  async function commit() {
    if (!preview || preview.errors.length > 0) return;
    setLoading(true);
    try {
      const summary = await postFile<ImportSummary>("commit");
      message.success(
        `导入完成：新增 ${summary.rooms.create} 个、更新 ${summary.rooms.update} 个、不变 ${summary.rooms.unchanged} 个客房单元`
      );
      reset();
      onClose();
      await onImported();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "批量导入失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title={hotel ? `批量导入房号和房类 - ${hotel.name}` : "批量导入房号和房类"}
      width={1120}
      destroyOnHidden
      confirmLoading={loading}
      okText={preview ? "确认导入" : "解析预览"}
      okButtonProps={{ disabled: Boolean(preview?.errors.length) }}
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
          title="支持 .xls / .xlsx，文件最大 5 MB；预览不会写入数据库。"
          description="系统按房型代码和完整房号匹配，重复导入不会新增重复数据；文件中未出现的既有房间不会被删除或停用。"
        />
        <Space wrap>
          <Upload
            accept=".xls,.xlsx"
            maxCount={1}
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
            <Button icon={<UploadOutlined />}>选择房型表</Button>
          </Upload>
          {preview ? (
            <Button loading={loading} onClick={previewFile}>
              重新解析
            </Button>
          ) : null}
        </Space>

        {preview ? (
          <>
            <Typography.Text>
              声明 {preview.summary.declaredRoomCount} 个、解析 {preview.summary.parsedRoomCount} 个可售客房单元；
              房型 {preview.roomTypes.length} 类。
            </Typography.Text>
            {preview.warnings.map((warning) => (
              <Alert key={warning} type="warning" showIcon title={warning} />
            ))}
            {preview.errors.map((error) => (
              <Alert key={error} type="error" showIcon title={error} />
            ))}

            <Typography.Title level={5} style={{ margin: 0 }}>
              房类预览
            </Typography.Title>
            <Table<PreviewRoomType>
              rowKey="key"
              size="small"
              pagination={false}
              dataSource={preview.roomTypes}
              scroll={{ x: 980 }}
              columns={[
                { title: "来源", width: 150, render: (_, row) => `${row.sourceSheet} / ${row.sourceRow}` },
                { title: "房型代码", dataIndex: "code", width: 100 },
                { title: "PMS 房型名称", dataIndex: "name", width: 270 },
                { title: "声明数量", dataIndex: "declaredRoomCount", width: 90 },
                { title: "解析数量", width: 90, render: (_, row) => row.rooms.length },
                { title: "动作", dataIndex: "action", width: 90, render: actionTag },
                {
                  title: "提示",
                  width: 260,
                  render: (_, row) => [...row.errors, ...row.warnings, ...(row.conflict ? [row.conflict] : [])].join("；") || "-"
                }
              ]}
            />

            <Typography.Title level={5} style={{ margin: 0 }}>
              房号预览
            </Typography.Title>
            <Table<PreviewRoom>
              rowKey={(row) => `${row.roomTypeCode}-${row.roomNo}`}
              size="small"
              dataSource={preview.rooms}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              scroll={{ x: 900, y: 320 }}
              columns={[
                { title: "房号", dataIndex: "roomNo", width: 190 },
                { title: "房型代码", dataIndex: "roomTypeCode", width: 100 },
                { title: "房类", dataIndex: "roomTypeName", width: 300 },
                { title: "动作", dataIndex: "action", width: 90, render: actionTag },
                { title: "备注", dataIndex: "remark", render: (value: string | null) => value || "-" }
              ]}
            />
          </>
        ) : null}
      </Space>
    </Modal>
  );
}

function actionTag(value: ImportAction) {
  const option = actionLabels[value];
  return <Tag color={option.color}>{option.label}</Tag>;
}
