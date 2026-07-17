"use client";

import {
  AutoComplete,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select
} from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { useEffect } from "react";
import { pickupTypeOptions } from "@/components/status/StatusTags";
import { buildTransportOrderUpdatePayload } from "@/lib/order-edit";
import type { HotelSummary, OrderRecord } from "@/types/domain";

type OrderFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  order?: OrderRecord | null;
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
  const isTransport = mode === "edit" && order?.serviceMode === "transport";
  const mainFieldsDisabled = !canEditMainFields && mode === "edit";
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

    if (!values.guestCount) nextValues.guestCount = defaults.guestCount;
    if (!values.hotelId && defaults.hotelId) nextValues.hotelId = defaults.hotelId;
    if (!values.roomType && defaults.roomType) nextValues.roomType = defaults.roomType;
    if (!values.pickupType && defaults.pickupType) nextValues.pickupType = defaults.pickupType;

    if (Object.keys(nextValues).length > 0) {
      form.setFieldsValue(nextValues);
    }
  }, [form, hotels, mode, open]);

  return (
    <Modal
      open={open}
      title={
        mode === "create"
          ? "新建订单"
          : isTransport
            ? "编辑交通订单"
            : "编辑订单"
      }
      width={isTransport ? 860 : 760}
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
            hotelId: order.hotel?.id ?? order.hotelId,
            checkInDate: order.checkInDate ? dayjs(order.checkInDate) : null,
            checkOutDate: order.checkOutDate ? dayjs(order.checkOutDate) : null,
            arrivalTime: order.arrivalTime ? dayjs(order.arrivalTime) : null,
            serviceStartAt: order.serviceStartAt ? dayjs(order.serviceStartAt) : null,
            serviceEndAt: order.serviceEndAt ? dayjs(order.serviceEndAt) : null,
            settlementAmount:
              order.settlementAmount === null || order.settlementAmount === undefined
                ? undefined
                : Number(order.settlementAmount).toFixed(2)
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
          if (
            mode === "create" &&
            Object.prototype.hasOwnProperty.call(changedValues, "hotelId")
          ) {
            const hotel = hotels.find((item) => item.id === changedValues.hotelId);
            form.setFieldsValue({ roomType: getDefaultRoomType(hotel) });
          }

          if (
            !isTransport &&
            Object.prototype.hasOwnProperty.call(changedValues, "checkInDate")
          ) {
            const checkInDate = changedValues.checkInDate as Dayjs | null;

            form.setFieldsValue({
              ...(mode === "create"
                ? { checkOutDate: checkInDate ? checkInDate.add(1, "day") : null }
                : {}),
              arrivalTime: checkInDate
                ? getArrivalTimeOnCheckInDate(checkInDate)
                : null
            });
          }
        }}
        onFinish={async (values) => {
          if (isTransport) {
            await onSubmit(buildTransportOrderUpdatePayload({
              ...values,
              serviceStartAt: values.serviceStartAt?.toDate().toISOString(),
              serviceEndAt: values.serviceEndAt?.toDate().toISOString(),
              settlementAmount: values.settlementAmount ?? null
            }));
            return;
          }

          await onSubmit({
            ...values,
            checkInDate: values.checkInDate?.toDate().toISOString(),
            checkOutDate: values.checkOutDate?.toDate().toISOString(),
            arrivalTime: values.arrivalTime?.toDate().toISOString()
          });
        }}
      >
        {mode === "edit" ? (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 12px",
              borderRadius: 8,
              background: isTransport
                ? "rgba(124, 58, 237, 0.08)"
                : "rgba(59, 130, 246, 0.08)",
              color: "#475569",
              fontSize: 13
            }}
          >
            当前订单编号：{order?.orderNo ?? "-"}
            {isTransport ? " · 交通接送订单" : ""}
          </div>
        ) : null}

        <Row gutter={[16, 0]}>
          <Col span={12}>
            <Form.Item
              label="所属酒店"
              name="hotelId"
              rules={[{ required: true, message: "请选择酒店" }]}
            >
              <Select
                disabled={mainFieldsDisabled}
                options={hotels.map((hotel) => ({
                  label: hotel.name,
                  value: hotel.id
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label={isTransport ? "接送人数" : "入住人数"}
              name="guestCount"
              initialValue={1}
              rules={[{ required: true, message: "请输入人数" }]}
            >
              <InputNumber min={1} style={{ width: "100%" }} disabled={mainFieldsDisabled} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="客人姓名"
              name="guestName"
              rules={[{ required: true, message: "请输入客人姓名" }]}
            >
              <Input disabled={mainFieldsDisabled} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="客人手机号"
              name="guestPhone"
              rules={[{ required: true, message: "请输入客人手机号" }]}
            >
              <Input disabled={mainFieldsDisabled} />
            </Form.Item>
          </Col>

          {isTransport ? (
            <TransportOrderFields
              disabled={mainFieldsDisabled}
              roomTypeOptions={roomTypeOptions}
              selectedHotel={selectedHotel}
            />
          ) : (
            <StayOrderFields
              disabled={mainFieldsDisabled}
              roomTypeOptions={roomTypeOptions}
              selectedHotel={selectedHotel}
            />
          )}
        </Row>
      </Form>
    </Modal>
  );
}

function TransportOrderFields({
  disabled,
  roomTypeOptions,
  selectedHotel
}: {
  disabled: boolean;
  roomTypeOptions: Array<{ label: string; value: string }>;
  selectedHotel?: HotelSummary;
}) {
  return (
    <>
      <Col span={12}>
        <Form.Item
          label="交通枢纽"
          name="pickupType"
          rules={[{ required: true, message: "请选择机场或火车站" }]}
        >
          <Select
            disabled={disabled}
            options={[
              { label: "机场", value: "airport" },
              { label: "火车站", value: "train" }
            ]}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label="接送方向"
          name="transportDirection"
          rules={[{ required: true, message: "请选择接送方向" }]}
        >
          <Select
            disabled={disabled}
            options={[
              { label: "接：机场/火车站 → 酒店", value: "pickup" },
              { label: "送：酒店 → 机场/火车站", value: "dropoff" }
            ]}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label="接送地点"
          name="arrivalStation"
          rules={[{ required: true, message: "请输入接送地点" }]}
        >
          <Input disabled={disabled} placeholder="如：大理站、大理凤仪机场" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="航班号/车次" name="flightTrainNo">
          <Input disabled={disabled} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label="服务开始时间"
          name="serviceStartAt"
          rules={[{ required: true, message: "请选择服务开始时间" }]}
        >
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm"
            style={{ width: "100%" }}
            disabled={disabled}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label="服务结束时间"
          name="serviceEndAt"
          dependencies={["serviceStartAt"]}
          rules={[
            { required: true, message: "请选择服务结束时间" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                const startAt = getFieldValue("serviceStartAt");
                if (!value || !startAt || value.isAfter(startAt)) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("服务结束时间必须晚于开始时间"));
              }
            })
          ]}
        >
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm"
            style={{ width: "100%" }}
            disabled={disabled}
          />
        </Form.Item>
      </Col>
      <RoomFields
        disabled={disabled}
        roomTypeOptions={roomTypeOptions}
        selectedHotel={selectedHotel}
      />
      <Col span={12}>
        <Form.Item label="原表车型" name="requestedVehicleInfo">
          <Input disabled={disabled} placeholder="如：GL8、赛那、SUV" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="标准车型" name="requestedVehicleType">
          <Select
            allowClear
            disabled={disabled}
            options={[
              { label: "轿车", value: "sedan" },
              { label: "SUV", value: "suv" },
              { label: "商务车", value: "business" }
            ]}
            placeholder="留空则按人数推荐"
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="收费金额" name="settlementAmount">
          <InputNumber<string>
            stringMode
            min="0"
            precision={2}
            prefix="¥"
            style={{ width: "100%" }}
            disabled={disabled}
            placeholder="选填，留空则不记录金额"
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="特殊需求" name="specialNeeds">
          <Input.TextArea rows={2} disabled={disabled} placeholder="选填..." />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item label="备注" name="remark">
          <Input.TextArea rows={2} placeholder="选填..." />
        </Form.Item>
      </Col>
    </>
  );
}

