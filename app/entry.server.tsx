import { createReadableStreamFromReadable } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import { renderToPipeableStream } from "react-dom/server";
import type { EntryContext } from "@remix-run/node";
import { PassThrough } from "node:stream";

import { addDocumentResponseHeaders } from "~/shopify.server";

const ABORT_DELAY = 5_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  return new Promise<Response>((resolve, reject) => {
    let shellRendered = false;

    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        onShellReady() {
          shellRendered = true;
          responseHeaders.set("Content-Type", "text/html");
          addDocumentResponseHeaders(request, responseHeaders);

          const stream = new PassThrough();
          pipe(stream);
          const body = createReadableStreamFromReadable(stream);
          resolve(new Response(body, { headers: responseHeaders, status: responseStatusCode }));
        },
        onShellError(err) {
          reject(err);
        },
        onError(err) {
          if (shellRendered) {
            // eslint-disable-next-line no-console
            console.error(err);
          }
        },
      },
    );

    setTimeout(abort, ABORT_DELAY);
  });
}
