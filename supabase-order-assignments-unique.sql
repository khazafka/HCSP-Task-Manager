-- Prevent duplicate assignments of the same user to the same order.
-- Run this in Supabase SQL Editor after backing up if duplicate assignment rows already matter historically.

with ranked as (
  select
    ctid,
    row_number() over (partition by order_id, user_id order by id) as rn
  from public.order_assignments
  where order_id is not null
    and user_id is not null
)
delete from public.order_assignments oa
using ranked r
where oa.ctid = r.ctid
  and r.rn > 1;

create unique index if not exists order_assignments_order_user_unique
on public.order_assignments (order_id, user_id);
