import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import handler from "../api/index";

const server = createServer(handler);

afterEach(async () => {
  if (server.listening) {
    await new Promise<void>((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }
});

describe("Vercel API routing", () => {
  it("restores rewritten tRPC paths before Express dispatch", async () => {
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Test server did not bind to a port");
    }

    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/index?__path=%2Fapi%2Ftrpc%2Fauth.me&batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D`
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toMatchObject([
      { result: { data: { json: null } } },
    ]);
  });
});
