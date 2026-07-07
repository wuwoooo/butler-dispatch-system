"use client";

import { AutoComplete, DatePicker, Form, Input, InputNumber, Modal, Select, Row, Col } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { useEffect } from "react";
import { pickupTypeOptions } from "@/components/status/StatusTags";
import type { HotelSummary } from "@/types/domain";

type OrderFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  order?: Record<string, unknown> | null;
  hotels: HotelSummary[];
  canEditMainFields: boolean;
  onCancel: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
};

function getDefaultRoomType(hotel?: HotelSummary) {
  return hotel?.roomTypes?.find((roomType) => roomType.enabled)?.name;
}

function getCreateDefaults(hotels: HotelSummary[]) {
  const hotel = hotels[0];

  return {
    guestCount: 1,
    hotelId: hotel?.id,
    roomType: getDefaultRoomType(hotel),
    pickupType: pickupTypeOptions[0]?.value
  };
}

function getArrivalTimeOnCheckInDate(checkInDate: Dayjs) {
  return checkInDate.startOf("day");
}

export function OrderFormModal({
  open,
  mode,
  order,
  hotels,
  canEditMainFields,
  onCancel,
  onSubmit
}: OrderFormModalProps) {
  const [form] = Form.useForm();
  const selectedHotelId = Form.useWatch("hotelId", form);
  const selectedHotel = hotels.find((hotel) => hotel.id === selectedHotelId);
  const roomTypeOptions =
    selectedHotel?.roomTypes
      ?.filter((roomType) => roomType.enabled)
      .map((roomType) => ({
        label: roomType.name,
        value: roomType.name
      })) ?? [];

  useEffect(() => {
    if (!open || mode !== "create") {
      return;
    }

    const values = form.getFieldsValue();
    const defaults = getCreateDefaults(hotels);
    const nextValues: Record<string, unknown> = {};

    if (!values.guestCount) {
      nextValues.guestCount = defaults.guestCount;
    }
    if (!values.hotelId && defaults.hotelId) {
      nextValues.hotelId = defaults.hotelId;
    }
    if (!values.roomType && defaults.roomType) {
      nextValues.roomType = defaults.roomType;
    }
    if (!values.pickupType && defaults.pickupType) {
      nextValues.pickupType = defaults.pickupType;
    }

    if (Object.keys(nextValues).length > 0) {
      form.setFieldsValue(nextValues);
    }
  }, [form, hotels, mode, open]);

  return (
    <Modal
      open={open}
      title={mode === "create" ? "新建订单" : "编辑订单"}
      width={760}
      okText="保存"
      cancelText="取消"
      destroyOnHidden
      onCancel={onCancel}
      onOk={() => form.submit()}
      className="order-form-modal"
      afterOpenChange={(visible) => {
        if (!visible) {
          form.resetFields();
          return;
        }

        if (order) {
          form.setFieldsValue({
            ...order,
            hotelId: (order.hotel as { id?: string } | undefined)?.id,
            checkInDate: order.checkInDate ? dayjs(String(order.checkInDate)) : null,
            checkOutDate: order.checkOutDate
              ? dayjs(String(order.checkOutDate))
              : null,
            arrivalTime: order.arrivalTime ? dayjs(String(order.arrivalTime)) : null
          });
        } else if (mode === "create") {
          form.setFieldsValue(getCreateDefaults(hotels));
        }
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={(changedValues) => {
          if (mode !== "create") {
            return;
          }

          if (Object.prototype.hasOwnProperty.call(changedValues, "hotelId")) {
            const hotel = hotels.find((item) => item.id === changedValues.hotelId);
            form.setFieldsValue({
              roomType: getDefaultRoomType(hotel)
            });
          }

          if (Object.prototype.hasOwnProperty.call(changedValues, "checkInDate")) {
            const checkInDate = changedValues.checkInDate as Dayjs | null;

            form.setFieldsValue({
              checkOutDate: checkInDate ? checkInDate.add(1, "day") : null,
              arrivalTime: checkInDate
                ? getArrivalTimeOnCheckInDate(checkInDate)
                : null
            });
          }
        }}
        onFinish={async (values) => {
          await onSubmit({
            ...values,
            checkInDate: values.checkInDate?.toDate().toISOString(),
            checkOutDate: values.checkOutDate?.toDate().toISOString(),
            arrivalTime: values.arrivalTime?.toDate().toISOString()
          });
        }}
      >
        <div
          style={{
            marginBottom: 16,
            padding: "10px 12px",
            borderRadius: 8,
            background: "rgba(59, 130, 246, 0.08)",
            color: "#475569",
            fontSize: 13
          }}
        >
          {mode === "create"
            ? "订单编号在保存后由系统自动生成，无需人工填写。"
            : `当前订单编号：${String(order?.orderNo ?? "-")}`}
        </div>
        <Row gutter={[16, 0]}>
          <Col span={12}>
            <Form.Item
              label="所属酒店"
              name="hotelId"
              rules={[{ required: true, message: "请选择酒店" }]}
            >
              <Select
                disabled={!canEditMainFields && mode === "edit"}
                options={hotels.map((hotel) => ({
                  label: hotel.name,
                  value: hotel.id
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="入住人数" name="guestCount" initialValue={1}>
              <InputNumber
                min={1}
                style={{ width: "100%" }}
                disabled={!canEditMainFields && mode === "edit"}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="客人姓名"
              name="guestName"
              rules={[{ required: true, message: "请输入客人姓名" }]}
            >
              <Input disabled={!canEditMainFields && mode === "edit"} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="客人手机号"
              name="guestPhone"
              rules={[{ required: true, message: "请输入客人手机号" }]}
            >
              <Input disabled={!canEditMainFields && mode === "edit"} />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="入住日期"
              name="checkInDate"
              rules={[{ required: true, message: "请选择入住日期" }]}
            >
              <DatePicker
                style={{ width: "100%" }}
                disabled={!canEditMainFields && mode === "edit"}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="离店日期"
              name="checkOutDate"
              rules={[
                { required: true, message: "请选择离店日期" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const checkInDate = getFieldValue("checkInDate");
                    const arrivalTime = getFieldValue("arrivalTime");
                    const serviceStart = [checkInDate, arrivalTime]
                      .filter(Boolean)
                      .sort((left, right) => left.valueOf() - right.valueOf())[0];

                    if (!value || !serviceStart || value.isAfter(serviceStart)) {
                      return Promise.resolve();
                    }

                    return Promise.reject(new Error("离店日期必须晚于到达时间和入住日期"));
                  }
                })
              ]}
            >
              <DatePicker
                style={{ width: "100%" }}
                disabled={!canEditMainFields && mode === "edit"}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="房型" name="roomType">
              <AutoComplete
                options={roomTypeOptions}
                disabled={!canEditMainFields && mode === "edit"}
                placeholder={
                  selectedHotel
                    ? roomTypeOptions.length
                      ? "请选择或输入房型"
                      : "当前酒店未配置房型，可直接输入"
                    : "请先选择酒店"
                }
                filterOption={(inputValue, option) =>
                  String(option?.label ?? "")
                    .toLowerCase()
                    .includes(inputValue.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="房间号" name="roomNo">
              <Input disabled={!canEditMainFields && mode === "edit"} />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="接站类型"
              name="pickupType"
              rules={[{ required: true, message: "请选择接站类型" }]}
            >
              <Select
                options={pickupTypeOptions}
                disabled={!canEditMainFields && mode === "edit"}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="航班号/车次" name="flightTrainNo">
              <Input disabled={!canEditMainFields && mode === "edit"} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="到达时间"
              name="arrivalTime"
              rules={[{ required: true, message: "请选择到达时间" }]}
            >
              <DatePicker
                showTime
                style={{ width: "100%" }}
                disabled={!canEditMainFields && mode === "edit"}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item label="特殊需求" name="specialNeeds">
              <Input.TextArea rows={2} disabled={!canEditMainFields && mode === "edit"} placeholder="选填..." />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="备注" name="remark">
              <Input.TextArea rows={2} placeholder="选填..." />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
