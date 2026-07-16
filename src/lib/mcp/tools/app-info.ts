import { defineTool } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "app_info",
  title: "App info",
  description: "Return basic information about this church management app.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify({
          name: "신풍 와드 교회 관리 (Sinpung Ward Church Manager)",
          description:
            "교회 회원 기록, 출석, 성찬식 순서, 조직도, 회의록, 청소조, 성전 추천서를 관리하는 앱입니다.",
          features: [
            "회원 기록 (Members)",
            "출석부 (Attendance)",
            "출석 통계 (Attendance stats)",
            "성찬식 순서 (Sacrament order)",
            "조직도 (Org chart)",
            "회의록 (Meeting minutes)",
            "청소조 (Cleaning teams)",
            "성전 추천서 (Temple recommends)",
          ],
        }),
      },
    ],
  }),
});
