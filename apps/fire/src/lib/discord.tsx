import type { Lang } from "@shtit/core/i18n/lang";
import { pick } from "@shtit/core/i18n/lang";
import { discordFor } from "@shtit/core/discord";

const kit = discordFor("fire");
export const { SITE, text, image, buttons, divider, DiscordCard } = kit;

/** A page's Discord card, with a second button back to today's danger. */
export function PageCard(props: { lang: Lang; title: string; body: string; path: string }) {
  return <kit.PageCard {...props} home={pick(props.lang)("Опасност днес", "Danger today")} />;
}
