import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  useMyOrders,
  useSellerOrders,
  useReadyOrders,
  useAllOrders,
  useConfirmOrder,
  useReadyOrder,
  useDeliverOrder,
  useCancelOrder,
  type Order,
} from "../hooks/useOrders";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { Layout } from "../components/Layout";

// --- Constants ---

const STATUS_COLORS: Record<string, string> = {
  placed: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  ready: "bg-green-100 text-green-800 border-green-200",
  delivered: "bg-gray-100 text-gray-800 border-gray-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const ORDER_STATUSES = ["all", "placed", "confirmed", "ready", "delivered", "cancelled"] as const;

function formatIDR(cents: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(cents);
}

function isCancellable(status: string): boolean {
  return status === "placed" || status === "confirmed" || status === "ready";
}

// --- FulfillmentNotesModal ---

function FulfillmentNotesModal({
  title,
  onConfirm,
  onCancel,
  isPending,
}: {
  title: string;
  onConfirm: (notes: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [notes, setNotes] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Fulfillment notes (optional)"
          maxLength={500}
          rows={3}
          className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none h-24 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          onClick={() => onConfirm(notes)}
          disabled={isPending}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Processing..." : "Confirm"}
        </button>
        <button
          onClick={onCancel}
          disabled={isPending}
          className="w-full mt-2 py-2.5 text-gray-600 hover:text-gray-800 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// --- OrderCard ---

function OrderCard({
  order,
  actions,
}: {
  order: Order;
  actions?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-xs text-gray-400 font-mono truncate">{order.order_no}</p>
          <p className="font-medium text-gray-900 mt-0.5">{order.meal_name}</p>
        </div>
        <span
          className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border ${
            STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600 border-gray-200"
          }`}
        >
          {STATUS_LABELS[order.status] || order.status}
        </span>
      </div>
      <div className="text-sm text-gray-600 space-y-0.5">
        <p>
          {order.quantity}x &middot; {formatIDR(order.total_cents)}
        </p>
        {order.notes && (
          <p className="text-xs text-gray-400 italic truncate">&ldquo;{order.notes}&rdquo;</p>
        )}
        {order.fulfillment_notes && (
          <p className="text-xs text-gray-400 mt-1">
            <span className="font-medium">Fulfillment notes:</span> {order.fulfillment_notes}
          </p>
        )}
      </div>
      {actions && <div className="mt-3 flex gap-2">{actions}</div>}
    </div>
  );
}

// --- Loading skeleton ---

function SectionSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2].map((i) => (
        <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 animate-pulse">
          <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}

// --- Status filter tabs ---

function StatusFilterTabs({
  selected,
  onChange,
  counts,
}: {
  selected: string;
  onChange: (status: string) => void;
  counts?: Record<string, number>;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {ORDER_STATUSES.map((s) => {
        const count = s === "all" ? undefined : counts?.[s];
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selected === s
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {STATUS_LABELS[s] || "All Orders"}
            {count !== undefined && (
              <span className="ml-1.5 text-xs opacity-70">({count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// --- Order list (shared between all-orders and role sections) ---

function OrderList({
  orders,
  renderActions,
}: {
  orders: Order[];
  renderActions?: (order: Order) => React.ReactNode;
}) {
  if (orders.length === 0) return <EmptyState message="No orders found." />;
  return (
    <div className="space-y-2">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} actions={renderActions?.(order)} />
      ))}
    </div>
  );
}

// ===================================================================
// MAIN FULFILLMENT PAGE
// ===================================================================

export function FulfillmentPage() {
  const { user } = useAuth();

  // Shared mutations
  const confirmOrder = useConfirmOrder();
  const readyOrder = useReadyOrder();
  const deliverOrder = useDeliverOrder();
  const cancelOrder = useCancelOrder();

  // Modal state
  const [modal, setModal] = useState<{
    title: string;
    action: "confirm" | "ready" | "deliver" | "cancel";
    orderId: string;
  } | null>(null);

  // All Orders expandable & filter
  const [allOrdersExpanded, setAllOrdersExpanded] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const role = user?.role_name;
  const userId = user?.id;

  // ---------- Data fetching per role ----------

  const { data: sellerOrders, isLoading: sellerLoading } = useSellerOrders();
  const { data: readyOrders, isLoading: readyLoading } = useReadyOrders();
  const { data: allOrders, isLoading: allLoading } = useAllOrders(role === "manager");
  const { data: myOrders, isLoading: myLoading } = useMyOrders();

  // ---------- Modal handlers ----------

  const closeModal = () => setModal(null);

  const handleModalConfirm = (notes: string) => {
    if (!modal) return;
    const { action, orderId } = modal;
    const opts = { onSuccess: () => setModal(null) };

    switch (action) {
      case "confirm":
        confirmOrder.mutate(orderId, opts);
        break;
      case "ready":
        readyOrder.mutate({ id: orderId, fulfillment_notes: notes || undefined }, opts);
        break;
      case "deliver":
        deliverOrder.mutate({ id: orderId, fulfillment_notes: notes || undefined }, opts);
        break;
      case "cancel":
        cancelOrder.mutate({ id: orderId, fulfillment_notes: notes || undefined }, opts);
        break;
    }
  };

  const isModalPending =
    confirmOrder.isPending ||
    readyOrder.isPending ||
    deliverOrder.isPending ||
    cancelOrder.isPending;

  // ---------- Cancel permission ----------

  const canCancel = (order: Order): boolean => {
    if (!isCancellable(order.status)) return false;
    if (role === "employee") return order.employee_id === userId;
    if (role === "seller") return order.seller_id === userId;
    if (role === "office_boy") return true;
    return false;
  };

  // ---------- Filter helper ----------

  const filterByStatus = (orders: Order[], status: string) => {
    if (status === "all") return orders;
    return orders.filter((o) => o.status === status);
  };

  // ---------- Count helper ----------

  const statusCounts = (orders: Order[]) => {
    const counts: Record<string, number> = {};
    for (const o of orders) {
      counts[o.status] = (counts[o.status] || 0) + 1;
    }
    return counts;
  };

  // ---------- Shared order action buttons ----------

  const renderOrderActions = (order: Order) => {
    const buttons: React.ReactNode[] = [];

    if (role === "seller") {
      if (order.status === "placed") {
        buttons.push(
          <button
            key="confirm"
            onClick={() => setModal({ title: "Confirm Order", action: "confirm", orderId: order.id })}
            className="flex-1 bg-blue-600 text-white text-sm py-1.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Confirm
          </button>,
        );
      }
      if (order.status === "confirmed") {
        buttons.push(
          <button
            key="ready"
            onClick={() => setModal({ title: "Mark Ready", action: "ready", orderId: order.id })}
            className="flex-1 bg-green-600 text-white text-sm py-1.5 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Mark Ready
          </button>,
        );
      }
    }

    if (role === "office_boy" && order.status === "ready") {
      buttons.push(
        <button
          key="deliver"
          onClick={() => setModal({ title: "Deliver Order", action: "deliver", orderId: order.id })}
          className="flex-1 bg-green-600 text-white text-sm py-1.5 rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          Deliver
        </button>,
      );
    }

    if (canCancel(order)) {
      buttons.push(
        <button
          key="cancel"
          onClick={() => setModal({ title: "Cancel Order", action: "cancel", orderId: order.id })}
          className="flex-1 border border-red-300 text-red-600 text-sm py-1.5 rounded-lg font-medium hover:bg-red-50 transition-colors"
        >
          Cancel
        </button>,
      );
    }

    return buttons.length > 0 ? buttons : undefined;
  };

  // ===================================================================
  // RENDER
  // ===================================================================

  return (
    <ProtectedRoute>
      <Layout title="Fulfillment">
        <div className="space-y-6">
          {/* ======== SELLER VIEW ======== */}
          {role === "seller" && (
            <>
              {/* Orders to Confirm */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Orders to Confirm
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({sellerOrders?.filter((o) => o.status === "placed").length ?? 0})
                  </span>
                </h3>
                {sellerLoading ? (
                  <SectionSkeleton />
                ) : (
                  <OrderList
                    orders={sellerOrders?.filter((o) => o.status === "placed") ?? []}
                    renderActions={renderOrderActions}
                  />
                )}
              </section>

              {/* In Progress — mark confirmed orders as ready */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  In Progress
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({sellerOrders?.filter((o) => o.status === "confirmed").length ?? 0})
                  </span>
                </h3>
                {sellerLoading ? (
                  <SectionSkeleton />
                ) : (
                  <OrderList
                    orders={sellerOrders?.filter((o) => o.status === "confirmed") ?? []}
                    renderActions={renderOrderActions}
                  />
                )}
              </section>

              {/* Orders Ready */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Orders Ready
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({sellerOrders?.filter((o) => o.status === "ready").length ?? 0})
                  </span>
                </h3>
                {sellerLoading ? (
                  <SectionSkeleton />
                ) : (
                  <OrderList
                    orders={sellerOrders?.filter((o) => o.status === "ready") ?? []}
                    renderActions={renderOrderActions}
                  />
                )}
              </section>
            </>
          )}

          {/* ======== OFFICE BOY VIEW ======== */}
          {role === "office_boy" && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Ready for Delivery
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({readyOrders?.length ?? 0})
                </span>
              </h3>
              {readyLoading ? (
                <SectionSkeleton />
              ) : (
                <OrderList
                  orders={readyOrders ?? []}
                  renderActions={renderOrderActions}
                />
              )}
            </section>
          )}

          {/* ======== EMPLOYEE VIEW ======== */}
          {role === "employee" && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">My Orders</h3>
              {myLoading ? (
                <SectionSkeleton />
              ) : (
                <OrderList
                  orders={myOrders ?? []}
                  renderActions={renderOrderActions}
                />
              )}
            </section>
          )}

          {/* ======== MANAGER VIEW (All Orders read-only) ======== */}
          {role === "manager" && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">All Orders</h3>
              <div className="mb-3">
                <StatusFilterTabs
                  selected={statusFilter}
                  onChange={setStatusFilter}
                  counts={allOrders ? statusCounts(allOrders) : undefined}
                />
              </div>
              {allLoading ? (
                <SectionSkeleton />
              ) : (
                <OrderList
                  orders={filterByStatus(allOrders ?? [], statusFilter)}
                  renderActions={renderOrderActions}
                />
              )}
            </section>
          )}

          {/* ======== SHARED: ALL ORDERS (expandable, below role-specific sections) ======== */}
          {role && role !== "manager" && (
            <section className="border-t border-gray-200 pt-4">
              <button
                onClick={() => setAllOrdersExpanded(!allOrdersExpanded)}
                className="w-full flex items-center justify-between py-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                <span className="text-lg font-semibold">All Orders</span>
                <span className="text-sm text-blue-600 font-medium">
                  {allOrdersExpanded ? "Hide" : "Show"}
                </span>
              </button>

              {allOrdersExpanded && (
                <div className="mt-3 space-y-3">
                  <StatusFilterTabs
                    selected={statusFilter}
                    onChange={setStatusFilter}
                    counts={
                      role === "seller" && sellerOrders
                        ? statusCounts(sellerOrders)
                        : role === "office_boy" && readyOrders
                          ? statusCounts(readyOrders)
                          : myOrders
                            ? statusCounts(myOrders)
                            : undefined
                    }
                  />
                  {role === "seller" && (
                    <OrderList
                      orders={filterByStatus(sellerOrders ?? [], statusFilter)}
                      renderActions={renderOrderActions}
                    />
                  )}
                  {role === "office_boy" && (
                    <OrderList
                      orders={filterByStatus(readyOrders ?? [], statusFilter)}
                      renderActions={renderOrderActions}
                    />
                  )}
                  {role === "employee" && (
                    <OrderList
                      orders={filterByStatus(myOrders ?? [], statusFilter)}
                      renderActions={renderOrderActions}
                    />
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        {/* ======== FULFILLMENT NOTES MODAL ======== */}
        {modal && (
          <FulfillmentNotesModal
            title={modal.title}
            onConfirm={handleModalConfirm}
            onCancel={closeModal}
            isPending={isModalPending}
          />
        )}
      </Layout>
    </ProtectedRoute>
  );
}
