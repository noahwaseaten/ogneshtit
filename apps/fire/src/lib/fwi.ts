// Canadian Forest Fire Weather Index (FWI) System: Van Wagner (1987) equations.
// This is the same index EFFIS uses for its European fire danger forecast.
// Inputs are noon (local standard time) weather: temperature °C, relative humidity %,
// 10 m wind speed km/h, and rain mm over the previous 24 hours.

export type DailyWeather = {
  date: string; // YYYY-MM-DD
  month: number; // 1 to 12
  temp: number;
  rh: number;
  wind: number;
  rain: number;
};

export type Codes = { ffmc: number; dmc: number; dc: number };

export type FwiDay = DailyWeather &
  Codes & { isi: number; bui: number; fwi: number };

// Standard startup values when no previous codes are known (spring start).
export const STARTUP: Codes = { ffmc: 85, dmc: 6, dc: 15 };

// Day-length factors for latitudes > 30°N (Bulgaria is 41 to 44°N).
const DMC_EL = [6.5, 7.5, 9.0, 12.8, 13.9, 13.9, 12.4, 10.9, 9.4, 8.0, 7.0, 6.0];
const DC_FL = [-1.6, -1.6, -1.6, 0.9, 3.8, 5.8, 6.4, 5.0, 2.4, 0.4, -1.6, -1.6];

export function ffmcCalc(temp: number, rh: number, wind: number, rain: number, ffmc0: number) {
  rh = Math.min(100, Math.max(0, rh));
  let mo = (147.2 * (101 - ffmc0)) / (59.5 + ffmc0);
  if (rain > 0.5) {
    const rf = rain - 0.5;
    const add = 42.5 * rf * Math.exp(-100 / (251 - mo)) * (1 - Math.exp(-6.93 / rf));
    mo = mo > 150 ? mo + add + 0.0015 * (mo - 150) ** 2 * Math.sqrt(rf) : mo + add;
    if (mo > 250) mo = 250;
  }
  const ed =
    0.942 * rh ** 0.679 + 11 * Math.exp((rh - 100) / 10) + 0.18 * (21.1 - temp) * (1 - Math.exp(-0.115 * rh));
  let m: number;
  if (mo > ed) {
    const ko = 0.424 * (1 - (rh / 100) ** 1.7) + 0.0694 * Math.sqrt(wind) * (1 - (rh / 100) ** 8);
    const kd = ko * 0.581 * Math.exp(0.0365 * temp);
    m = ed + (mo - ed) * 10 ** -kd;
  } else {
    const ew =
      0.618 * rh ** 0.753 + 10 * Math.exp((rh - 100) / 10) + 0.18 * (21.1 - temp) * (1 - Math.exp(-0.115 * rh));
    if (mo < ew) {
      const k1 =
        0.424 * (1 - ((100 - rh) / 100) ** 1.7) + 0.0694 * Math.sqrt(wind) * (1 - ((100 - rh) / 100) ** 8);
      const kw = k1 * 0.581 * Math.exp(0.0365 * temp);
      m = ew - (ew - mo) * 10 ** -kw;
    } else {
      m = mo;
    }
  }
  const ffmc = (59.5 * (250 - m)) / (147.2 + m);
  return Math.min(101, Math.max(0, ffmc));
}

export function dmcCalc(temp: number, rh: number, rain: number, dmc0: number, month: number) {
  const t = Math.max(temp, -1.1);
  const rk = 1.894 * (t + 1.1) * (100 - rh) * DMC_EL[month - 1] * 1e-4;
  let pr = dmc0;
  if (rain > 1.5) {
    const rw = 0.92 * rain - 1.27;
    const wmi = 20 + 280 / Math.exp(0.023 * dmc0);
    const b =
      dmc0 <= 33 ? 100 / (0.5 + 0.3 * dmc0) : dmc0 <= 65 ? 14 - 1.3 * Math.log(dmc0) : 6.2 * Math.log(dmc0) - 17.2;
    const wmr = wmi + (1000 * rw) / (48.77 + b * rw);
    pr = 43.43 * (5.6348 - Math.log(wmr - 20));
  }
  return Math.max(0, pr) + Math.max(0, rk);
}

export function dcCalc(temp: number, rain: number, dc0: number, month: number) {
  const t = Math.max(temp, -2.8);
  const pe = Math.max(0, (0.36 * (t + 2.8) + DC_FL[month - 1]) / 2);
  let start = dc0;
  if (rain > 2.8) {
    const rd = 0.83 * rain - 1.27;
    const qo = 800 * Math.exp(-dc0 / 400);
    const qr = qo + 3.937 * rd;
    start = Math.max(0, 400 * Math.log(800 / qr));
  }
  return start + pe;
}

export function isiCalc(wind: number, ffmc: number) {
  const mo = (147.2 * (101 - ffmc)) / (59.5 + ffmc);
  const ff = 19.115 * Math.exp(-0.1386 * mo) * (1 + mo ** 5.31 / 4.93e7);
  return ff * Math.exp(0.05039 * wind);
}

export function buiCalc(dmc: number, dc: number) {
  if (dmc <= 0.4 * dc) {
    return dmc + 0.4 * dc === 0 ? 0 : (0.8 * dmc * dc) / (dmc + 0.4 * dc);
  }
  const bui = dmc - (1 - (0.8 * dc) / (dmc + 0.4 * dc)) * (0.92 + (0.0114 * dmc) ** 1.7);
  return Math.max(0, bui);
}

export function fwiCalc(isi: number, bui: number) {
  const bb =
    bui <= 80
      ? 0.1 * isi * (0.626 * bui ** 0.809 + 2)
      : 0.1 * isi * (1000 / (25 + 108.64 * Math.exp(-0.023 * bui)));
  return bb <= 1 ? bb : Math.exp(2.72 * (0.434 * Math.log(bb)) ** 0.647);
}

export function step(w: DailyWeather, prev: Codes): FwiDay {
  const ffmc = ffmcCalc(w.temp, w.rh, w.wind, w.rain, prev.ffmc);
  const dmc = dmcCalc(w.temp, w.rh, w.rain, prev.dmc, w.month);
  const dc = dcCalc(w.temp, w.rain, prev.dc, w.month);
  const isi = isiCalc(w.wind, ffmc);
  const bui = buiCalc(dmc, dc);
  const fwi = fwiCalc(isi, bui);
  return { ...w, ffmc, dmc, dc, isi, bui, fwi };
}

/** Runs the system day by day. Feed ~30+ days of history so the slow codes settle. */
export function runSeries(days: DailyWeather[], start: Codes = STARTUP): FwiDay[] {
  const out: FwiDay[] = [];
  let prev = start;
  for (const d of days) {
    const r = step(d, prev);
    out.push(r);
    prev = r;
  }
  return out;
}
