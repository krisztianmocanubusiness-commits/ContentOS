import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      initials: string;
    } & DefaultSession["user"];
  }

  interface User {
    initials: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    initials: string;
  }
}
