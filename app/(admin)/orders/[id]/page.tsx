import { OrderDetailPageClient } from "@/components/orders/OrderDetailPageClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  return <OrderDetailPageClient orderId={id} />;
}
