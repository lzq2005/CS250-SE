import type { PlanResult, POI } from '@tripmate/contracts';

const tripId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

export const d01FixturePois: POI[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: '大三巴牌坊',
    category: 'history',
    tags: ['地标', '历史'],
    position: { lat: 22.1975, lng: 113.5408 },
    address: '澳门大三巴斜巷',
    openingHours: [{ weekday: 2, open: '09:00', close: '18:00', lastEntry: '17:30' }],
    suggestedVisitMinutes: 60,
    price: { amountMinor: 0, currency: 'MOP' },
    verification: 'verified',
    sourceUrl: null,
    checkedAt: null,
    bookingNote: null,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: '澳门博物馆',
    category: 'history',
    tags: ['博物馆', '室内'],
    position: { lat: 22.1972, lng: 113.5415 },
    address: '澳门博物馆前地',
    openingHours: null,
    suggestedVisitMinutes: 75,
    price: { amountMinor: 1500, currency: 'MOP' },
    verification: 'estimated',
    sourceUrl: null,
    checkedAt: null,
    bookingNote: null,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: '龙环葡韵',
    category: 'history',
    tags: ['建筑', '文化'],
    position: { lat: 22.1536, lng: 113.5595 },
    address: '澳门氹仔海边马路',
    openingHours: [{ weekday: 3, open: '10:00', close: '19:00', lastEntry: null }],
    suggestedVisitMinutes: 60,
    price: { amountMinor: 500, currency: 'MOP' },
    verification: 'verified',
    sourceUrl: null,
    checkedAt: null,
    bookingNote: null,
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    name: '氹仔旧城区',
    category: 'food',
    tags: ['街区', '美食'],
    position: { lat: 22.1543, lng: 113.5567 },
    address: '澳门氹仔旧城区',
    openingHours: null,
    suggestedVisitMinutes: 90,
    price: null,
    verification: 'unknown',
    sourceUrl: null,
    checkedAt: null,
    bookingNote: null,
  },
];

// This is contract-shaped test data only. It is not produced by Member C's planner.
export const d01FixturePlan: PlanResult = {
  tripId,
  status: 'needs_review',
  days: [
    {
      date: '2026-11-03',
      stops: [
        {
          id: 'b1111111-1111-4111-8111-111111111111',
          poiId: '11111111-1111-4111-8111-111111111111',
          date: '2026-11-03',
          arrive: '10:00',
          start: '10:00',
          end: '11:30',
        },
        {
          id: 'b2222222-2222-4222-8222-222222222222',
          poiId: '22222222-2222-4222-8222-222222222222',
          date: '2026-11-03',
          arrive: null,
          start: null,
          end: null,
        },
      ],
      legs: [
        {
          fromPoiId: null,
          toPoiId: '11111111-1111-4111-8111-111111111111',
          mode: 'walk',
          durationMinutes: 12,
          estimatedCost: null,
          estimateStatus: 'estimated',
        },
        {
          fromPoiId: '11111111-1111-4111-8111-111111111111',
          toPoiId: '22222222-2222-4222-8222-222222222222',
          mode: 'bus',
          durationMinutes: null,
          estimatedCost: null,
          estimateStatus: 'unknown',
        },
      ],
    },
    {
      date: '2026-11-04',
      stops: [
        {
          id: 'b3333333-3333-4333-8333-333333333333',
          poiId: '33333333-3333-4333-8333-333333333333',
          date: '2026-11-04',
          arrive: '14:15',
          start: '14:30',
          end: '15:30',
        },
      ],
      legs: [
        {
          fromPoiId: null,
          toPoiId: '33333333-3333-4333-8333-333333333333',
          mode: 'taxi',
          durationMinutes: 8,
          estimatedCost: { amountMinor: 4600, currency: 'MOP' },
          estimateStatus: 'estimated',
        },
      ],
    },
  ],
  unscheduled: [
    {
      poiId: '44444444-4444-4444-8444-444444444444',
      reason: '每日时间窗口不足',
      code: 'UNSCHEDULED',
    },
    {
      poiId: '99999999-9999-4999-8999-999999999999',
      reason: '地点资料缺失',
      code: 'UNSCHEDULED',
    },
  ],
  warnings: [
    {
      code: 'CLOSED',
      poiId: '44444444-4444-4444-8444-444444444444',
      message: '该地点的营业日无法覆盖当前日程序列。',
      severity: 'error',
    },
    {
      code: 'UNKNOWN_TRAVEL',
      poiId: '22222222-2222-4222-8222-222222222222',
      message: '公交预计时长未知，后续时间暂无法确定。',
      severity: 'warning',
    },
    {
      code: 'UNSCHEDULED',
      poiId: '44444444-4444-4444-8444-444444444444',
      message: '氹仔旧城区未安排，请调整日期或每日时间窗口。',
      severity: 'warning',
    },
  ],
  estimatedTotalCost: null,
};
