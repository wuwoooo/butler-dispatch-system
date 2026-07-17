"use client";

import { App, Button, Spin, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OrderDetailView } from "@/components/orders/OrderDetailView";
import type { OrderRecord, StayExtensionRecord } from "@/types/domain";

type ApiResult<T> =
  | { success: true; data: T; message: string }
  | { success: false; error: { code: string; message: string } };

export function OrderDetailPageClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [currentUser, setCurrentUser] = useState<{ roleCode: string } | null>(null);

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
      throw new Error(result.success ? "请求失败" : result.error?.message ?? "请求失败");
    }
    return result.data;
  }

  async function load() {
    setLoading(true);
    try {
      const [orderData, me] = await Promise.all([
        request<OrderRecord>(`/api/orders/${orderId}`),
        request<{ user: { roleCode: string } }>("/api/auth/me")
      ]);
      setOrder(orderData);
      setCurrentUser(me.user);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载订单详情失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      await load();
    }

    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  function reviewStayExtension(extension: StayExtensionRecord, action: "approve" | "reject") {
    const approved = action === "approve";
    modal.confirm({
      title: approved ? "确认客人续住" : "驳回续住申请",
      content: approved
        ? "确认后会更新预计离店时间，并校验该管家的后续任务及请假冲突。"
        : "驳回后订单仍按当前预计离店时间处理。",
      okText: approved ? "确认续住" : "确认驳回",
      cancelText: "取消",
      okButtonProps: approved ? undefined : { danger: true },
      onOk: async () => {
        try {
          await request(`/api/orders/${orderId}/stay-extensions/${extension.id}`, {
            method: "POST",
            body: JSON.stringify({ action })
          });
          message.success(approved ? "续住已确认" : "续住申请已驳回");
          await load();
        } catch (error) {
          message.error(error instanceof Error ? error.message : "处理续住申请失败");
        }
      }
    });
  }

  const canReviewStayExtension = ["admin", "dispatcher", "hotel_frontdesk"].includes(
    currentUser?.roleCode || ""
  );

  return (
    <section className="page-panel">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          订单详情
        </Typography.Title>
        <Button onClick={() => router.push("/orders")}>返回列表</Button>
      </div>
      {loading ? <Spin /> : (
        <OrderDetailView
          order={order}
          canReviewStayExtension={canReviewStayExtension}
          onReviewStayExtension={reviewStayExtension}
        />
      )}
    </section>
  );
}
