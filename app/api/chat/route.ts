// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    let requestData;
    try {
      requestData = await req.json()
    } catch (jsonError) {
      console.error("❌ JSON parsing error:", jsonError);
      return new Response(JSON.stringify({ 
        error: "Invalid JSON in request body",
        code: "INVALID_JSON" 
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    }

    const { messages, userId }: { 
      messages: Array<{ role: string; content: string }>,
      userId?: string 
    } = requestData

    // Get the last user message
    const lastMessage = messages[messages.length - 1]
    const userMessage = lastMessage?.content || ""

    if (!userMessage.trim()) {
      return new Response("No message provided", { status: 400 })
    }

    if (!userId) {
      return new Response("userId is required", { status: 400 })
    }

    // Get the authorization header from the request
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        error: "Access token required",
        code: "NO_TOKEN" 
      }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Proxy the request to the Express server with authentication
    const expressResponse = await fetch('http://localhost:5000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        message: userMessage,
        userId: userId,
        chatId: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      })
    })

    if (!expressResponse.ok) {
      let errorData;
      try {
        errorData = await expressResponse.json()
      } catch (jsonError) {
        console.error("❌ Error parsing Express response:", jsonError);
        errorData = { error: "Server error", status: expressResponse.status }
      }
      return new Response(JSON.stringify(errorData), { 
        status: expressResponse.status,
        headers: { "Content-Type": "application/json" }
      })
    }

    let data;
    try {
      data = await expressResponse.json()
    } catch (jsonError) {
      console.error("❌ Error parsing Express response JSON:", jsonError);
      return new Response(JSON.stringify({ 
        error: "Invalid response from server",
        code: "INVALID_SERVER_RESPONSE" 
      }), { 
        status: 502,
        headers: { "Content-Type": "application/json" }
      })
    }
    
    const { reply } = data

    // Create a simple streaming response that the AI SDK can handle
    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      start(controller) {
        // Send the complete response as a single chunk in the correct format
        // Use JSON.stringify to properly escape the string
        const data = `0:${JSON.stringify(reply)}\n`
        controller.enqueue(encoder.encode(data))
        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error("Chat API error:", error)
    return new Response(JSON.stringify({ 
      error: "Failed to generate response" 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}
