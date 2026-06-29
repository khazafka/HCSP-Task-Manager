-- HCSP-OM approved business units.
-- Run this in Supabase SQL Editor to ensure the order form has valid units.

insert into public.business_units (name)
select unit_name
from (
  values
    ('MANAGEMENT'),
    ('HCAM'),
    ('TGLT'),
    ('SUPPORT OCE'),
    ('HC SOLUTION I'),
    ('HC SOLUTION II'),
    ('HC SOLUTION III'),
    ('CUSTOMER')
) as approved(unit_name)
where not exists (
  select 1
  from public.business_units bu
  where upper(trim(bu.name)) = approved.unit_name
);
