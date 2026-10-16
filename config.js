export const CONFIG = {
  names: '다래 · 민우',
  date: '2026년 11월 14일 토요일',
  ceremony: {name:'운현궁',time:'오후 6시',address:'서울 종로구 삼일대로 464'},
  reception: {name:'아미드호텔 서울',time:'오후 7시 ~ 9시',address:'서울 종로구 인사동5길 38'},
  rsvpDeadline: '2026-11-06', // Korea time, 23:59:59 inclusive
  shuttleDetails: '구미 및 김천 출발 셔틀의 탑승 장소와 시간은 확정 후 안내해 드립니다.',
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
