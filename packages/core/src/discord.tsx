// Discord component embeds: a link preview built from Discord's message components instead of the
// plain Open Graph card. Discord reads a <script id="discord:component-embed"> from the served HTML
// (it does not run JavaScript), and falls back to the Open Graph tags if the payload is invalid.
// Rules we keep to: one Container at the root, at most 40 components, at most 3000 bytes of JSON,
// absolute https URLs, link buttons only, labels up to 80 characters.

import { BRANDS, type AppId } from "./brand";
import { pick, type Lang } from "./i18n/lang";

type Text = { type: 10; content: string };
type Gallery = { type: 12; items: { media: { url: string }; description?: string }[] };
type Button = { type: 2; style: 5; label: string; url: string };
type Row = { type: 1; components: Button[] };
type Separator = { type: 14; divider?: boolean; spacing?: 1 | 2 };
type Child = Text | Gallery | Row | Separator;

/** Serialises the card and escapes anything that could end the <script> early. */
export function cardJson(accent: string, components: Child[]) {
  const json = JSON.stringify({
    component: { type: 17, accent_color: parseInt(accent.replace("#", ""), 16), components },
  })
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e");
  if (process.env.NODE_ENV !== "production" && new TextEncoder().encode(json).length > 3000) {
    throw new Error(`Discord card is over 3000 bytes (${new TextEncoder().encode(json).length})`);
  }
  return json;
}

/** The card builders for one app: relative URLs become absolute on that app's address. */
export function discordFor(app: AppId) {
  const brand = BRANDS[app];
  const abs = (u: string) => (u.startsWith("http") ? u : brand.url + u);

  const text = (content: string): Text => ({ type: 10, content });
  const image = (url: string, description?: string): Gallery => ({
    type: 12,
    items: [{ media: { url: abs(url) }, ...(description && { description }) }],
  });
  const buttons = (...links: [label: string, url: string][]): Row => ({
    type: 1,
    components: links.map(([label, url]) => ({ type: 2, style: 5, label, url: abs(url) })),
  });
  const divider = (): Separator => ({ type: 14, divider: true, spacing: 1 });

  /** Renders the card into the page. Use only in server components so it is in the served HTML. */
  function DiscordCard({ accent = brand.color, components }: { accent?: string; components: Child[] }) {
    return (
      <script
        id="discord:component-embed"
        type="application/vnd.discord.component-embed+json"
        dangerouslySetInnerHTML={{ __html: cardJson(accent, components) }}
      />
    );
  }

  /** The card for an ordinary page: name, one line on what it does, the site image and two links.
   *  Images point at the language's own path, since Discord's crawler is not in Bulgaria. */
  function PageCard({ lang, title, body, path, home }: { lang: Lang; title: string; body: string; path: string; home: string }) {
    return (
      <DiscordCard
        components={[
          text(`-# ${brand.name[lang]}\n## ${title}\n${body}`),
          image(`/${lang}/opengraph-image`),
          buttons([pick(lang)("Отвори", "Open"), path], [home, "/"]),
        ]}
      />
    );
  }

  return { SITE: brand.url, text, image, buttons, divider, DiscordCard, PageCard };
}
