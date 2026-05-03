import { createRemoteJWKSet, jwtVerify } from "jose";

let jwks;

function getBearerToken(req) {
  const header = req.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  return /^bearer$/i.test(scheme) && token ? token : "";
}

export function requireSupabaseAuth({ supabaseUrl, audience = "authenticated" }) {
  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is required for API authentication.");
  }

  const issuer = `${supabaseUrl.replace(/\/$/, "")}/auth/v1`;
  jwks ||= createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

  return async function supabaseAuth(req, res, next) {
    try {
      const token = getBearerToken(req);
      if (!token) {
        return res.status(401).json({ error: "Missing bearer token." });
      }

      const { payload } = await jwtVerify(token, jwks, {
        issuer,
        audience,
      });

      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      return next();
    } catch (error) {
      req.log?.warn({ err: error }, "Supabase JWT verification failed");
      return res.status(401).json({ error: "Invalid or expired token." });
    }
  };
}
