import { defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import appInfoTool from "./tools/app-info";

export default defineMcp({
  name: "sinpung-ward-mcp",
  title: "신풍 와드 교회 관리 MCP",
  version: "0.1.0",
  instructions:
    "신풍 와드 교회 관리 앱의 공개 MCP 서버입니다. `echo`로 연결을 확인하고, `app_info`로 앱 정보를 조회하세요. 이 서버는 인증 없이 공개적으로 접근 가능하며, 회원/출석 등 개인 데이터는 노출하지 않습니다.",
  tools: [echoTool, appInfoTool],
});
