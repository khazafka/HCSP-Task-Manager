-- HCSP-OM PRD item order / service code.
-- The app writes this field as orders.item_order.

alter table public.orders
add column if not exists item_order text;

-- If an earlier local migration created service_code, keep its data.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'service_code'
  ) then
    update public.orders
    set item_order = coalesce(item_order, service_code)
    where service_code is not null;
  end if;
end $$;

create index if not exists idx_orders_item_order on public.orders(item_order);
