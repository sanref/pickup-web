import { auth } from "@/server/auth/neon";

export const { GET, POST, PUT, DELETE, PATCH } = auth.handler();
