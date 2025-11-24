const { Client } = require("@googlemaps/google-maps-services-js");

const client = new Client({});

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
      body: JSON.stringify({ error: "Google Maps API Key not configured" })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { method, params } = body;

    let result;

    switch (method) {
      case "tools/call":
        result = await handleToolCall(params, apiKey);
        break;
      case "tools/list":
        result = { tools: getAvailableTools() };
        break;
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Unknown method" })
        };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

function getAvailableTools() {
  return [
    {
      name: "maps_geocode",
      description: "Convert address to coordinates",
      inputSchema: {
        type: "object",
        properties: {
          address: { type: "string", description: "Address to geocode" }
        },
        required: ["address"]
      }
    },
    {
      name: "maps_reverse_geocode",
      description: "Convert coordinates to address",
      inputSchema: {
        type: "object",
        properties: {
          latitude: { type: "number" },
          longitude: { type: "number" }
        },
        required: ["latitude", "longitude"]
      }
    },
    {
      name: "maps_search_places",
      description: "Search for places using text query",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          location: {
            type: "object",
            properties: {
              latitude: { type: "number" },
              longitude: { type: "number" }
            }
          },
          radius: { type: "number" }
        },
        required: ["query"]
      }
    },
    {
      name: "maps_place_details",
      description: "Get detailed information about a place",
      inputSchema: {
        type: "object",
        properties: {
          place_id: { type: "string" }
        },
        required: ["place_id"]
      }
    },
    {
      name: "maps_distance_matrix",
      description: "Calculate distances and times between points",
      inputSchema: {
        type: "object",
        properties: {
          origins: { type: "array", items: { type: "string" } },
          destinations: { type: "array", items: { type: "string" } },
          mode: { type: "string", enum: ["driving", "walking", "bicycling", "transit"] }
        },
        required: ["origins", "destinations"]
      }
    },
    {
      name: "maps_elevation",
      description: "Get elevation data for locations",
      inputSchema: {
        type: "object",
        properties: {
          locations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                latitude: { type: "number" },
                longitude: { type: "number" }
              }
            }
          }
        },
        required: ["locations"]
      }
    },
    {
      name: "maps_directions",
      description: "Get directions between points",
      inputSchema: {
        type: "object",
        properties: {
          origin: { type: "string" },
          destination: { type: "string" },
          mode: { type: "string", enum: ["driving", "walking", "bicycling", "transit"] }
        },
        required: ["origin", "destination"]
      }
    }
  ];
}

async function handleToolCall(params, apiKey) {
  const { name, arguments: args } = params;

  switch (name) {
    case "maps_geocode":
      const geocodeResult = await client.geocode({
        params: { address: args.address, key: apiKey }
      });
      return {
        content: [{
          type: "text",
          text: JSON.stringify(geocodeResult.data.results[0], null, 2)
        }]
      };

    case "maps_reverse_geocode":
      const reverseResult = await client.reverseGeocode({
        params: {
          latlng: `${args.latitude},${args.longitude}`,
          key: apiKey
        }
      });
      return {
        content: [{
          type: "text",
          text: JSON.stringify(reverseResult.data.results[0], null, 2)
        }]
      };

    case "maps_search_places":
      const searchParams = {
        query: args.query,
        key: apiKey
      };
      if (args.location) {
        searchParams.location = `${args.location.latitude},${args.location.longitude}`;
      }
      if (args.radius) {
        searchParams.radius = args.radius;
      }
      const searchResult = await client.textSearch({ params: searchParams });
      return {
        content: [{
          type: "text",
          text: JSON.stringify(searchResult.data.results, null, 2)
        }]
      };

    case "maps_place_details":
      const detailsResult = await client.placeDetails({
        params: { place_id: args.place_id, key: apiKey }
      });
      return {
        content: [{
          type: "text",
          text: JSON.stringify(detailsResult.data.result, null, 2)
        }]
      };

    case "maps_distance_matrix":
      const matrixResult = await client.distancematrix({
        params: {
          origins: args.origins,
          destinations: args.destinations,
          mode: args.mode || "driving",
          key: apiKey
        }
      });
      return {
        content: [{
          type: "text",
          text: JSON.stringify(matrixResult.data, null, 2)
        }]
      };

    case "maps_elevation":
      const locations = args.locations.map(loc => `${loc.latitude},${loc.longitude}`).join("|");
      const elevationResult = await client.elevation({
        params: { locations, key: apiKey }
      });
      return {
        content: [{
          type: "text",
          text: JSON.stringify(elevationResult.data.results, null, 2)
        }]
      };

    case "maps_directions":
      const directionsResult = await client.directions({
        params: {
          origin: args.origin,
          destination: args.destination,
          mode: args.mode || "driving",
          key: apiKey
        }
      });
      return {
        content: [{
          type: "text",
          text: JSON.stringify(directionsResult.data.routes[0], null, 2)
        }]
      };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}