function StayOrderFields({
  disabled,
  roomTypeOptions,
  selectedHotel
}: {
  disabled: boolean;
  roomTypeOptions: Array<{ label: string; value: string }>;
  selectedHotel?: HotelSummary;
}) {
  return (
    <>
      <Col span={12}>
        <Form.Item
          label="入住日期"
          name="checkInDate"
          rules={[{ required: true, message: "请选择入住日期" }]}
        >
          <DatePicker style={{ width: "100%" }} disabled={disabled} />
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

                return Promise.reject(
                  new Error("离店日期必须晚于到达时间和入住日期")
                );
              }
            })
          ]}
        >
          <DatePicker style={{ width: "100%" }} disabled={disabled} />
        </Form.Item>
      </Col>
      <RoomFields
        disabled={disabled}
        roomTypeOptions={roomTypeOptions}
        selectedHotel={selectedHotel}
      />
      <Col span={12}>
        <Form.Item
          label="接站类型"
          name="pickupType"
          rules={[{ required: true, message: "请选择接站类型" }]}
        >
          <Select options={pickupTypeOptions} disabled={disabled} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="航班号/车次" name="flightTrainNo">
          <Input disabled={disabled} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label="到达时间"
          name="arrivalTime"
          rules={[{ required: true, message: "请选择到达时间" }]}
        >
          <DatePicker showTime style={{ width: "100%" }} disabled={disabled} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="特殊需求" name="specialNeeds">
          <Input.TextArea rows={2} disabled={disabled} placeholder="选填..." />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="备注" name="remark">
          <Input.TextArea rows={2} placeholder="选填..." />
        </Form.Item>
      </Col>
    </>
  );
}

function RoomFields({
  disabled,
  roomTypeOptions,
  selectedHotel
}: {
  disabled: boolean;
  roomTypeOptions: Array<{ label: string; value: string }>;
  selectedHotel?: HotelSummary;
}) {
  return (
    <>
      <Col span={12}>
        <Form.Item label="房型" name="roomType">
          <AutoComplete
            options={roomTypeOptions}
            disabled={disabled}
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
          <Input disabled={disabled} />
        </Form.Item>
      </Col>
    </>
  );
}
