const { createGoogleMapsServer } = require("@modelcontextprotocol/server-google-maps");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const { toFetchResponse, toReqRes } = require("fetch-to-node");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: "Google Maps API Key not configured"
    };
  }

  try {
    const mcpServer = createGoogleMapsServer({ apiKey });
    const transport = new StreamableHTTPServerTransport();

    await mcpServer.connect(transport);
    
    const body = JSON.parse(event.body);
    
    // Create a mock request object
    const mockReq = {
      method: 'POST',
      headers: event.headers,
      body: event.body
    };
    
    const { req: nodeReq, res: nodeRes } = toReqRes(mockReq);
    await transport.handleRequest(nodeReq, nodeRes, body);

    return new Promise((resolve) => {
      nodeRes.on("close", () => {
        transport.close();
        mcpServer.close();
        const response = toFetchResponse(nodeRes);
        resolve({
          statusCode: response.status,
          body: response.body,
          headers: Object.fromEntries(response.headers.entries())
        });
      });
    });
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};