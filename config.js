export const CONFIG = {
  names: '다래 · 민우',
  date: '2026년 11월 14일 토요일',
  ceremony: {name:'운현궁',time:'오후 6시',address:'서울 종로구 삼일대로 464'},
  reception: {name:'신라스테이 광화문',time:'18:00–21:00',address:'서울 종로구 삼봉로 71'},
  rsvpDeadline: '2026-11-06', // Korea time, 23:59:59 inclusive
  shuttleDetails: '김천 검역본부·구미 구미시청 낮 12시 30분 출발 / 양 지역 귀가 셔틀 출발 시간 추후 확정 (정확한 승차 지점 추후 공지)',
  notices: [
    {date:'2026-10-16',title:'피로연 장소 및 시간 안내',body:'피로연 장소는 신라스테이 광화문(서울 종로구 삼봉로 71)이며, 피로연 시간은 18:00~21:00입니다. 운현궁 혼례도 18:00에 시작하므로 참석 일정에 참고해 주세요. 총 130명 정원이며 참석 응답 시 식사 인원을 신청해 주세요.'},
    {date:'2026-10-16',title:'셔틀버스 및 이동 안내',body:'김천 검역본부와 구미시청에서 낮 12시 30분에 출발할 예정이며, 귀가 버스 출발 시간은 피로연 종료에 맞춰 추후 안내합니다. 운현궁에서 신라스테이 광화문까지의 이동 방법과 셔틀 운행 여부는 추후 안내하겠습니다. 정류장·승차 지점 등은 확정 후 안내하겠습니다.'},
    {date:'2026-10-16',title:'운현궁 방문 시 유의사항',body:'운현궁은 문화유적지이므로 음식물과 꽃·꽃다발·화환 반입이 금지됩니다. 야외 혼례이고 좌석이 제한되어 있으니 따뜻한 외투와 편한 신발을 준비해 주세요. 혼례 10분 전인 오후 5시 50분 사물놀이가 예정되어 있습니다.'}
  ],
  heroVideo: '/hero.mp4', // Upload the provided MP4 to public/hero.mp4 in this PR branch
  invitationVideo: '', // YouTube embed URL, e.g. https://www.youtube-nocookie.com/embed/VIDEO_ID
 photos: [
  '/1.jpg', '/2.jpg', '/3.jpg',
  '/4.jpg', '/5.jpg', '/6.jpg',
  '/7.jpg', '/8.jpg', '/9.jpg',
  '/10.jpg', '/11.jpg', '/12.jpg',
  '/13.jpg', '/14.jpg', '/15.jpg'
],
  // Gallery order is independent of the home hero image.
  galleryPhotos: [
    '/4.jpg', '/5.jpg', '/6.jpg', '/3.jpg',
    '/9.jpg', '/12.jpg', '/14.jpg', '/13.jpg',
    '/7.jpg', '/10.jpg', '/11.jpg', '/15.png'
  ],
  accounts: [
    {
      "label": "신랑",
      "members": [
        {
          "relation": "신랑",
          "bank": "NH농협은행",
          "number": "302-2468-4535-81",
          "holder": "남민우"
        }
      ]
    },
    {
      "label": "신부",
      "members": [
        {
          "relation": "신부",
          "bank": "NH농협",
          "number": "785-01-132-485",
          "holder": "임다래"
        }
      ]
    },
    {
      "label": "신랑측 부모님",
      "members": [
        {
          "relation": "아버지",
          "bank": "IBK기업은행",
          "number": "519-026025-01-029",
          "holder": "남수송"
        },
        {
          "relation": "어머니",
          "bank": "하나은행",
          "number": "173-19-00729-6",
          "holder": "박혜자"
        }
      ]
    },
    {
      "label": "신부측 부모님",
      "members": [
        {
          "relation": "아버지",
          "bank": "NH농협",
          "number": "785-01-165593",
          "holder": "임채현"
        },
        {
          "relation": "어머니",
          "bank": "NH농협",
          "number": "785-01-158331",
          "holder": "김난희"
        }
      ]
    }
  ],
  postWedding: false,
  archiveVideo: ''
};
