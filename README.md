# 기출 퀴즈 사이트

정적 사이트(HTML/CSS/JS)라 서버 없이 GitHub Pages에서 바로 동작합니다.

## GitHub Pages 배포
1. GitHub에서 새 저장소 생성 → 이 폴더의 **모든 파일**(.nojekyll 포함)을 저장소 루트에 업로드
2. Settings → Pages → Branch: `main` / `/ (root)` → Save
3. 잠시 후 `https://<아이디>.github.io/<저장소명>/` 접속

로컬 확인: `index.html`을 브라우저로 열면 됩니다.

## 단축키
| 키 | 동작 |
|---|---|
| 1–5 | 선택 (정답이 여러 개인 문제는 여러 개 선택) |
| Enter | 선택한 답 확인 → 답이 나온 뒤 Enter는 다음 문제 |
| 0 | 모름 (즉시 정답 표시) |
| → / ↓ | 다음 문제 |
| ← / ↑ | 이전 문제 |
| 9 / 8 | 북마크 추가 / 해제 |

오답·모름은 자동 북마크됩니다. 북마크는 브라우저 localStorage에 저장되며, 북마크 화면에서 txt로 내보내기/불러오기가 가능합니다(문제 고유번호 목록).

## 문제 추가·수정
1. `tools/dsl/*.txt` 편집 (한 줄 = 한 문제, 필드 구분 `¦`, 보기 구분 ` ;; `)
2. `python3 tools/build.py` → `data/questions.js` 재생성(검증 포함)

## 그림 넣기
- 원본 정리본에 그림이 들어 있던 문제(기초병리학·해부학·세포구조와기능2)는 `assets/img/{문제ID}__1.jpg`, `__2.jpg`… 로 이미 들어 있고, `build.py`가 자동으로 연결합니다. 새 그림을 같은 규칙으로 넣고 `python3 tools/build.py`를 다시 실행하면 됩니다.
- 그림 자리표시(점선 상자)만 있는 문제(의학영어2 등)는 `assets/img/{문제ID}.png`(jpg/jpeg/webp 가능)로 넣으면 바로 표시됩니다. 예: `assets/img/ME2-G-7-24.png`
