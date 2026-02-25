# 게임 로직 구현 난이도 검토

## 검토 범위
- 대상: games 폴더의 20개 게임 기획안
- 산출물: 각 게임 더미 이미지 1장(`games/dummy-images/*.svg`)
- 기준: React 웹 2D 기준으로 핵심 로직 난점(물리/동기화/성능/판정 정합)

## 종합 결론
- 즉시 구현 가능(낮음/중간): 15개
- 구현 난도가 높아 선행 프로토타입이 필요한 게임: 5개

## 구현 난이도 분류
- 낮음: asteroid-lane-break, ember-block-fall, lava-hop-legend, neon-drift-dash, pinpoint-sniper-pop
- 중간: blade-rail-strike, clockwork-surge, drone-sweep-zero, frost-bite-rush, laser-miner-blast, metro-zombie-sprint, orbit-smash, pixel-pang-quest, tower-bounce-breaker, vault-jump-fever
- 높음: gravity-hook-runner, mecha-dash-raid, ninja-rope-chaos, rhythm-blade-slice, shadow-dodge-arena

## 구현하기 어려운 게임(우선 보완 권장)
1. Gravity Hook Runner
- 이유: 훅 로프 물리와 중력 반전이 동시에 작동해 충돌/관성 버그 가능성이 큼.
- 보완: 로프를 완전 물리 대신 "고정 길이 제약 + 속도 클램프"로 단순화.

2. Mecha Dash Raid
- 이유: 탄막 밀도 증가 시 프레임 드랍과 판정 누락 위험이 큼.
- 보완: 투사체 오브젝트 풀링, broad-phase 충돌, 업데이트 tick 분리.

3. Ninja Rope Chaos
- 이유: 스윙 로프의 장력/해제 타이밍이 불안정하면 조작감이 즉시 무너짐.
- 보완: rope joint를 근사 모델로 구현하고 앵커 전환 쿨다운 적용.

4. Rhythm Blade Slice
- 이유: 브라우저/기기별 오디오 지연 차이로 판정 공정성 이슈가 큼.
- 보완: Web Audio 기준 타임라인 고정, 오프셋 캘리브레이션 제공.

5. Shadow Dodge Arena
- 이유: 과거 이동 로그 재생 개체가 많아지면 충돌 정합과 성능이 급격히 어려워짐.
- 보완: 로그 샘플링 간격 고정, 그림자 개체 상한, 단순 히트박스 사용.

## 리더보드 운영 관점 확인
- 20개 모두 단일 점수 산식이 명시되어 리더보드 등록 자체는 가능.
- 높음 난이도 5개는 "점수 검증 이벤트"를 먼저 확정해야 운영 안정성이 확보됨.

## 더미 이미지 위치
- `C:\Users\hsoh\WorkspaceRoblox\roblox-arcade\games\dummy-images`
- 총 20개 SVG 생성 완료
