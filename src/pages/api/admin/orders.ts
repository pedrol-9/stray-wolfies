import type { APIRoute } from "astro";
import { checkAdminPin, unauthorized } from "../../../lib/admin-auth";
import {
  phoneDigitsForSearch,
  sanitizeSearchQuery,
} from "../../../lib/order-search";
import { ACTIVE_STATUSES, DONE_STATUSES } from "../../../lib/order-status";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";
import type { OrderStatus } from "../../../types/admin-order";

export const prerender = false;

const ALL_STATUSES = [...ACTIVE_STATUSES, ...DONE_STATUSES] as const;

function isOrderStatus(value: string): value is OrderStatus {
  return (ALL_STATUSES as readonly string[]).includes(value);
}

export const GET: APIRoute = async ({ request, url }) => {
  if (!checkAdminPin(request)) return unauthorized();

  const filter = url.searchParams.get("filter") ?? "active";
  const qRaw = url.searchParams.get("q") ?? "";
  const q = sanitizeSearchQuery(qRaw);

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("orders")
      .select(
        `
        id, code, customer_name, customer_phone, fulfillment, delivery_address,
        delivery_fee, timing, scheduled_time, notes, subtotal, total, status, created_at,
        order_lines ( id, menu_item_id, item_name, quantity, modifier_labels, line_total )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(80);

    if (q.length >= 2) {
      const pattern = `%${q}%`;
      const digits = phoneDigitsForSearch(qRaw);
      const parts = [
        `code.ilike.${pattern}`,
        `customer_name.ilike.${pattern}`,
        `customer_phone.ilike.${pattern}`,
      ];
      if (digits.length >= 3) {
        parts.push(`customer_phone.ilike.%${digits}%`);
      }
      query = query.or(parts.join(","));
    } else if (filter === "incoming") {
      query = query.in("status", ["placed"]);
    } else if (filter === "production") {
      query = query.in("status", ["preparing"]);
    } else if (filter === "dispatched") {
      query = query.in("status", ["ready", "picked_up"]);
    } else if (filter === "active") {
      query = query.in("status", ACTIVE_STATUSES);
    } else if (filter === "done") {
      query = query.in("status", DONE_STATUSES);
    }

    const { data, error } = await query;
    if (error) throw error;

    return new Response(
      JSON.stringify({ orders: data ?? [], search: q.length >= 2 ? q : null }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  if (!checkAdminPin(request)) return unauthorized();

  try {
    const { id, status } = (await request.json()) as {
      id: string;
      status: string;
    };

    if (!id || !status || !isOrderStatus(status)) {
      return new Response(JSON.stringify({ error: "Estado inválido" }), {
        status: 400,
      });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id)
      .select("id, code, status")
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};
