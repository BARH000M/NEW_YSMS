-- =====================================================================
-- Rollback for migration 004 — fee discount catalogue + allotment.
-- Drops only the two tables created by 004. Nothing else is touched.
-- =====================================================================

drop table if exists public.fee_discount_allotments;
drop table if exists public.fee_discounts;