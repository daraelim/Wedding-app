-- One reception at Amid Hotel, Nov 14 19:00-21:00. Preserve historical RSVP rows.
-- Capacity counts all confirmed meal attendees irrespective of their old first/second selections.
CREATE OR REPLACE FUNCTION public.reception_capacity_status()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
 SELECT jsonb_build_object('capacity',120,'reserved',coalesce(sum(meals),0),
 'remaining',greatest(0,120-coalesce(sum(meals),0)))
 FROM public.rsvps WHERE attendance='참석';
$$;
REVOKE ALL ON FUNCTION public.reception_capacity_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reception_capacity_status() TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.enforce_reception_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE reserved_count integer;
BEGIN
  -- Serializes concurrent inserts/updates for the same reception, including walk-ins.
  PERFORM pg_advisory_xact_lock(20261114,120);
  IF NEW.attendance='참석' AND NEW.meals>0 THEN
    SELECT coalesce(sum(meals),0)::integer INTO reserved_count
    FROM public.rsvps WHERE attendance='참석' AND id IS DISTINCT FROM NEW.id;
    IF reserved_count+NEW.meals>120 THEN
       RAISE EXCEPTION 'RECEPTION_CAPACITY_EXCEEDED' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS reception_capacity_guard ON public.rsvps;
CREATE TRIGGER reception_capacity_guard BEFORE INSERT OR UPDATE OF attendance,meals
ON public.rsvps FOR EACH ROW EXECUTE FUNCTION public.enforce_reception_capacity();
REVOKE ALL ON FUNCTION public.enforce_reception_capacity() FROM PUBLIC;

-- Admin deletion RPC: server verifies logged-in identity against admin_users.
CREATE OR REPLACE FUNCTION public.admin_delete_rsvp(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE is_allowed boolean; deleted_id uuid;
BEGIN
 SELECT EXISTS(SELECT 1 FROM public.admin_users WHERE user_id=auth.uid()) INTO is_allowed;
 IF NOT coalesce(is_allowed,false) THEN
   RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE='42501';
 END IF;
 DELETE FROM public.rsvps WHERE id=p_id RETURNING id INTO deleted_id;
 RETURN deleted_id IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_delete_rsvp(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_rsvp(uuid) TO authenticated;

-- Update the existing visible notices, otherwise old information overrides config.js.
UPDATE public.wedding_notices
SET body='2026년 11월 14일(토) 오후 7시~9시, 아미드호텔 서울에서 전통혼례 후 피로연을 한 번 진행합니다. 식사 신청은 총 120명 정원이며, 신청 화면에서 현재 예약 인원과 잔여 인원을 확인할 수 있습니다.',updated_at=now()
WHERE title='피로연 식사 시간 안내';
UPDATE public.wedding_notices
SET body='김천 검역본부와 구미시청 모두 낮 12시 30분 서울행 출발 예정입니다. 정확한 탑승 위치는 확정 후 안내합니다. 귀가 버스 시간은 피로연 종료와 연계하여 추후 확정 안내합니다.',updated_at=now()
WHERE title='셔틀버스 및 이동 안내';
