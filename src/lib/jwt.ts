import { AuthenticationError } from "../errors";

interface JwtPayload {
  exp?: number;
  [key: string]: unknown;
}

/**
 * Decodes the payload of a JWT without verifying its signature (we only need the `exp` claim,
 * and the token itself is opaque to us — Microsoft's servers are the ones validating it).
 *
 * JWTs use base64url encoding, not plain base64: naively feeding the raw segment to a base64
 * decoder silently corrupts payloads that happen to contain `-` or `_`.
 */
export function decodeJwtPayload(token: string): JwtPayload {
  const segment = token.split(".")[1];

  if (!segment) {
    throw new AuthenticationError("Received a malformed auth token");
  }

  try {
    const json =
      typeof Buffer !== "undefined"
        ? Buffer.from(segment, "base64url").toString("utf-8")
        : decodeURIComponent(
            atob(segment.replace(/-/g, "+").replace(/_/g, "/"))
              .split("")
              .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
              .join(""),
          );

    return JSON.parse(json);
  } catch (e) {
    throw new AuthenticationError("Failed to parse auth token payload", {
      cause: e,
    });
  }
}
