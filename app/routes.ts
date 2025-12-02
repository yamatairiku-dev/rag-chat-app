import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("auth/login", "routes/auth.login.tsx"),
  route("auth", "routes/auth.tsx"),
  route("auth/logout", "routes/auth.logout.tsx"),
  route("chat", "routes/chat.tsx"),
  route("conversations", "routes/conversations.tsx"),
  route("settings", "routes/settings.tsx"),
  route("api/chat-stream", "routes/api.chat-stream.ts"),
  route("api/test-auth", "routes/api.test-auth.ts"),
] satisfies RouteConfig;
