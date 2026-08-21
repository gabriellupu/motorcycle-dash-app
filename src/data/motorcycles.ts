/**
 * Curated motorcycle catalogue used by the onboarding autocomplete.
 *
 * Rows are [model, firstYear, lastYear (0 = still made), cc, redline rpm, top speed km/h].
 * The numbers drive gauge scaling, not spec-sheet accuracy — a rider can always
 * override redline and top speed in Settings, and any bike not listed can be
 * entered by hand.
 */

type Row = [string, number, number, number, number, number];

const CATALOGUE: Record<string, Row[]> = {
  Yamaha: [
    ['MT-07', 2014, 0, 689, 10000, 205],
    ['MT-09', 2013, 0, 890, 11000, 220],
    ['MT-10', 2016, 0, 998, 12000, 250],
    ['MT-03', 2016, 0, 321, 12500, 180],
    ['YZF-R1', 1998, 0, 998, 14500, 299],
    ['YZF-R1M', 2015, 0, 998, 14500, 299],
    ['YZF-R6', 1999, 2020, 599, 16500, 262],
    ['YZF-R7', 2021, 0, 689, 10000, 220],
    ['YZF-R3', 2015, 0, 321, 12500, 180],
    ['Tracer 9 GT', 2021, 0, 890, 11000, 230],
    ['Ténéré 700', 2019, 0, 689, 10000, 190],
    ['XSR900', 2016, 0, 890, 11000, 220],
    ['XSR700', 2016, 0, 689, 10000, 205],
    ['Bolt', 2014, 0, 942, 6500, 175],
    ['VMAX', 2009, 2020, 1679, 9000, 220],
    ['FZ-09', 2014, 2017, 847, 11000, 220],
    ['FJR1300', 2001, 2022, 1298, 9000, 250],
  ],
  Honda: [
    ['CB500F', 2013, 0, 471, 9000, 180],
    ['CBR500R', 2013, 0, 471, 9000, 180],
    ['CB650R', 2019, 0, 649, 12000, 210],
    ['CBR650R', 2019, 0, 649, 12000, 220],
    ['CB750 Hornet', 2023, 0, 755, 10000, 215],
    ['CBR600RR', 2003, 0, 599, 15000, 260],
    ['CBR1000RR-R Fireblade', 2020, 0, 1000, 14500, 299],
    ['CBR1000RR Fireblade', 2004, 2019, 999, 13000, 299],
    ['CB1000R', 2008, 0, 998, 11500, 240],
    ['Africa Twin CRF1100L', 2020, 0, 1084, 8500, 200],
    ['Africa Twin CRF1000L', 2016, 2019, 998, 8000, 195],
    ['NC750X', 2014, 0, 745, 6500, 170],
    ['Rebel 500', 2017, 0, 471, 9000, 170],
    ['Rebel 1100', 2021, 0, 1084, 7000, 190],
    ['Gold Wing', 2001, 0, 1833, 6000, 200],
    ['Monkey 125', 2018, 0, 125, 9000, 100],
    ['Grom', 2013, 0, 125, 9000, 90],
    ['XL750 Transalp', 2023, 0, 755, 10000, 200],
  ],
  Kawasaki: [
    ['Ninja 400', 2018, 0, 399, 12000, 190],
    ['Ninja 650', 2017, 0, 649, 11000, 200],
    ['Ninja ZX-6R', 1995, 0, 636, 16000, 260],
    ['Ninja ZX-10R', 2004, 0, 998, 14000, 299],
    ['Ninja H2', 2015, 0, 998, 14000, 299],
    ['Ninja 1000SX', 2020, 0, 1043, 11500, 250],
    ['Z650', 2017, 0, 649, 11000, 200],
    ['Z900', 2017, 0, 948, 11000, 240],
    ['Z900RS', 2018, 0, 948, 10000, 220],
    ['Z1000', 2003, 2020, 1043, 11000, 240],
    ['Versys 650', 2007, 0, 649, 11000, 200],
    ['Versys 1000', 2012, 0, 1043, 11000, 220],
    ['Vulcan S', 2015, 0, 649, 11000, 180],
    ['KLR650', 1987, 0, 652, 7000, 160],
    ['W800', 2011, 0, 773, 7000, 180],
  ],
  Suzuki: [
    ['GSX-R750', 1985, 0, 750, 15000, 290],
    ['GSX-R1000', 2001, 0, 999, 14500, 299],
    ['GSX-R600', 1992, 0, 599, 15500, 260],
    ['GSX-S750', 2015, 0, 749, 12000, 230],
    ['GSX-S1000', 2015, 0, 999, 11500, 250],
    ['GSX-8S', 2023, 0, 776, 10000, 215],
    ['SV650', 1999, 0, 645, 11000, 200],
    ['V-Strom 650', 2004, 0, 645, 10000, 195],
    ['V-Strom 1050', 2020, 0, 1037, 10000, 210],
    ['Hayabusa', 1999, 0, 1340, 11200, 299],
    ['Katana', 2019, 0, 999, 11500, 250],
    ['DR-Z400', 2000, 0, 398, 11000, 150],
  ],
  Ducati: [
    ['Monster 937', 2021, 0, 937, 10500, 225],
    ['Monster 821', 2014, 2020, 821, 10000, 220],
    ['Monster 1200', 2014, 2021, 1198, 9500, 240],
    ['Panigale V4', 2018, 0, 1103, 14500, 299],
    ['Panigale V2', 2020, 0, 955, 11500, 270],
    ['Panigale 1299', 2015, 2018, 1285, 11500, 290],
    ['Streetfighter V4', 2020, 0, 1103, 14000, 290],
    ['Streetfighter V2', 2022, 0, 955, 11500, 265],
    ['Multistrada V4', 2021, 0, 1158, 11000, 250],
    ['Multistrada 1260', 2018, 2020, 1262, 10500, 250],
    ['Scrambler Icon', 2015, 0, 803, 9000, 195],
    ['Diavel V4', 2023, 0, 1158, 11000, 250],
    ['Hypermotard 950', 2019, 0, 937, 10500, 220],
    ['DesertX', 2022, 0, 937, 10500, 200],
    ['SuperSport 950', 2021, 0, 937, 10500, 240],
  ],
  BMW: [
    ['S 1000 RR', 2009, 0, 999, 14600, 299],
    ['S 1000 R', 2014, 0, 999, 12000, 250],
    ['S 1000 XR', 2015, 0, 999, 12000, 250],
    ['R 1250 GS', 2019, 0, 1254, 9000, 220],
    ['R 1300 GS', 2024, 0, 1300, 9000, 220],
    ['R 1200 GS', 2004, 2018, 1170, 8500, 210],
    ['F 900 R', 2020, 0, 895, 9000, 215],
    ['F 850 GS', 2018, 0, 853, 9000, 200],
    ['G 310 R', 2016, 0, 313, 10500, 145],
    ['R nineT', 2014, 0, 1170, 8500, 200],
    ['M 1000 RR', 2021, 0, 999, 15100, 306],
    ['K 1600 GT', 2011, 0, 1649, 8500, 250],
  ],
  KTM: [
    ['390 Duke', 2013, 0, 399, 10000, 170],
    ['690 Duke', 2008, 0, 693, 9000, 200],
    ['790 Duke', 2018, 0, 799, 10500, 220],
    ['890 Duke R', 2020, 0, 889, 10500, 230],
    ['1290 Super Duke R', 2014, 0, 1301, 10500, 270],
    ['1290 Super Adventure', 2015, 0, 1301, 10000, 240],
    ['890 Adventure R', 2021, 0, 889, 10000, 200],
    ['RC 390', 2014, 0, 373, 10000, 170],
    ['RC 8C', 2022, 0, 889, 10500, 250],
    ['500 EXC-F', 2012, 0, 511, 10000, 150],
  ],
  Triumph: [
    ['Street Triple 765 RS', 2017, 0, 765, 12500, 250],
    ['Speed Triple 1200 RS', 2021, 0, 1160, 11500, 260],
    ['Trident 660', 2021, 0, 660, 10500, 210],
    ['Tiger 900', 2020, 0, 888, 10000, 210],
    ['Tiger 1200', 2012, 0, 1160, 9500, 220],
    ['Bonneville T120', 2016, 0, 1200, 7000, 180],
    ['Bonneville T100', 2002, 0, 900, 7500, 175],
    ['Speed Twin 1200', 2019, 0, 1200, 7500, 200],
    ['Scrambler 1200', 2019, 0, 1200, 7500, 195],
    ['Daytona 675', 2006, 2017, 675, 14500, 260],
    ['Rocket 3', 2020, 0, 2458, 7000, 225],
  ],
  Aprilia: [
    ['RS 660', 2020, 0, 659, 11500, 240],
    ['Tuono 660', 2021, 0, 659, 11500, 230],
    ['Tuono V4', 2011, 0, 1077, 13000, 290],
    ['RSV4', 2009, 0, 1099, 13500, 299],
    ['Shiver 900', 2017, 0, 896, 10000, 230],
    ['Tuareg 660', 2022, 0, 659, 11500, 195],
  ],
  'Harley-Davidson': [
    ['Sportster S', 2021, 0, 1252, 9500, 200],
    ['Iron 883', 2009, 2022, 883, 6000, 170],
    ['Fat Bob', 2008, 0, 1868, 5500, 175],
    ['Street Glide', 1998, 0, 1868, 5500, 180],
    ['Road King', 1994, 0, 1868, 5500, 180],
    ['Pan America 1250', 2021, 0, 1252, 9500, 200],
    ['Nightster', 2022, 0, 975, 9500, 190],
  ],
  Indian: [
    ['FTR 1200', 2019, 0, 1203, 9000, 200],
    ['Scout Bobber', 2018, 0, 1133, 8100, 185],
    ['Chief Dark Horse', 2022, 0, 1890, 5500, 180],
    ['Challenger', 2020, 0, 1768, 6500, 190],
  ],
  'Moto Guzzi': [
    ['V7 Stone', 2012, 0, 853, 7000, 180],
    ['V85 TT', 2019, 0, 853, 7500, 190],
    ['V100 Mandello', 2022, 0, 1042, 9500, 220],
  ],
  MV: [
    ['F3 800', 2013, 0, 798, 13500, 269],
    ['Brutale 800', 2012, 0, 798, 13000, 245],
    ['Dragster 800 RR', 2014, 0, 798, 13000, 245],
    ['Superveloce 800', 2020, 0, 798, 13000, 245],
  ],
  Husqvarna: [
    ['Svartpilen 401', 2018, 0, 399, 10000, 170],
    ['Vitpilen 701', 2018, 0, 693, 9000, 200],
    ['Norden 901', 2022, 0, 889, 10000, 200],
    ['701 Enduro', 2016, 0, 693, 9000, 175],
  ],
  Royal_Enfield: [
    ['Interceptor 650', 2018, 0, 648, 7500, 165],
    ['Continental GT 650', 2018, 0, 648, 7500, 165],
    ['Himalayan 450', 2024, 0, 452, 8500, 155],
    ['Classic 350', 2021, 0, 349, 6500, 120],
  ],
  CFMOTO: [
    ['450SS', 2023, 0, 449, 11000, 180],
    ['700CL-X', 2021, 0, 693, 9000, 190],
    ['800MT', 2021, 0, 799, 9500, 200],
  ],
  Zero: [
    ['SR/F', 2019, 0, 0, 0, 200],
    ['SR/S', 2020, 0, 0, 0, 200],
    ['DSR/X', 2022, 0, 0, 0, 180],
  ],
  Energica: [
    ['Ego', 2015, 0, 0, 0, 240],
    ['Eva Ribelle', 2020, 0, 0, 0, 200],
  ],
  Benelli: [
    ['TRK 502', 2017, 0, 500, 9000, 165],
    ['Leoncino 500', 2017, 0, 500, 9000, 165],
  ],
  Kymco: [['AK 550', 2017, 0, 550, 8000, 175]],
  Vespa: [
    ['GTS 300', 2008, 0, 278, 8000, 130],
    ['Primavera 150', 2014, 0, 155, 8000, 95],
  ],
};

