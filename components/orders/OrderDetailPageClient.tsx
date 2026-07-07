"use client";

import { App, Button, Spin, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OrderDetailView } from "@/components/orders/OrderDetailView";
import type { OrderRecord } from "@/types/domain";

type ApiResult<T> =
  | { success: true; data: T; message: string }
  | { success: false; error: { code: string; message: string } };

export function OrderDetailPageClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderRecord | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        const result = (await response.json()) as ApiResult<OrderRecord>;

        if (!response.ok || !result.success) {
          throw new Error(
            result.success ? "加载失败" : result.error?.message ?? "加载失败"
          );
        }

        setOrder(result.data);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "加载订单详情失败");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [message, orderId]);

  return (
    <section className="page-panel">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          订单详情
        </Typography.Title>
        <Button onClick={() => router.push("/orders")}>返回列表</Button>
      </div>
      {loading ? <Spin /> : <OrderDetailView order={order} />}
    </section>
  );
}
