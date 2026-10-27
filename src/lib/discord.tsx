// Discord component embeds: a link preview built from Discord's message components instead of the
// plain Open Graph card. Discord reads a <script id="discord:component-embed"> from the served HTML
// (it does not run JavaScript), and falls back to the Open Graph tags if the payload is invalid.
// Rules we keep to: one Container at the root, at most 40 components, at most 3000 bytes of JSON,
// absolute https URLs, link buttons only, labels up to 80 characters.

import { APP_NAME, pick, type Lang } from "@/i18n/lang";

export const SITE = "https://ogneshtit.noahwaseaten.com";

type Text = { type: 10; content: string };
type Gallery = { type: 12; items: { media: { url: string }; description?: string }[] };
type Button = { type: 2; style: 5; label: string; url: string };
type Row = { type: 1; components: Button[] };
type Separator = { type: 14; divider?: boolean; spacing?: 1 | 2 };
type Child = Text | Gallery | Row | Separator;

export const text = (content: string): Text => ({ type: 10, content });
export const image = (url: string, description?: string): Gallery => ({
  type: 12,
  items: [{ media: { url: abs(url) }, ...(description && { description }) }],
});
export const buttons = (...links: [label: string, url: string][]): Row => ({
  type: 1,
  components: links.map(([label, url]) => ({ type: 2, style: 5, label, url: abs(url) })),
});
export const divider = (): Separator => ({ type: 14, divider: true, spacing: 1 });

const abs = (u: string) => (u.startsWith("http") ? u : SITE + u);

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

/** Renders the card into the page. Use only in server components so it is in the served HTML. */
export function DiscordCard({ accent = "#1f5b3e", components }: { accent?: string; components: Child[] }) {
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
export function PageCard({ lang, title, body, path }: { lang: Lang; title: string; body: string; path: string }) {
  const t = pick(lang);
  return (
    <DiscordCard
      components={[
        text(`-# ${APP_NAME[lang]}\n## ${title}\n${body}`),
        image(`/${lang}/opengraph-image`),
        buttons([t("Отвори", "Open"), path], [t("Опасност днес", "Danger today"), "/"]),
      ]}
    />
  );
}
