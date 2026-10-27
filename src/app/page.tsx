import { Today } from "@/components/Today";
import { DiscordCard, buttons, image, text } from "@/lib/discord";

export default function Page() {
  return (
    <>
      <DiscordCard
        components={[
          text(
            "## ОгнеЩит\nМоже ли да пламне гората днес? Опасност от горски пожар за всяко място в България, огън, засечен от спътник, и сигнали за незаконна сеч.",
          ),
          image("/opengraph-image"),
          buttons(["Опасност днес", "/"], ["Карта на пожарите", "/karta"], ["Помогни", "/pomogni"]),
        ]}
      />
      <Today />
    </>
  );
}
