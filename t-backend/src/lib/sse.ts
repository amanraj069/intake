import { Request, Response } from 'express';

export interface EventStream {
  /** Writes one named event with a JSON payload. Does nothing once the client has gone. */
  send(event: string, data: unknown): void;
  end(): void;
}

/** Whether the client asked for a Server-Sent Events response instead of a single JSON body. */
export function wantsEventStream(req: Request): boolean {
  return req.headers.accept?.includes('text/event-stream') === true || req.query.stream === 'true';
}

/** Sends the SSE headers straight away, so the client starts reading before the first event is ready. */
export function openEventStream(res: Response): EventStream {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  // Watched on the response: since Node 16 the request's own 'close' fires once
  // its body has been read, not when the client disconnects.
  let open = true;
  res.on('close', () => {
    open = false;
  });

  return {
    send(event, data) {
      if (open) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    end() {
      if (open) res.end();
    },
  };
}
