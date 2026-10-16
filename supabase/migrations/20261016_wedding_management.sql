-- Admin-only mutations; public sees published notices and approved messages only.
CREATE POLICY "admins can delete rsvps" ON public.rsvps
FOR DELETE TO authenticated USING (
 EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id=(SELECT auth.uid()))
);
CREATE TABLE IF NOT EXISTS public.wedding_notices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
 body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
 published boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wedding_notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read published notices" ON public.wedding_notices FOR SELECT TO anon,authenticated
USING (published OR EXISTS(SELECT 1 FROM public.admin_users a WHERE a.user_id=(SELECT auth.uid())));
CREATE POLICY "admin insert notices" ON public.wedding_notices FOR INSERT TO authenticated
WITH CHECK(EXISTS(SELECT 1 FROM public.admin_users a WHERE a.user_id=(SELECT auth.uid())));
CREATE POLICY "admin update notices" ON public.wedding_notices FOR UPDATE TO authenticated
USING(EXISTS(SELECT 1 FROM public.admin_users a WHERE a.user_id=(SELECT auth.uid())))
WITH CHECK(EXISTS(SELECT 1 FROM public.admin_users a WHERE a.user_id=(SELECT auth.uid())));
CREATE POLICY "admin delete notices" ON public.wedding_notices FOR DELETE TO authenticated
USING(EXISTS(SELECT 1 FROM public.admin_users a WHERE a.user_id=(SELECT auth.uid())));
INSERT INTO public.wedding_notices(title,body,created_at) VALUES
('피로연 식사 시간 안내','아미드호텔 서울에서 1부(15:30~17:30), 2부(18:30~20:30) 식사가 진행됩니다. 개별 방문 하객은 1부, 김천·구미 단체버스 하객은 2부를 권장합니다.','2026-10-16 00:00:00+09'),
('셔틀버스 및 이동 안내','김천 검역본부와 구미시청에서 13:00 출발, 귀가 버스는 20:30 출발입니다. 운현궁↔아미드호텔 순환 셔틀은 약 15분 간격 운행 예정입니다. 자세한 승차 위치는 추후 공지합니다.','2026-10-16 00:01:00+09'),
('운현궁 방문 유의사항','문화유적지 보호를 위해 음식물, 꽃다발·화환 반입이 금지됩니다. 야외 혼례로 좌석이 제한되어 있으니 따뜻하게 입고 오세요. 17:50 사물놀이가 예정되어 있습니다.','2026-10-16 00:02:00+09');
CREATE TABLE IF NOT EXISTS public.wedding_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 parent_id uuid REFERENCES public.wedding_messages(id) ON DELETE CASCADE,
 author text NOT NULL CHECK (char_length(author) BETWEEN 1 AND 30),
 body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
 approved boolean NOT NULL DEFAULT false,
 likes integer NOT NULL DEFAULT 0 CHECK(likes >= 0),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wedding_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved guestbook visible" ON public.wedding_messages FOR SELECT TO anon,authenticated
USING (approved OR EXISTS(SELECT 1 FROM public.admin_users a WHERE a.user_id=(SELECT auth.uid())) );
CREATE POLICY "admin moderate messages" ON public.wedding_messages FOR UPDATE TO authenticated
USING(EXISTS(SELECT 1 FROM public.admin_users a WHERE a.user_id=(SELECT auth.uid())))
WITH CHECK(EXISTS(SELECT 1 FROM public.admin_users a WHERE a.user_id=(SELECT auth.uid())));
CREATE POLICY "admin delete messages" ON public.wedding_messages FOR DELETE TO authenticated
USING(EXISTS(SELECT 1 FROM public.admin_users a WHERE a.user_id=(SELECT auth.uid())));
CREATE TABLE IF NOT EXISTS public.wedding_reactions (
 message_id uuid NOT NULL REFERENCES public.wedding_messages(id) ON DELETE CASCADE,
 actor_hash text NOT NULL,
 PRIMARY KEY(message_id,actor_hash)
);
ALTER TABLE public.wedding_reactions ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.wedding_post_limits (
 actor_hash text PRIMARY KEY,
 window_start timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 0
);
ALTER TABLE public.wedding_post_limits ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.wedding_archive (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
 url text NOT NULL CHECK (char_length(url) BETWEEN 10 AND 2048 AND url ~ '^https://'),
 kind text NOT NULL CHECK(kind IN ('photo','video','album')),
 published boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wedding_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published archive read" ON public.wedding_archive FOR SELECT TO anon,authenticated
USING (published OR EXISTS(SELECT 1 FROM public.admin_users a WHERE a.user_id=(SELECT auth.uid())) );
CREATE POLICY "archive admin insert" ON public.wedding_archive FOR INSERT TO authenticated
WITH CHECK(EXISTS(SELECT 1 FROM public.admin_users a WHERE a.user_id=(SELECT auth.uid())));
CREATE POLICY "archive admin update" ON public.wedding_archive FOR UPDATE TO authenticated
USING(EXISTS(SELECT 1 FROM public.admin_users a WHERE a.user_id=(SELECT auth.uid())))
WITH CHECK(EXISTS(SELECT 1 FROM public.admin_users a WHERE a.user_id=(SELECT auth.uid())));
CREATE POLICY "archive admin delete" ON public.wedding_archive FOR DELETE TO authenticated
USING(EXISTS(SELECT 1 FROM public.admin_users a WHERE a.user_id=(SELECT auth.uid())));

-- Atomic like tally; only service-role may call. Moderated counts are public read-only.
CREATE OR REPLACE FUNCTION public.wedding_increment_like(p_message_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.wedding_messages SET likes=likes+1 WHERE id=p_message_id AND approved=true;
END $$;
REVOKE ALL ON FUNCTION public.wedding_increment_like(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.wedding_increment_like(uuid) TO service_role;
