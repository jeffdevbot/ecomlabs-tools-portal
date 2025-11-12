declare module "next/headers" {
  export interface ReadonlyRequestCookie {
    name: string;
    value: string;
  }

  export interface MutableRequestCookies {
    get(name: string): ReadonlyRequestCookie | undefined;
    getAll(): ReadonlyRequestCookie[];
    set(
      name: string,
      value: string,
      options?: {
        expires?: Date | string;
        maxAge?: number;
        path?: string;
        domain?: string;
        secure?: boolean;
        httpOnly?: boolean;
        sameSite?: "strict" | "lax" | "none";
      }
    ): void;
    delete(name: string, options?: { path?: string; domain?: string }): void;
  }

  export function cookies(): MutableRequestCookies;
}
