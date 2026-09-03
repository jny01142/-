# 경희대 온라인 강좌 출석 알림 — 배포 가이드 (진짜 푸시 알림 포함)

이번 버전부터는 앱이 완전히 꺼져 있어도 마감 24시간 전 알림이 오도록
서버(Netlify Functions + 예약 함수)가 추가되었습니다. 이 서버 기능은
**드래그 앤 드롭(Netlify Drop)으로는 배포할 수 없고**, GitHub 저장소를
Netlify에 연결하는 방식이 필요합니다. 아래 순서대로 진행하면 됩니다.
(코드 작성이나 명령어 입력 없이 웹사이트 클릭만으로 가능합니다.)

---

## 1단계. GitHub에 코드 올리기

1. github.com 에서 새 저장소 생성 (예: `khu-attendance`), Public/Private 상관없음
2. 저장소 페이지의 "Add file → Upload files" 클릭
3. 이 프로젝트의 **모든 폴더/파일을 그대로** 업로드 (구조를 유지해야 합니다)
   ```
   khu-attendance/
   ├── netlify.toml
   ├── package.json
   ├── pwa/
   │   ├── index.html
   │   ├── manifest.json
   │   ├── service-worker.js
   │   └── icons/...
   └── netlify/
       └── functions/
           ├── save-subscription.js
           ├── sync-lectures.js
           └── send-reminders.js
   ```
4. "Commit changes" 클릭

---

## 2단계. Netlify와 GitHub 저장소 연결

1. app.netlify.com → **"Add new site" → "Import an existing project"**
2. GitHub 선택 → 방금 만든 저장소 선택
3. Build settings는 `netlify.toml`을 자동으로 읽으므로 그대로 두고 **Deploy** 클릭
4. 몇 분 안에 `https://내사이트이름.netlify.app` 주소로 배포되고,
   이제 `netlify/functions` 안의 3개 함수도 함께 배포됩니다
5. (이전에 Netlify Drop으로 만든 사이트가 있다면 그건 그대로 두고 새로 생긴
   이 사이트 주소를 앞으로 사용하시면 됩니다. 안드로이드 apk는 사이트만
   갱신되면 자동으로 최신 내용을 보여주므로, PWABuilder에서 apk를 다시
   만들 때 이 새 주소로 만들어 주세요.)

---

## 3단계. 푸시 서버용 환경 변수(VAPID 키) 등록

이미 키를 생성해 코드에 넣어뒀습니다. **공개 키(Public key)는 이미
`pwa/index.html`에 박혀 있어 그대로 쓰면 되고, 비밀 키(Private key)만
Netlify에 등록**하면 됩니다. (비밀 키를 코드/저장소에 넣지 않는 것이
보안상 중요합니다.)

1. Netlify 사이트 → **Site configuration → Environment variables**
2. 아래 3개를 추가:

   | Key | Value |
   |---|---|
   | `VAPID_PUBLIC_KEY` | `BAeMuroan-_COYZiwGYOO1NGB4y593LUW4HPPWs9KiKKcsUUve7nzc8mFfa6JCFb_WMqrJxn4EpefGGmLXJ3jA4` |
   | `VAPID_PRIVATE_KEY` | `zZRfeh5GVkyOFWUcYa1uIfGJbgs8OSzq6NEird75Dg0` |
   | `VAPID_SUBJECT` | `mailto:본인이메일주소@example.com` |

3. 저장 후 **Deploys → Trigger deploy → Deploy site**로 한 번 재배포
   (환경 변수는 재배포 후에 함수에 반영됩니다)

> ⚠️ 이 키는 데모용으로 지금 생성해 임시로 알려드린 것입니다. 실제로
> 계속 쓰실 앱이라면 나중에라도 본인만의 키로 새로 생성해 교체하는 걸
> 권장합니다. (아무 Node.js 환경에서 `npx web-push generate-vapid-keys`
> 실행하면 새로 발급됩니다.)

---

## 4단계. Netlify Blobs 활성화 확인

최신 Netlify 사이트는 보통 자동으로 Blobs(간단한 키-값 저장소)가
활성화되어 있습니다. 위 3개 함수(`save-subscription`, `sync-lectures`,
`send-reminders`)가 실행 중 오류가 나면 Netlify 대시보드 → **Site
configuration → Environment variables** 근처의 **Blobs** 메뉴에서
활성화 여부를 확인해주세요. 대부분 별도 설정 없이 바로 동작합니다.

---

## 5단계. 앱에서 알림 켜고 확인하기

1. 새 주소로 배포된 앱을 안드로이드 Chrome에서 열고, **설정 → "출석
   인정 마감 24시간 전 알림"을 켭니다** (처음 켤 때 알림 권한 팝업이 뜹니다 → 허용)
2. 이 순간 앱은 서버에 "이 기기에 이런 알림을 보내달라"고 등록합니다
3. 서버의 예약 함수(`send-reminders`)가 **15분마다** 자동으로 돌면서,
   마감 24시간 전 구간에 들어온 강좌가 있으면 실제 푸시를 보냅니다
4. 이제 앱을 완전히 종료하고 최근 실행 목록에서 지워도, 마감 24시간
   전이 되면 15분 이내에 알림이 도착합니다

테스트를 바로 해보고 싶다면, "강좌 추가"로 마감시간을 지금부터
24시간 5분 뒤 정도로 설정한 뒤 앱을 완전히 종료해 보세요. 최대 15분
안에 알림이 옵니다.

---

## 알아두면 좋은 점

- **정확도**: 서버는 15분 간격으로만 확인하므로, "정확히 24시간 0분 전"이
  아니라 최대 15분 정도의 오차가 있을 수 있습니다.
- **중복 알림 가능성**: 앱이 열려 있는 상태에서 마감 24시간 시점을 지나면
  로컬(기기 내) 체크와 서버 체크가 거의 동시에 각각 알림을 띄울 수 있어,
  드물게 같은 알림이 두 번 뜰 수 있습니다. 기능상 문제는 없지만 참고해주세요.
- **개인정보**: 서버에는 강좌 제목·주차·마감시간·완료 여부만 저장되며,
  LearningX 비밀번호나 학번 등 개인 식별 정보는 전혀 전송/저장되지
  않습니다. 기기별 익명 ID(deviceId)만 사용합니다.
- **비용**: Netlify Functions와 Blobs 모두 무료 플랜 범위 안에서 이 정도
  사용량은 충분히 무료입니다.
