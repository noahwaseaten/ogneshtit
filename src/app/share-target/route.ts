// Fallback when the service worker is not running yet: open the report form without the files.
const go = (req: Request) => Response.redirect(new URL("/pomogni/signal", req.url), 303);
export const GET = go;
export const POST = go;
