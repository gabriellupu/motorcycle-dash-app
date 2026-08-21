/**
 * Curated vehicle catalogue used by the onboarding autocomplete.
 *
 * Motorcycle rows are [model, firstYear, lastYear (0 = still made), cc, redline rpm, top km/h].
 * Car rows add a body style, which picks the fallback silhouette and sharpens
 * the AI prompt ("hatchback", "estate", …).
 *
 * The numbers drive gauge scaling, not spec-sheet accuracy — every value can be
 * overridden per vehicle in Settings, and anything not listed can be typed in.
 */

export type VehicleType = 'motorcycle' | 'car';

export type CarBodyStyle = 'hatch' | 'sedan' | 'estate' | 'suv' | 'coupe' | 'pickup' | 'van';

type BikeRow = [string, number, number, number, number, number];
type CarRow = [string, number, number, number, number, number, CarBodyStyle];

const MOTORCYCLES: Record<string, BikeRow[]> = {
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
  'MV Agusta': [
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
  'Royal Enfield': [
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

const CARS: Record<string, CarRow[]> = {
  Toyota: [
    ['Corolla', 1966, 0, 1798, 6500, 180, 'hatch'],
    ['Yaris', 1999, 0, 1490, 6500, 175, 'hatch'],
    ['GR Yaris', 2020, 0, 1618, 7000, 230, 'hatch'],
    ['Camry', 1982, 0, 2487, 6500, 210, 'sedan'],
    ['RAV4', 1994, 0, 2487, 6500, 190, 'suv'],
    ['Land Cruiser', 1985, 0, 3346, 4500, 175, 'suv'],
    ['Hilux', 1990, 0, 2393, 4500, 175, 'pickup'],
    ['GR86', 2021, 0, 2387, 7500, 226, 'coupe'],
    ['Supra', 2019, 0, 2998, 6500, 250, 'coupe'],
    ['Prius', 1997, 0, 1987, 6000, 180, 'hatch'],
  ],
  Volkswagen: [
    ['Golf', 1974, 0, 1498, 6500, 210, 'hatch'],
    ['Golf GTI', 1976, 0, 1984, 6800, 250, 'hatch'],
    ['Golf R', 2010, 0, 1984, 6800, 250, 'hatch'],
    ['Polo', 1975, 0, 999, 6500, 190, 'hatch'],
    ['Passat', 1973, 0, 1968, 5000, 230, 'estate'],
    ['Tiguan', 2007, 0, 1984, 6500, 210, 'suv'],
    ['T-Roc', 2017, 0, 1498, 6500, 205, 'suv'],
    ['Arteon', 2017, 0, 1984, 6500, 250, 'sedan'],
    ['ID.3', 2020, 0, 0, 0, 160, 'hatch'],
    ['ID.4', 2021, 0, 0, 0, 180, 'suv'],
    ['Transporter', 1990, 0, 1968, 5000, 180, 'van'],
  ],
  BMW: [
    ['1 Series', 2004, 0, 1499, 6500, 220, 'hatch'],
    ['3 Series', 1975, 0, 1998, 6500, 250, 'sedan'],
    ['M3', 1986, 0, 2993, 7200, 290, 'sedan'],
    ['4 Series', 2013, 0, 2998, 6500, 250, 'coupe'],
    ['M4', 2014, 0, 2993, 7200, 290, 'coupe'],
    ['5 Series', 1972, 0, 2998, 6500, 250, 'sedan'],
    ['M5', 1984, 0, 4395, 7200, 305, 'sedan'],
    ['X3', 2003, 0, 1998, 6500, 240, 'suv'],
    ['X5', 1999, 0, 2993, 5500, 250, 'suv'],
    ['i4', 2021, 0, 0, 0, 225, 'sedan'],
    ['Z4', 2002, 0, 2998, 6500, 250, 'coupe'],
  ],
  'Mercedes-Benz': [
    ['A-Class', 1997, 0, 1332, 6500, 220, 'hatch'],
    ['C-Class', 1993, 0, 1999, 6500, 250, 'sedan'],
    ['E-Class', 1993, 0, 1991, 6000, 250, 'sedan'],
    ['S-Class', 1972, 0, 2999, 6000, 250, 'sedan'],
    ['GLC', 2015, 0, 1999, 6000, 240, 'suv'],
    ['GLE', 2015, 0, 2925, 5000, 240, 'suv'],
    ['CLA', 2013, 0, 1991, 6500, 250, 'coupe'],
    ['AMG GT', 2014, 0, 3982, 7000, 318, 'coupe'],
    ['Sprinter', 1995, 0, 2143, 4500, 160, 'van'],
  ],
  Audi: [
    ['A1', 2010, 0, 999, 6500, 200, 'hatch'],
    ['A3', 1996, 0, 1498, 6500, 240, 'hatch'],
    ['S3', 1999, 0, 1984, 6800, 250, 'hatch'],
    ['RS3', 2011, 0, 2480, 7000, 290, 'hatch'],
    ['A4', 1994, 0, 1984, 6500, 250, 'sedan'],
    ['A6', 1994, 0, 1984, 6500, 250, 'sedan'],
    ['Q3', 2011, 0, 1498, 6500, 220, 'suv'],
    ['Q5', 2008, 0, 1984, 6500, 240, 'suv'],
    ['Q7', 2005, 0, 2967, 4800, 250, 'suv'],
    ['TT', 1998, 2023, 1984, 6800, 250, 'coupe'],
    ['e-tron GT', 2021, 0, 0, 0, 245, 'sedan'],
  ],
  Ford: [
    ['Fiesta', 1976, 2023, 999, 6500, 200, 'hatch'],
    ['Fiesta ST', 2005, 2023, 1497, 6500, 232, 'hatch'],
    ['Focus', 1998, 0, 1497, 6500, 210, 'hatch'],
    ['Focus ST', 2002, 0, 2261, 6500, 250, 'hatch'],
    ['Puma', 2019, 0, 999, 6500, 200, 'suv'],
    ['Kuga', 2008, 0, 1499, 6500, 200, 'suv'],
    ['Mustang', 1964, 0, 5038, 7500, 250, 'coupe'],
    ['Ranger', 1998, 0, 1996, 4500, 180, 'pickup'],
    ['F-150', 1975, 0, 3496, 6000, 180, 'pickup'],
    ['Transit', 1965, 0, 1995, 4500, 165, 'van'],
  ],
  Honda: [
    ['Civic', 1972, 0, 1498, 6500, 200, 'hatch'],
    ['Civic Type R', 1997, 0, 1996, 7000, 272, 'hatch'],
    ['Jazz', 2001, 0, 1498, 6600, 175, 'hatch'],
    ['CR-V', 1995, 0, 1993, 6000, 190, 'suv'],
    ['HR-V', 1998, 0, 1498, 6600, 175, 'suv'],
    ['Accord', 1976, 0, 1993, 6500, 200, 'sedan'],
    ['NSX', 1990, 2022, 3493, 7500, 307, 'coupe'],
  ],
  Hyundai: [
    ['i20', 2008, 0, 998, 6500, 190, 'hatch'],
    ['i20 N', 2020, 0, 1598, 6750, 230, 'hatch'],
    ['i30', 2007, 0, 1482, 6500, 200, 'hatch'],
    ['i30 N', 2017, 0, 1998, 6750, 250, 'hatch'],
    ['Tucson', 2004, 0, 1598, 6500, 200, 'suv'],
    ['Santa Fe', 2000, 0, 2199, 4500, 205, 'suv'],
    ['Ioniq 5', 2021, 0, 0, 0, 185, 'hatch'],
    ['Kona', 2017, 0, 1598, 6500, 195, 'suv'],
  ],
  Kia: [
    ['Ceed', 2006, 0, 1482, 6500, 200, 'hatch'],
    ['Picanto', 2004, 0, 998, 6500, 170, 'hatch'],
    ['Sportage', 1993, 0, 1598, 6500, 200, 'suv'],
    ['Sorento', 2002, 0, 2199, 4500, 200, 'suv'],
    ['EV6', 2021, 0, 0, 0, 260, 'hatch'],
    ['Stinger', 2017, 2023, 3342, 6500, 270, 'sedan'],
  ],
  Mazda: [
    ['2', 2002, 0, 1496, 6500, 180, 'hatch'],
    ['3', 2003, 0, 1998, 6500, 210, 'hatch'],
    ['6', 2002, 0, 2488, 6500, 223, 'sedan'],
    ['CX-5', 2012, 0, 2488, 6500, 200, 'suv'],
    ['CX-60', 2022, 0, 3283, 5000, 219, 'suv'],
    ['MX-5', 1989, 0, 1998, 7500, 219, 'coupe'],
    ['RX-8', 2003, 2012, 1308, 9000, 235, 'coupe'],
  ],
  Nissan: [
    ['Micra', 1982, 0, 999, 6500, 180, 'hatch'],
    ['Qashqai', 2006, 0, 1332, 6500, 200, 'suv'],
    ['X-Trail', 2000, 0, 1497, 6500, 200, 'suv'],
    ['Juke', 2010, 0, 999, 6500, 180, 'suv'],
    ['370Z', 2009, 2020, 3696, 7500, 250, 'coupe'],
    ['Z', 2022, 0, 2997, 6800, 250, 'coupe'],
    ['GT-R', 2007, 0, 3799, 7000, 315, 'coupe'],
    ['Leaf', 2010, 0, 0, 0, 150, 'hatch'],
  ],
  Peugeot: [
    ['208', 2012, 0, 1199, 6000, 190, 'hatch'],
    ['308', 2007, 0, 1199, 6000, 210, 'hatch'],
    ['3008', 2008, 0, 1199, 6000, 200, 'suv'],
    ['5008', 2009, 0, 1499, 4500, 200, 'suv'],
    ['508', 2010, 0, 1598, 6000, 250, 'sedan'],
  ],
  Renault: [
    ['Clio', 1990, 0, 999, 6000, 190, 'hatch'],
    ['Megane', 1995, 0, 1332, 6000, 205, 'hatch'],
    ['Megane RS', 2004, 2023, 1798, 6500, 255, 'hatch'],
    ['Captur', 2013, 0, 1333, 6000, 190, 'suv'],
    ['Austral', 2022, 0, 1332, 6000, 175, 'suv'],
    ['Zoe', 2012, 0, 0, 0, 140, 'hatch'],
  ],
  Škoda: [
    ['Fabia', 1999, 0, 999, 6500, 190, 'hatch'],
    ['Octavia', 1996, 0, 1498, 6500, 220, 'hatch'],
    ['Octavia RS', 2000, 0, 1984, 6800, 250, 'estate'],
    ['Superb', 2001, 0, 1984, 6500, 250, 'sedan'],
    ['Kodiaq', 2016, 0, 1968, 5000, 210, 'suv'],
    ['Karoq', 2017, 0, 1498, 6500, 200, 'suv'],
    ['Enyaq', 2020, 0, 0, 0, 180, 'suv'],
  ],
  Subaru: [
    ['Impreza', 1992, 0, 1995, 6500, 200, 'hatch'],
    ['WRX STI', 1994, 2021, 2457, 6700, 255, 'sedan'],
    ['Forester', 1997, 0, 1995, 6000, 195, 'suv'],
    ['Outback', 1994, 0, 2498, 6000, 200, 'estate'],
    ['BRZ', 2012, 0, 2387, 7500, 226, 'coupe'],
  ],
  Tesla: [
    ['Model 3', 2017, 0, 0, 0, 261, 'sedan'],
    ['Model Y', 2020, 0, 0, 0, 250, 'suv'],
    ['Model S', 2012, 0, 0, 0, 322, 'sedan'],
    ['Model X', 2015, 0, 0, 0, 262, 'suv'],
  ],
  Volvo: [
    ['V60', 2010, 0, 1969, 6000, 250, 'estate'],
    ['V90', 2016, 0, 1969, 6000, 250, 'estate'],
    ['XC40', 2017, 0, 1477, 6000, 210, 'suv'],
    ['XC60', 2008, 0, 1969, 6000, 220, 'suv'],
    ['XC90', 2002, 0, 1969, 6000, 230, 'suv'],
  ],
  Porsche: [
    ['911 Carrera', 1963, 0, 2981, 7500, 293, 'coupe'],
    ['911 GT3', 1999, 0, 3996, 9000, 318, 'coupe'],
    ['718 Cayman', 2016, 0, 1988, 7400, 275, 'coupe'],
    ['Macan', 2014, 0, 1984, 6500, 232, 'suv'],
    ['Cayenne', 2002, 0, 2995, 6500, 245, 'suv'],
    ['Taycan', 2019, 0, 0, 0, 260, 'sedan'],
    ['Panamera', 2009, 0, 2894, 6500, 272, 'sedan'],
  ],
  Chevrolet: [
    ['Camaro', 1966, 0, 6162, 6600, 290, 'coupe'],
    ['Corvette', 1953, 0, 6162, 6600, 312, 'coupe'],
    ['Silverado', 1998, 0, 5328, 6000, 180, 'pickup'],
  ],
  Jeep: [
    ['Wrangler', 1986, 0, 1995, 6000, 180, 'suv'],
    ['Grand Cherokee', 1992, 0, 3604, 6400, 200, 'suv'],
    ['Renegade', 2014, 0, 1332, 6000, 190, 'suv'],
  ],
  Dacia: [
    ['Sandero', 2008, 0, 999, 6000, 175, 'hatch'],
    ['Duster', 2010, 0, 1332, 6000, 180, 'suv'],
    ['Jogger', 2021, 0, 999, 6000, 183, 'estate'],
    ['Spring', 2021, 0, 0, 0, 125, 'hatch'],
  ],
  Fiat: [
    ['500', 2007, 0, 999, 6000, 167, 'hatch'],
    ['Panda', 1980, 0, 999, 6000, 155, 'hatch'],
    ['Tipo', 2015, 0, 1368, 6000, 200, 'hatch'],
  ],
  MINI: [
    ['Cooper', 2001, 0, 1499, 6500, 210, 'hatch'],
    ['Cooper S', 2001, 0, 1998, 6500, 235, 'hatch'],
    ['John Cooper Works', 2008, 0, 1998, 6500, 246, 'hatch'],
    ['Countryman', 2010, 0, 1499, 6500, 205, 'suv'],
  ],
  'Land Rover': [
    ['Defender', 1983, 0, 2996, 6000, 208, 'suv'],
    ['Discovery', 1989, 0, 2996, 6000, 209, 'suv'],
    ['Range Rover', 1970, 0, 4395, 6000, 250, 'suv'],
    ['Range Rover Evoque', 2011, 0, 1997, 6000, 230, 'suv'],
  ],
  Lexus: [
    ['IS', 1999, 0, 2494, 6500, 230, 'sedan'],
    ['RX', 1998, 0, 2487, 6000, 200, 'suv'],
    ['NX', 2014, 0, 2487, 6000, 200, 'suv'],
    ['LC 500', 2017, 0, 4969, 7300, 270, 'coupe'],
  ],
  Alfa_Romeo: [
    ['Giulia', 2016, 0, 1995, 6500, 240, 'sedan'],
    ['Giulia Quadrifoglio', 2016, 0, 2891, 7000, 307, 'sedan'],
    ['Stelvio', 2017, 0, 1995, 6500, 230, 'suv'],
    ['Tonale', 2022, 0, 1469, 6000, 212, 'suv'],
  ],
};

/** Display names for makes whose object key needed escaping. */
const MAKE_LABELS: Record<string, string> = {
  Alfa_Romeo: 'Alfa Romeo',
};

export interface VehicleCatalogEntry {
  type: VehicleType;
  make: string;
  model: string;
  firstYear: number;
  lastYear: number;
  displacementCc: number;
  redlineRpm: number;
  topSpeedKph: number;
  bodyStyle?: CarBodyStyle;
  /** "Yamaha MT-09" */
  label: string;
}

function build(): VehicleCatalogEntry[] {
  const bikes = Object.entries(MOTORCYCLES).flatMap(([makeKey, rows]) => {
    const make = MAKE_LABELS[makeKey] ?? makeKey;
    return rows.map(([model, firstYear, lastYear, cc, redline, top]) => ({
      type: 'motorcycle' as const,
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

  const cars = Object.entries(CARS).flatMap(([makeKey, rows]) => {
    const make = MAKE_LABELS[makeKey] ?? makeKey;
    return rows.map(([model, firstYear, lastYear, cc, redline, top, bodyStyle]) => ({
      type: 'car' as const,
      make,
      model,
      firstYear,
      lastYear: lastYear || new Date().getFullYear() + 1,
      displacementCc: cc,
      redlineRpm: redline,
      topSpeedKph: top,
      bodyStyle,
      label: `${make} ${model}`,
    }));
  });

  return [...bikes, ...cars];
}

export const VEHICLES: VehicleCatalogEntry[] = build();

export function isElectric(entry: Pick<VehicleCatalogEntry, 'displacementCc'>): boolean {
  return entry.displacementCc === 0;
}

export function makesFor(type: VehicleType): string[] {
  return [...new Set(VEHICLES.filter((v) => v.type === type).map((v) => v.make))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function modelsForMake(type: VehicleType, make: string): VehicleCatalogEntry[] {
  return VEHICLES.filter(
    (v) => v.type === type && v.make.toLowerCase() === make.toLowerCase(),
  ).sort((a, b) => a.model.localeCompare(b.model));
}

export function yearsFor(entry: Pick<VehicleCatalogEntry, 'firstYear' | 'lastYear'>): number[] {
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

export function searchVehicles(
  query: string,
  type: VehicleType,
  limit = 12,
): VehicleCatalogEntry[] {
  const q = query.trim();
  if (!q) return [];
  // Allow "yamaha mt09" and "mt09" alike by scoring the label, model and make.
  return VEHICLES.filter((v) => v.type === type)
    .map((vehicle) => ({
      vehicle,
      s: Math.max(
        score(vehicle.label, q),
        score(vehicle.model, q) - 20,
        score(vehicle.make, q) - 60,
      ),
    }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((r) => r.vehicle);
}

export function findEntry(
  type: VehicleType,
  make: string,
  model: string,
): VehicleCatalogEntry | undefined {
  return VEHICLES.find(
    (v) =>
      v.type === type &&
      v.make.toLowerCase() === make.toLowerCase() &&
      v.model.toLowerCase() === model.toLowerCase(),
  );
}