/** Display names for makes whose key needed escaping. */
const MAKE_LABELS: Record<string, string> = {
  Royal_Enfield: 'Royal Enfield',
  MV: 'MV Agusta',
};

export interface BikeCatalogEntry {
  make: string;
  model: string;
  firstYear: number;
  lastYear: number;
  displacementCc: number;
  redlineRpm: number;
  topSpeedKph: number;
  /** "Yamaha MT-09" */
  label: string;
}

export const BIKES: BikeCatalogEntry[] = Object.entries(CATALOGUE).flatMap(([makeKey, rows]) => {
  const make = MAKE_LABELS[makeKey] ?? makeKey;
  return rows.map(([model, firstYear, lastYear, cc, redline, top]) => ({
    make,
    model,
    firstYear,
    lastYear: lastYear || new Date().getFullYear() + 1,
    displacementCc: cc,
    redlineRpm: redline,
    topSpeedKph: top,
    label: `${make} ${model}`,
  }));
});

export const MAKES: string[] = [...new Set(BIKES.map((b) => b.make))].sort((a, b) =>
  a.localeCompare(b),
);

export function modelsForMake(make: string): BikeCatalogEntry[] {
  return BIKES.filter((b) => b.make.toLowerCase() === make.toLowerCase()).sort((a, b) =>
    a.model.localeCompare(b.model),
  );
}

