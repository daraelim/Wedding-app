-- Non-destructive RSVP meal session extension.
-- Run before deploying the updated rsvp-v2 Edge Function.
ALTER TABLE public.rsvps
  ADD COLUMN IF NOT EXISTS meal_slot text NOT NULL DEFAULT 'undecided';

ALTER TABLE public.rsvps
  DROP CONSTRAINT IF EXISTS rsvps_meal_slot_check;

ALTER TABLE public.rsvps
  ADD CONSTRAINT rsvps_meal_slot_check
  CHECK (meal_slot IN ('first', 'second', 'undecided', 'none'));

-- For existing records, no selection was previously collected.
-- Keep them as 'undecided'; zero-meal records can be marked 'none'.
UPDATE public.rsvps SET meal_slot = 'none' WHERE meals = 0 AND meal_slot = 'undecided';
