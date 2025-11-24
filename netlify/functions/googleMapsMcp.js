import { createGoogleMapsServer } from "@modelcontextprotocol/server-google-maps";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { toFetchResponse, toReqRes } from "fetch-to-node";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return new Response("Google Maps API Key not configured", { status: 500 });
  }

  const mcpServer = createGoogleMapsServer({ apiKey });

  const { req: nodeReq, res: nodeRes } = toReqRes(req);
  const transport = new StreamableHTTPServerTransport();

  await mcpServer.connect(transport);
  const body = await req.json();
  await transport.handleRequest(nodeReq, nodeRes, body);

  nodeRes.on("close", () => {
    transport.close();
    mcpServer.close();
  });

  return toFetchResponse(nodeRes);
};

export const config = {
  path: "/mcp"
};