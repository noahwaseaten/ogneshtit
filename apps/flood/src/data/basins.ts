import type { Basin } from "@/lib/flood-types";

// The four river basin directorates (Басейнови дирекции) of the Ministry of Environment and Water. They manage the
// rivers and take reports about blocked river beds, rubbish and debris in rivers, illegal digging of sand and gravel,
// and damaged banks. Contacts copied from each directorate's own contacts page on 30 October 2026 (`source`).
// The "green phone" (зелен телефон) is the line each one gives for reports.

export type Directorate = {
  basin: Basin;
  name: string;
  en: string;
  town: string;
  address: string;
  email: string;
  phones: string[];
  web: string;
  source: string;
};

export const DIRECTORATES: Directorate[] = [
  {
    basin: "dunav",
    name: "Басейнова дирекция „Дунавски район“",
    en: "Danube Region Basin Directorate",
    town: "Плевен",
    address: "гр. Плевен, ул. „Чаталджа“ № 60",
    email: "dunavbd@bddr.bg",
    phones: ["+359 64 885 100", "+359 886 330 485"],
    web: "https://www.bd-dunav.bg",
    source: "https://www.bd-dunav.bg/contact/",
  },
  {
    basin: "cherno",
    name: "Басейнова дирекция „Черноморски район“",
    en: "Black Sea Region Basin Directorate",
    town: "Варна",
    address: "гр. Варна, ул. „Александър Дякович“ № 33",
    email: "bdvarna@bsbd.bg",
    phones: ["+359 52 687 455"],
    web: "https://www.bsbd.bg",
    source: "https://www.bsbd.bg/bg/page_6867127.html",
  },
  {
    basin: "iztok",
    name: "Басейнова дирекция „Източнобеломорски район“",
    en: "East Aegean Region Basin Directorate",
    town: "Пловдив",
    address: "гр. Пловдив, ул. „Янко Сакъзов“ № 35",
    email: "bd_plovdiv@earbd.bg",
    phones: ["+359 885 166 044"],
    web: "https://earbd.bg",
    source: "https://earbd.bg/Kontakti-c131",
  },
  {
    basin: "zapad",
    name: "Басейнова дирекция „Западнобеломорски район“",
    en: "West Aegean Region Basin Directorate",
    town: "Благоевград",
    address: "гр. Благоевград, бул. „Св. Димитър Солунски“ № 66",
    email: "bdblg@wabd.bg",
    phones: ["+359 889 288 807", "+359 73 894 130"],
    web: "https://wabd.bg",
    source: "https://wabd.bg/content/",
  },
];

export const directorateFor = (b: Basin) => DIRECTORATES.find((d) => d.basin === b)!;
