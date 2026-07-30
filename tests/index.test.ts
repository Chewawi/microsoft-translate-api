import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import {
  MicrosoftTranslator,
  UnsupportedLanguageError,
  ValidationError,
  getLangCode,
  isSupported,
  translate,
} from "../src/index";

const originalFetch = globalThis.fetch;

function fakeJwt(expiresInSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString(
    "base64url",
  );
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expiresInSeconds }),
  ).toString("base64url");
  return `${header}.${payload}.signature`;
}

function mockFetchSequence(
  handlers: Array<(url: string, init?: RequestInit) => Response>,
) {
  let call = 0;
  globalThis.fetch = mock((url: string, init?: RequestInit) => {
    const handler = handlers.at(Math.min(call, handlers.length - 1));
    call++;
    if (!handler) {
      throw new Error("mockFetchSequence requires at least one handler");
    }
    return Promise.resolve(handler(url, init));
  }) as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("lang", () => {
  test("resolves canonical codes case-insensitively", () => {
    expect(getLangCode("EN")).toBe("en");
    expect(getLangCode("english")).toBe("en");
    expect(getLangCode("Chinese (Literary)")).toBe("lzh");
    expect(getLangCode("fr-CA")).toBe("fr-CA");
  });

  test("returns undefined for unknown languages", () => {
    expect(getLangCode("not-a-real-language")).toBeUndefined();
    expect(getLangCode(null)).toBeUndefined();
    expect(getLangCode(undefined)).toBeUndefined();
  });

  test("isSupported mirrors getLangCode", () => {
    expect(isSupported("es")).toBe(true);
    expect(isSupported("klingon")).toBe(false);
  });
});

describe("translate", () => {
  test("returns undefined for empty input without making network calls", async () => {
    const fetchSpy = mock(() => {
      throw new Error("should not be called");
    });
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    expect(await translate("", "en", "fr")).toBeUndefined();
    expect(await translate([], "en", "fr")).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("throws UnsupportedLanguageError for an invalid source language instead of silently falling back to auto-detect", async () => {
    const client = new MicrosoftTranslator();
    await expect(
      client.translate("hi", "not-a-real-language", "en"),
    ).rejects.toThrow(UnsupportedLanguageError);
  });

  test("throws UnsupportedLanguageError for an invalid target language instead of silently translating to English", async () => {
    const client = new MicrosoftTranslator();
    await expect(
      client.translate("hi", null, "not-a-real-language"),
    ).rejects.toThrow(UnsupportedLanguageError);
  });

  test("throws ValidationError when the array limit is exceeded", async () => {
    const client = new MicrosoftTranslator();
    await expect(
      client.translate(Array(1001).fill("hi"), null, "en"),
    ).rejects.toThrow(ValidationError);
  });

  test("fetches a token once, reuses it, and sends the expected request", async () => {
    const token = fakeJwt(3600);
    let authCalls = 0;

    mockFetchSequence([
      (url) => {
        expect(url).toBe("https://edge.microsoft.com/translate/auth");
        authCalls++;
        return new Response(token, { status: 200 });
      },
      (url, init) => {
        expect(url).toContain(
          "https://api.cognitive.microsofttranslator.com/translate",
        );
        expect(url).toContain("to=fr");
        expect(url).toContain("from=en");
        expect((init?.headers as Headers).get("Authorization")).toBe(
          `Bearer ${token}`,
        );
        expect(init?.body).toBe(JSON.stringify([{ Text: "hello" }]));
        return Response.json([
          { translations: [{ text: "bonjour", to: "fr" }] },
        ]);
      },
    ]);

    const client = new MicrosoftTranslator();
    const result = await client.translate("hello", "en", "fr");

    expect(result?.[0]?.translations[0]?.text).toBe("bonjour");
    expect(authCalls).toBe(1);

    // second call should reuse the cached token: only the translate endpoint is hit.
    mockFetchSequence([
      () => Response.json([{ translations: [{ text: "bonjour", to: "fr" }] }]),
    ]);
    await client.translate("hello", "en", "fr");
    expect(authCalls).toBe(1);
  });

  test("recovers from a failed auth fetch instead of permanently breaking the client", async () => {
    let attempt = 0;
    globalThis.fetch = mock(() => {
      attempt++;
      if (attempt === 1) {
        return Promise.resolve(new Response("server error", { status: 500 }));
      }
      if (attempt === 2) {
        return Promise.resolve(new Response(fakeJwt(3600), { status: 200 }));
      }
      return Promise.resolve(
        Response.json([{ translations: [{ text: "bonjour", to: "fr" }] }]),
      );
    }) as unknown as typeof fetch;

    const client = new MicrosoftTranslator();
    await expect(client.translate("hello", "en", "fr")).rejects.toThrow();

    // a second attempt must retry authentication rather than replaying the same rejection forever.
    const result = await client.translate("hello", "en", "fr");
    expect(result?.[0]?.translations[0]?.text).toBe("bonjour");
    expect(attempt).toBe(3);
  });

  test("uses caller-supplied authenticationHeaders without fetching a free token", async () => {
    const fetchSpy = mock((url: string, init?: RequestInit) => {
      expect(url).toContain("cognitive.microsofttranslator.com");
      expect((init?.headers as Headers).get("Ocp-Apim-Subscription-Key")).toBe(
        "secret",
      );
      return Promise.resolve(
        Response.json([{ translations: [{ text: "bonjour", to: "fr" }] }]),
      );
    });
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const client = new MicrosoftTranslator();
    await client.translate("hello", null, "fr", {
      authenticationHeaders: { "Ocp-Apim-Subscription-Key": "secret" },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
