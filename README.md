# Church Connect

교회에서 사용할 회원 기록 양식 + 출석부 앱을 만들고 싶어. 개요는 아래와 같아. 

1. 회원 기록 양식 (인사기록 양식과 비슷) 과 해당 회원들의 일요 예배 출석을 관리하는 앱
2. web 화면 기준 왼쪽에는 "회원기록양식" 과 "출석부" 와 "조직도" 표시
3. "회원기록양식" 을 클릭하면 ㄱ,ㄴ,ㄷ.. 순서대로의 회원들이 중앙에 나타남 (영문 영어가 가장 상단)
4. "회원기록양식"  중앙 화면의 우측 상단에 회원 추가 기능
5. 회원 추가 기능 옆에 excel import 기능 추가
5-1. excel import의 엑셀 양식은 아래와 같음
(행 : 이름 / 성별 / 나이 / 생년월일 / 전화번호 / 이메일 / 비고) 
6. 각 회원들에 대한 인사기록 카드 양식은 첨부된 그림과 같이 해줘 (기본정보 / 구체적정보) 
7. "출석부" 를 클릭하면 "회원기록양식" 의 이름들이 뜨고, 이름 오른쪽에는 앱을 실행하고 있는 주의 일요일부터 1달 후까지의 일요일 날짜를 보여줘. 
8. 그리고 그 날짜에 체크박스가 있어서 체크하면 출석, 체크가 안되어 있으면 불출석 으로 해줘. 
9. 해당 날짜를 행 방향으로 스위핑 (모바일은 터치, web 은 마우스 왼쪽 클릭 후 드래그) 을 하면 각 주의 일요일 날짜면 보이게 해줘
10. "조직도"를 클릭하면 인사 조직도가 나오는데, 3번째 첨부된 양식처럼 만들어줘 
11. "조직도"의 각 조직에 들어갈 이름들은 "회원기록양식"의 현재 부름에 데이터를 맞춰줘 

=> 위 양식대로 진행을 하는데, 그 전에 위 앱을 만들기 위한 너의 계획을 알려줘

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://sinpungward.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/18b4f7da-7926-43c9-b20f-50238e299d62).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
