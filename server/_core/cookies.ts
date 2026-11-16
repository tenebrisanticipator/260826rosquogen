export type SessionCookieOptions = {
  httpOnly: boolean;
  path: string;
  sameSite: "none" | "lax" | "strict";
  secure: boolean;
  domain?: string;
  maxAge?: number;
};

export interface CookieRequest {
  protocol?: string;
  headers?: Record<string, string | string[] | undefined> | any;
  [key: string]: any;
}

function isSecureRequest(req: CookieRequest): boolean {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers?.["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList: string[] = Array.isArray(forwardedProto)
    ? forwardedProto
    : String(forwardedProto).split(",");

  return protoList.some((proto: string) => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: CookieRequest
): SessionCookieOptions {
  const isSecure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    sameSite: isSecure ? "none" : "lax",
    secure: isSecure,
  };
}
