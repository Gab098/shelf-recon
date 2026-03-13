import { createReadableStreamFromReadable } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import { renderToPipeableStream } from "react-dom/server";
import type { EntryContext } from "@remix-run/node";
import { PassThrough } from "node:stream";

const ABORT_DELAY = 5_000;

function hasShopifyServerEnv() {
  // If these are missing in Vercel env vars, importing ~/shopify.server will crash the whole app.
  // We skip Shopify headers in that case and instead render a visible warning banner on `/`.
  return Boolean(process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET && process.env.SHOPIFY_APP_URL);
}

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  let addDocumentResponseHeaders:
    | ((request: Request, responseHeaders: Headers) => void)
    | undefined = undefined;

  if (hasShopifyServerEnv()) {
    try {
      // Lazy-import so missing env vars don't take down the entire deployment.
      const mod = await import("~/shopify.server");
      addDocumentResponseHeaders = mod.addDocumentResponseHeaders;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[Shelf Recon] Failed to import shopify.server for document headers:", err);
    }
  }

  return new Promise<Response>((resolve, reject) => {
    let shellRendered = false;

    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        onShellReady() {
          shellRendered = true;
          responseHeaders.set("Content-Type", "text/html");
          addDocumentResponseHeaders?.(request, responseHeaders);

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
