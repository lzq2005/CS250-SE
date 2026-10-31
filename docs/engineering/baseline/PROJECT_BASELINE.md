# TripMate Macau — PROJECT BASELINE v1
Project: CS250 Software Engineering; Team D2-Team2 / Vibecoding.
Members: A Li Zhiqing (leader), B Xia Youran, C Jiang Yuancheng, D Peng Xin.
This is an implementation reboot only. Task 1 Proposal and Task 2 URS are inherited; do not rewrite them or claim customer sign-off.
Latest consulted Task 2: TripMate_Task2_URS_Template_Rebuilt_v2 (2026-10-18), 17 requirements with H/M/L.

User workflow: Trip setup → select POIs → generate plan → edit/recalculate/map → save/reopen → optional publish. Optional bill workflow is separate.
Navigation: Home, Discover, Map, Mine; home shortcuts Trip Planning, Favorites, My Macau Trips, Plaza.
Core rules: favorite vs add separate; selected targets never silently discarded; timestamp/time window constraints; editable 15-minute times; preserve source/unknown on POIs; no fake live prices, public transport or weather-based replanning; save/reopen; read-only Plaza published preview must exclude private fields.
Priority: H requirements before M then L. Bills M optional; Plaza M; nearby food M; relaxed pace L optional; approx 30 Macau POIs fixture.
Out of scope: flight/hotel booking, payment execution, full social graph, route-global optimality, real-time bus/traffic, weather-aware replanning, importing social-media posts, whole-itinerary copy from Plaza.
Engineering decisions in SHARED_CONTRACT_v1.md are proposals needing four-person approval, not customer requirements.
