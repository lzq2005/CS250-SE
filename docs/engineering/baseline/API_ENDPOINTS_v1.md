# HTTP API — v1 (PROPOSED / freeze before Sprint 1)

Prefix: `/api/v1`; JSON UTF-8; success `{"data":...}`; failure `{"error":{"code":"...","message":"...","details":null}}`.

|Method|Path|Owner|Notes|
|---|---|---|---|
|GET|`/health`|A|检查 API 运行状态|
|GET|`/pois?search=&category=`|B|查询景点、分页/数量|
|GET|`/pois/:poiId`|B|详情及未知字段|
|GET|`/origins`|A|澳门预置出发点|
|GET / POST|`/trips`|A|读取清单 / 创建 TripConfig|
|GET / PATCH|`/trips/:tripId`|A|读取 / 更新 TripConfig|
|GET / POST|`/trips/:tripId/companions`|A|管理同行人|
|GET / POST|`/trips/:tripId/targets`|B|列出 / 加入目标 POI；POST body={poiId}|
|DELETE|`/trips/:tripId/targets/:poiId`|B|从当前行程移除目标，不改 Favorite|
|GET / PUT / DELETE|`/favorites/:poiId`|B|当前演示工作区的收藏状态|
|POST|`/trips/:tripId/generate`|C|调用纯函数生成候选 PlanResult；不负责保存|
|POST / GET|`/trips/:tripId/itineraries`|D|保存候选日程 / 列举已保存行程|
|GET|`/itineraries/:itineraryId`|D|获取保存版本和 optimistic version|
|POST|`/itineraries/:itineraryId/edits`|D|编辑/交通变更/删除，调用 C 重算；expectedVersion|
|POST|`/itineraries/:itineraryId/publish`|D|显示确认后的公开白名单快照|
|GET|`/plaza/posts`|B|公开行程信息流（只读）|
|GET|`/plaza/posts/:postId`|B|读取公开快照，独立 POI 收藏|
|GET / POST|`/trips/:tripId/expenses`|A|费用记录|
|GET|`/trips/:tripId/settlement`|A|整数分币结算结果|


Cross-module rules:
1. Member C is a calculation service, NOT the itinerary persistence owner.
2. Member D owns persisted itineraries and edits, and calls C revalidation for every edited schedule.
3. Member B owns POI discovery and favorites plus selection writes; the separate Favorite and Add collections never sync implicitly.
4. Member D publishes public snapshots, Member B renders them. The publish payload must explicitly exclude companions, private budgets, bill lines and private notes.
5. Member A is the unique migration/schema and API registration owner; all route modules export routers, not mutate app.ts directly.
6. Edits require expectedVersion (optimistic concurrency) and destructive changes are confirmed before mutation.
7. Unrecognized provider data results in null/unknown, never a fabricated zero or success.
8. Do not assume auth exists. MVP is a single-user/local demo until authentication/privacy are separately approved.
