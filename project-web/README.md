# project-web

`games` 폴더의 기획 문서를 기반으로 게임 목록을 생성하고, 웹에서 바로 플레이 페이지로 이동할 수 있는 런처입니다.

## 실행

정적 서버로 `project-web`를 실행합니다.

```powershell
cd C:\Users\hsoh\WorkspaceRoblox\roblox-arcade\project-web
python -m http.server 8080
```

브라우저에서 `http://localhost:8080/index.html` 접속.

## 매니페스트 갱신

`games/*.md` 변경 후 아래 스크립트를 실행하세요.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\generate-manifest.ps1
```

이 스크립트가 수행하는 작업:
- `games/dummy-images/*.svg` -> `project-web/assets/images` 복사
- `project-web/data/games.manifest.json` 재생성

## 파일 구조

- `index.html`: 게임 목록/검색
- `play.html`: 게임 실행 페이지 (`?game=slug`)
- `assets/index.js`: 목록 렌더링
- `assets/play.js`: 공통 3레인 회피 프로토타입
- `scripts/generate-manifest.ps1`: 매니페스트 생성기