export function yearsFor(entry: BikeCatalogEntry): number[] {
  const last = Math.min(entry.lastYear, new Date().getFullYear() + 1);
  const years: number[] = [];
  for (let y = last; y >= entry.firstYear; y--) years.push(y);
  return years;
}

/** Case-insensitive subsequence match with a "starts with" bonus. */
function score(haystack: string, needle: string): number {
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase().trim();
  if (!n) return 0;
  if (h.startsWith(n)) return 1000 - h.length;
  const direct = h.indexOf(n);
  if (direct >= 0) return 700 - direct * 5 - h.length;
  // subsequence: "mt9" -> "MT-09"
  let i = 0;
  let gaps = 0;
  for (const ch of h) {
    if (ch === n[i]) {
      i++;
      if (i === n.length) break;
    } else if (i > 0) {
      gaps++;
    }
  }
  if (i < n.length) return -1;
  return 400 - gaps;
}

export function searchBikes(query: string, limit = 12): BikeCatalogEntry[] {
  const q = query.trim();
  if (!q) return [];
  // Allow "yamaha mt09" and "mt09" alike by scoring the full label and the model.
  const scored = BIKES.map((bike) => ({
    bike,
    s: Math.max(score(bike.label, q), score(bike.model, q) - 20, score(bike.make, q) - 60),
  }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((r) => r.bike);
}

export function findEntry(make: string, model: string): BikeCatalogEntry | undefined {
  return BIKES.find(
    (b) => b.make.toLowerCase() === make.toLowerCase() && b.model.toLowerCase() === model.toLowerCase(),
  );
}
