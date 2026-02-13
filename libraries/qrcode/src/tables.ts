import type { ErrorCorrectionLevel } from "./types.ts";

/**
 * Byte-mode capacity table for all 40 QR versions.
 * Each entry: [L, M, Q, H] max bytes.
 */
export const CAPACITIES: number[][] = [
  [17, 14, 11, 7],       // V1
  [32, 26, 20, 14],      // V2
  [53, 42, 32, 24],      // V3
  [78, 62, 46, 34],      // V4
  [106, 84, 60, 44],     // V5
  [134, 106, 74, 58],    // V6
  [154, 122, 86, 64],    // V7
  [192, 152, 108, 84],   // V8
  [230, 180, 130, 98],   // V9
  [271, 213, 151, 119],  // V10
  [321, 251, 177, 137],  // V11
  [367, 287, 203, 155],  // V12
  [425, 331, 241, 177],  // V13
  [458, 362, 258, 194],  // V14
  [520, 412, 292, 220],  // V15
  [586, 450, 322, 250],  // V16
  [644, 504, 364, 280],  // V17
  [718, 560, 394, 310],  // V18
  [792, 624, 442, 338],  // V19
  [858, 666, 482, 382],  // V20
  [929, 711, 509, 403],  // V21
  [1003, 779, 565, 439], // V22
  [1091, 857, 611, 461], // V23
  [1171, 911, 661, 511], // V24
  [1273, 997, 715, 535], // V25
  [1367, 1059, 751, 593],// V26
  [1465, 1125, 805, 625],// V27
  [1528, 1190, 868, 658],// V28
  [1628, 1264, 908, 698],// V29
  [1732, 1370, 982, 742],// V30
  [1840, 1452, 1030, 790],// V31
  [1952, 1538, 1112, 842],// V32
  [2068, 1628, 1168, 898],// V33
  [2188, 1722, 1228, 958],// V34
  [2303, 1809, 1283, 983],// V35
  [2431, 1911, 1351, 1051],// V36
  [2563, 1989, 1423, 1093],// V37
  [2699, 2099, 1499, 1139],// V38
  [2809, 2213, 1579, 1219],// V39
  [2953, 2331, 1663, 1273],// V40
];

/**
 * Error correction specification for each version and EC level.
 * Each entry provides: total data codewords, EC codewords per block,
 * group 1 block count, group 1 data codewords per block,
 * group 2 block count, group 2 data codewords per block.
 */
type ECEntry = {
  dataCodewords: number;
  ecCodewordsPerBlock: number;
  group1Blocks: number;
  group1DataCodewords: number;
  group2Blocks: number;
  group2DataCodewords: number;
};

type ECVersionEntry = Record<ErrorCorrectionLevel, ECEntry>;

export const EC_TABLE: ECVersionEntry[] = [
  // Version 1
  {
    L: { dataCodewords: 19, ecCodewordsPerBlock: 7, group1Blocks: 1, group1DataCodewords: 19, group2Blocks: 0, group2DataCodewords: 0 },
    M: { dataCodewords: 16, ecCodewordsPerBlock: 10, group1Blocks: 1, group1DataCodewords: 16, group2Blocks: 0, group2DataCodewords: 0 },
    Q: { dataCodewords: 13, ecCodewordsPerBlock: 13, group1Blocks: 1, group1DataCodewords: 13, group2Blocks: 0, group2DataCodewords: 0 },
    H: { dataCodewords: 9, ecCodewordsPerBlock: 17, group1Blocks: 1, group1DataCodewords: 9, group2Blocks: 0, group2DataCodewords: 0 },
  },
  // Version 2
  {
    L: { dataCodewords: 34, ecCodewordsPerBlock: 10, group1Blocks: 1, group1DataCodewords: 34, group2Blocks: 0, group2DataCodewords: 0 },
    M: { dataCodewords: 28, ecCodewordsPerBlock: 16, group1Blocks: 1, group1DataCodewords: 28, group2Blocks: 0, group2DataCodewords: 0 },
    Q: { dataCodewords: 22, ecCodewordsPerBlock: 22, group1Blocks: 1, group1DataCodewords: 22, group2Blocks: 0, group2DataCodewords: 0 },
    H: { dataCodewords: 16, ecCodewordsPerBlock: 28, group1Blocks: 1, group1DataCodewords: 16, group2Blocks: 0, group2DataCodewords: 0 },
  },
  // Version 3
  {
    L: { dataCodewords: 55, ecCodewordsPerBlock: 15, group1Blocks: 1, group1DataCodewords: 55, group2Blocks: 0, group2DataCodewords: 0 },
    M: { dataCodewords: 44, ecCodewordsPerBlock: 26, group1Blocks: 1, group1DataCodewords: 44, group2Blocks: 0, group2DataCodewords: 0 },
    Q: { dataCodewords: 34, ecCodewordsPerBlock: 18, group1Blocks: 2, group1DataCodewords: 17, group2Blocks: 0, group2DataCodewords: 0 },
    H: { dataCodewords: 26, ecCodewordsPerBlock: 22, group1Blocks: 2, group1DataCodewords: 13, group2Blocks: 0, group2DataCodewords: 0 },
  },
  // Version 4
  {
    L: { dataCodewords: 80, ecCodewordsPerBlock: 20, group1Blocks: 1, group1DataCodewords: 80, group2Blocks: 0, group2DataCodewords: 0 },
    M: { dataCodewords: 64, ecCodewordsPerBlock: 18, group1Blocks: 2, group1DataCodewords: 32, group2Blocks: 0, group2DataCodewords: 0 },
    Q: { dataCodewords: 48, ecCodewordsPerBlock: 26, group1Blocks: 2, group1DataCodewords: 24, group2Blocks: 0, group2DataCodewords: 0 },
    H: { dataCodewords: 36, ecCodewordsPerBlock: 16, group1Blocks: 4, group1DataCodewords: 9, group2Blocks: 0, group2DataCodewords: 0 },
  },
  // Version 5
  {
    L: { dataCodewords: 108, ecCodewordsPerBlock: 26, group1Blocks: 1, group1DataCodewords: 108, group2Blocks: 0, group2DataCodewords: 0 },
    M: { dataCodewords: 86, ecCodewordsPerBlock: 24, group1Blocks: 2, group1DataCodewords: 43, group2Blocks: 0, group2DataCodewords: 0 },
    Q: { dataCodewords: 62, ecCodewordsPerBlock: 18, group1Blocks: 2, group1DataCodewords: 15, group2Blocks: 2, group2DataCodewords: 16 },
    H: { dataCodewords: 46, ecCodewordsPerBlock: 22, group1Blocks: 2, group1DataCodewords: 11, group2Blocks: 2, group2DataCodewords: 12 },
  },
  // Version 6
  {
    L: { dataCodewords: 136, ecCodewordsPerBlock: 18, group1Blocks: 2, group1DataCodewords: 68, group2Blocks: 0, group2DataCodewords: 0 },
    M: { dataCodewords: 108, ecCodewordsPerBlock: 16, group1Blocks: 4, group1DataCodewords: 27, group2Blocks: 0, group2DataCodewords: 0 },
    Q: { dataCodewords: 76, ecCodewordsPerBlock: 24, group1Blocks: 4, group1DataCodewords: 19, group2Blocks: 0, group2DataCodewords: 0 },
    H: { dataCodewords: 60, ecCodewordsPerBlock: 28, group1Blocks: 4, group1DataCodewords: 15, group2Blocks: 0, group2DataCodewords: 0 },
  },
  // Version 7
  {
    L: { dataCodewords: 156, ecCodewordsPerBlock: 20, group1Blocks: 2, group1DataCodewords: 78, group2Blocks: 0, group2DataCodewords: 0 },
    M: { dataCodewords: 124, ecCodewordsPerBlock: 18, group1Blocks: 4, group1DataCodewords: 31, group2Blocks: 0, group2DataCodewords: 0 },
    Q: { dataCodewords: 88, ecCodewordsPerBlock: 18, group1Blocks: 2, group1DataCodewords: 14, group2Blocks: 4, group2DataCodewords: 15 },
    H: { dataCodewords: 66, ecCodewordsPerBlock: 26, group1Blocks: 4, group1DataCodewords: 13, group2Blocks: 1, group2DataCodewords: 14 },
  },
  // Version 8
  {
    L: { dataCodewords: 194, ecCodewordsPerBlock: 24, group1Blocks: 2, group1DataCodewords: 97, group2Blocks: 0, group2DataCodewords: 0 },
    M: { dataCodewords: 154, ecCodewordsPerBlock: 22, group1Blocks: 2, group1DataCodewords: 38, group2Blocks: 2, group2DataCodewords: 39 },
    Q: { dataCodewords: 110, ecCodewordsPerBlock: 22, group1Blocks: 4, group1DataCodewords: 18, group2Blocks: 2, group2DataCodewords: 19 },
    H: { dataCodewords: 86, ecCodewordsPerBlock: 26, group1Blocks: 4, group1DataCodewords: 14, group2Blocks: 2, group2DataCodewords: 15 },
  },
  // Version 9
  {
    L: { dataCodewords: 232, ecCodewordsPerBlock: 30, group1Blocks: 2, group1DataCodewords: 116, group2Blocks: 0, group2DataCodewords: 0 },
    M: { dataCodewords: 182, ecCodewordsPerBlock: 22, group1Blocks: 3, group1DataCodewords: 36, group2Blocks: 2, group2DataCodewords: 37 },
    Q: { dataCodewords: 132, ecCodewordsPerBlock: 20, group1Blocks: 4, group1DataCodewords: 16, group2Blocks: 4, group2DataCodewords: 17 },
    H: { dataCodewords: 100, ecCodewordsPerBlock: 24, group1Blocks: 4, group1DataCodewords: 12, group2Blocks: 4, group2DataCodewords: 13 },
  },
  // Version 10
  {
    L: { dataCodewords: 274, ecCodewordsPerBlock: 18, group1Blocks: 2, group1DataCodewords: 68, group2Blocks: 2, group2DataCodewords: 69 },
    M: { dataCodewords: 216, ecCodewordsPerBlock: 26, group1Blocks: 4, group1DataCodewords: 43, group2Blocks: 1, group2DataCodewords: 44 },
    Q: { dataCodewords: 154, ecCodewordsPerBlock: 24, group1Blocks: 6, group1DataCodewords: 19, group2Blocks: 2, group2DataCodewords: 20 },
    H: { dataCodewords: 122, ecCodewordsPerBlock: 28, group1Blocks: 6, group1DataCodewords: 15, group2Blocks: 2, group2DataCodewords: 16 },
  },
  // Version 11
  {
    L: { dataCodewords: 324, ecCodewordsPerBlock: 20, group1Blocks: 4, group1DataCodewords: 81, group2Blocks: 0, group2DataCodewords: 0 },
    M: { dataCodewords: 254, ecCodewordsPerBlock: 30, group1Blocks: 1, group1DataCodewords: 50, group2Blocks: 4, group2DataCodewords: 51 },
    Q: { dataCodewords: 180, ecCodewordsPerBlock: 28, group1Blocks: 4, group1DataCodewords: 22, group2Blocks: 4, group2DataCodewords: 23 },
    H: { dataCodewords: 140, ecCodewordsPerBlock: 24, group1Blocks: 3, group1DataCodewords: 12, group2Blocks: 8, group2DataCodewords: 13 },
  },
  // Version 12
  {
    L: { dataCodewords: 370, ecCodewordsPerBlock: 24, group1Blocks: 2, group1DataCodewords: 92, group2Blocks: 2, group2DataCodewords: 93 },
    M: { dataCodewords: 290, ecCodewordsPerBlock: 22, group1Blocks: 6, group1DataCodewords: 36, group2Blocks: 2, group2DataCodewords: 37 },
    Q: { dataCodewords: 206, ecCodewordsPerBlock: 26, group1Blocks: 4, group1DataCodewords: 20, group2Blocks: 6, group2DataCodewords: 21 },
    H: { dataCodewords: 158, ecCodewordsPerBlock: 28, group1Blocks: 7, group1DataCodewords: 14, group2Blocks: 4, group2DataCodewords: 15 },
  },
  // Version 13
  {
    L: { dataCodewords: 428, ecCodewordsPerBlock: 26, group1Blocks: 4, group1DataCodewords: 107, group2Blocks: 0, group2DataCodewords: 0 },
    M: { dataCodewords: 334, ecCodewordsPerBlock: 22, group1Blocks: 8, group1DataCodewords: 37, group2Blocks: 1, group2DataCodewords: 38 },
    Q: { dataCodewords: 244, ecCodewordsPerBlock: 24, group1Blocks: 8, group1DataCodewords: 20, group2Blocks: 4, group2DataCodewords: 21 },
    H: { dataCodewords: 180, ecCodewordsPerBlock: 22, group1Blocks: 12, group1DataCodewords: 11, group2Blocks: 4, group2DataCodewords: 12 },
  },
  // Version 14
  {
    L: { dataCodewords: 461, ecCodewordsPerBlock: 30, group1Blocks: 3, group1DataCodewords: 115, group2Blocks: 1, group2DataCodewords: 116 },
    M: { dataCodewords: 365, ecCodewordsPerBlock: 24, group1Blocks: 4, group1DataCodewords: 40, group2Blocks: 5, group2DataCodewords: 41 },
    Q: { dataCodewords: 261, ecCodewordsPerBlock: 20, group1Blocks: 11, group1DataCodewords: 16, group2Blocks: 5, group2DataCodewords: 17 },
    H: { dataCodewords: 197, ecCodewordsPerBlock: 24, group1Blocks: 11, group1DataCodewords: 12, group2Blocks: 5, group2DataCodewords: 13 },
  },
  // Version 15
  {
    L: { dataCodewords: 523, ecCodewordsPerBlock: 22, group1Blocks: 5, group1DataCodewords: 87, group2Blocks: 1, group2DataCodewords: 88 },
    M: { dataCodewords: 415, ecCodewordsPerBlock: 24, group1Blocks: 5, group1DataCodewords: 41, group2Blocks: 5, group2DataCodewords: 42 },
    Q: { dataCodewords: 295, ecCodewordsPerBlock: 30, group1Blocks: 5, group1DataCodewords: 24, group2Blocks: 7, group2DataCodewords: 25 },
    H: { dataCodewords: 223, ecCodewordsPerBlock: 24, group1Blocks: 11, group1DataCodewords: 12, group2Blocks: 7, group2DataCodewords: 13 },
  },
  // Version 16
  {
    L: { dataCodewords: 589, ecCodewordsPerBlock: 24, group1Blocks: 5, group1DataCodewords: 98, group2Blocks: 1, group2DataCodewords: 99 },
    M: { dataCodewords: 453, ecCodewordsPerBlock: 28, group1Blocks: 7, group1DataCodewords: 45, group2Blocks: 3, group2DataCodewords: 46 },
    Q: { dataCodewords: 325, ecCodewordsPerBlock: 24, group1Blocks: 15, group1DataCodewords: 19, group2Blocks: 2, group2DataCodewords: 20 },
    H: { dataCodewords: 253, ecCodewordsPerBlock: 30, group1Blocks: 3, group1DataCodewords: 15, group2Blocks: 13, group2DataCodewords: 16 },
  },
  // Version 17
  {
    L: { dataCodewords: 647, ecCodewordsPerBlock: 28, group1Blocks: 1, group1DataCodewords: 107, group2Blocks: 5, group2DataCodewords: 108 },
    M: { dataCodewords: 507, ecCodewordsPerBlock: 28, group1Blocks: 10, group1DataCodewords: 46, group2Blocks: 1, group2DataCodewords: 47 },
    Q: { dataCodewords: 367, ecCodewordsPerBlock: 28, group1Blocks: 1, group1DataCodewords: 22, group2Blocks: 15, group2DataCodewords: 23 },
    H: { dataCodewords: 283, ecCodewordsPerBlock: 28, group1Blocks: 2, group1DataCodewords: 14, group2Blocks: 17, group2DataCodewords: 15 },
  },
  // Version 18
  {
    L: { dataCodewords: 721, ecCodewordsPerBlock: 30, group1Blocks: 5, group1DataCodewords: 120, group2Blocks: 1, group2DataCodewords: 121 },
    M: { dataCodewords: 563, ecCodewordsPerBlock: 26, group1Blocks: 9, group1DataCodewords: 43, group2Blocks: 4, group2DataCodewords: 44 },
    Q: { dataCodewords: 397, ecCodewordsPerBlock: 28, group1Blocks: 17, group1DataCodewords: 22, group2Blocks: 1, group2DataCodewords: 23 },
    H: { dataCodewords: 313, ecCodewordsPerBlock: 28, group1Blocks: 2, group1DataCodewords: 14, group2Blocks: 19, group2DataCodewords: 15 },
  },
  // Version 19
  {
    L: { dataCodewords: 795, ecCodewordsPerBlock: 28, group1Blocks: 3, group1DataCodewords: 113, group2Blocks: 4, group2DataCodewords: 114 },
    M: { dataCodewords: 627, ecCodewordsPerBlock: 26, group1Blocks: 3, group1DataCodewords: 44, group2Blocks: 11, group2DataCodewords: 45 },
    Q: { dataCodewords: 445, ecCodewordsPerBlock: 26, group1Blocks: 17, group1DataCodewords: 21, group2Blocks: 4, group2DataCodewords: 22 },
    H: { dataCodewords: 341, ecCodewordsPerBlock: 26, group1Blocks: 9, group1DataCodewords: 13, group2Blocks: 16, group2DataCodewords: 14 },
  },
  // Version 20
  {
    L: { dataCodewords: 861, ecCodewordsPerBlock: 28, group1Blocks: 3, group1DataCodewords: 107, group2Blocks: 5, group2DataCodewords: 108 },
    M: { dataCodewords: 669, ecCodewordsPerBlock: 26, group1Blocks: 3, group1DataCodewords: 41, group2Blocks: 13, group2DataCodewords: 42 },
    Q: { dataCodewords: 485, ecCodewordsPerBlock: 30, group1Blocks: 15, group1DataCodewords: 24, group2Blocks: 5, group2DataCodewords: 25 },
    H: { dataCodewords: 385, ecCodewordsPerBlock: 28, group1Blocks: 15, group1DataCodewords: 15, group2Blocks: 10, group2DataCodewords: 16 },
  },
  // Version 21
  {
    L: { dataCodewords: 932, ecCodewordsPerBlock: 28, group1Blocks: 4, group1DataCodewords: 116, group2Blocks: 4, group2DataCodewords: 117 },
    M: { dataCodewords: 714, ecCodewordsPerBlock: 26, group1Blocks: 17, group1DataCodewords: 42, group2Blocks: 0, group2DataCodewords: 0 },
    Q: { dataCodewords: 512, ecCodewordsPerBlock: 28, group1Blocks: 17, group1DataCodewords: 22, group2Blocks: 6, group2DataCodewords: 23 },
    H: { dataCodewords: 406, ecCodewordsPerBlock: 30, group1Blocks: 19, group1DataCodewords: 16, group2Blocks: 6, group2DataCodewords: 17 },
  },
  // Version 22
  {
    L: { dataCodewords: 1006, ecCodewordsPerBlock: 28, group1Blocks: 2, group1DataCodewords: 111, group2Blocks: 7, group2DataCodewords: 112 },
    M: { dataCodewords: 782, ecCodewordsPerBlock: 28, group1Blocks: 17, group1DataCodewords: 46, group2Blocks: 0, group2DataCodewords: 0 },
    Q: { dataCodewords: 568, ecCodewordsPerBlock: 30, group1Blocks: 7, group1DataCodewords: 24, group2Blocks: 16, group2DataCodewords: 25 },
    H: { dataCodewords: 442, ecCodewordsPerBlock: 24, group1Blocks: 34, group1DataCodewords: 13, group2Blocks: 0, group2DataCodewords: 0 },
  },
  // Version 23
  {
    L: { dataCodewords: 1094, ecCodewordsPerBlock: 30, group1Blocks: 4, group1DataCodewords: 121, group2Blocks: 5, group2DataCodewords: 122 },
    M: { dataCodewords: 860, ecCodewordsPerBlock: 28, group1Blocks: 4, group1DataCodewords: 47, group2Blocks: 14, group2DataCodewords: 48 },
    Q: { dataCodewords: 614, ecCodewordsPerBlock: 30, group1Blocks: 11, group1DataCodewords: 24, group2Blocks: 14, group2DataCodewords: 25 },
    H: { dataCodewords: 464, ecCodewordsPerBlock: 30, group1Blocks: 16, group1DataCodewords: 15, group2Blocks: 14, group2DataCodewords: 16 },
  },
  // Version 24
  {
    L: { dataCodewords: 1174, ecCodewordsPerBlock: 30, group1Blocks: 6, group1DataCodewords: 117, group2Blocks: 4, group2DataCodewords: 118 },
    M: { dataCodewords: 914, ecCodewordsPerBlock: 28, group1Blocks: 6, group1DataCodewords: 45, group2Blocks: 14, group2DataCodewords: 46 },
    Q: { dataCodewords: 664, ecCodewordsPerBlock: 30, group1Blocks: 11, group1DataCodewords: 24, group2Blocks: 16, group2DataCodewords: 25 },
    H: { dataCodewords: 514, ecCodewordsPerBlock: 30, group1Blocks: 30, group1DataCodewords: 16, group2Blocks: 2, group2DataCodewords: 17 },
  },
  // Version 25
  {
    L: { dataCodewords: 1276, ecCodewordsPerBlock: 26, group1Blocks: 8, group1DataCodewords: 106, group2Blocks: 4, group2DataCodewords: 107 },
    M: { dataCodewords: 1000, ecCodewordsPerBlock: 28, group1Blocks: 8, group1DataCodewords: 47, group2Blocks: 13, group2DataCodewords: 48 },
    Q: { dataCodewords: 718, ecCodewordsPerBlock: 30, group1Blocks: 7, group1DataCodewords: 24, group2Blocks: 22, group2DataCodewords: 25 },
    H: { dataCodewords: 538, ecCodewordsPerBlock: 30, group1Blocks: 22, group1DataCodewords: 15, group2Blocks: 13, group2DataCodewords: 16 },
  },
  // Version 26
  {
    L: { dataCodewords: 1370, ecCodewordsPerBlock: 28, group1Blocks: 10, group1DataCodewords: 114, group2Blocks: 2, group2DataCodewords: 115 },
    M: { dataCodewords: 1062, ecCodewordsPerBlock: 28, group1Blocks: 19, group1DataCodewords: 46, group2Blocks: 4, group2DataCodewords: 47 },
    Q: { dataCodewords: 754, ecCodewordsPerBlock: 28, group1Blocks: 28, group1DataCodewords: 22, group2Blocks: 6, group2DataCodewords: 23 },
    H: { dataCodewords: 596, ecCodewordsPerBlock: 30, group1Blocks: 33, group1DataCodewords: 16, group2Blocks: 4, group2DataCodewords: 17 },
  },
  // Version 27
  {
    L: { dataCodewords: 1468, ecCodewordsPerBlock: 30, group1Blocks: 8, group1DataCodewords: 122, group2Blocks: 4, group2DataCodewords: 123 },
    M: { dataCodewords: 1128, ecCodewordsPerBlock: 28, group1Blocks: 22, group1DataCodewords: 45, group2Blocks: 3, group2DataCodewords: 46 },
    Q: { dataCodewords: 808, ecCodewordsPerBlock: 30, group1Blocks: 8, group1DataCodewords: 23, group2Blocks: 26, group2DataCodewords: 24 },
    H: { dataCodewords: 628, ecCodewordsPerBlock: 30, group1Blocks: 12, group1DataCodewords: 15, group2Blocks: 28, group2DataCodewords: 16 },
  },
  // Version 28
  {
    L: { dataCodewords: 1531, ecCodewordsPerBlock: 30, group1Blocks: 3, group1DataCodewords: 117, group2Blocks: 10, group2DataCodewords: 118 },
    M: { dataCodewords: 1193, ecCodewordsPerBlock: 28, group1Blocks: 3, group1DataCodewords: 45, group2Blocks: 23, group2DataCodewords: 46 },
    Q: { dataCodewords: 871, ecCodewordsPerBlock: 30, group1Blocks: 4, group1DataCodewords: 24, group2Blocks: 31, group2DataCodewords: 25 },
    H: { dataCodewords: 661, ecCodewordsPerBlock: 30, group1Blocks: 11, group1DataCodewords: 15, group2Blocks: 31, group2DataCodewords: 16 },
  },
  // Version 29
  {
    L: { dataCodewords: 1631, ecCodewordsPerBlock: 30, group1Blocks: 7, group1DataCodewords: 116, group2Blocks: 7, group2DataCodewords: 117 },
    M: { dataCodewords: 1267, ecCodewordsPerBlock: 28, group1Blocks: 21, group1DataCodewords: 45, group2Blocks: 7, group2DataCodewords: 46 },
    Q: { dataCodewords: 911, ecCodewordsPerBlock: 30, group1Blocks: 1, group1DataCodewords: 23, group2Blocks: 37, group2DataCodewords: 24 },
    H: { dataCodewords: 701, ecCodewordsPerBlock: 30, group1Blocks: 19, group1DataCodewords: 15, group2Blocks: 26, group2DataCodewords: 16 },
  },
  // Version 30
  {
    L: { dataCodewords: 1735, ecCodewordsPerBlock: 30, group1Blocks: 5, group1DataCodewords: 115, group2Blocks: 10, group2DataCodewords: 116 },
    M: { dataCodewords: 1373, ecCodewordsPerBlock: 28, group1Blocks: 19, group1DataCodewords: 47, group2Blocks: 10, group2DataCodewords: 48 },
    Q: { dataCodewords: 985, ecCodewordsPerBlock: 30, group1Blocks: 15, group1DataCodewords: 24, group2Blocks: 25, group2DataCodewords: 25 },
    H: { dataCodewords: 745, ecCodewordsPerBlock: 30, group1Blocks: 23, group1DataCodewords: 15, group2Blocks: 25, group2DataCodewords: 16 },
  },
  // Version 31
  {
    L: { dataCodewords: 1843, ecCodewordsPerBlock: 30, group1Blocks: 13, group1DataCodewords: 115, group2Blocks: 3, group2DataCodewords: 116 },
    M: { dataCodewords: 1455, ecCodewordsPerBlock: 28, group1Blocks: 2, group1DataCodewords: 46, group2Blocks: 29, group2DataCodewords: 47 },
    Q: { dataCodewords: 1033, ecCodewordsPerBlock: 30, group1Blocks: 42, group1DataCodewords: 24, group2Blocks: 1, group2DataCodewords: 25 },
    H: { dataCodewords: 793, ecCodewordsPerBlock: 30, group1Blocks: 23, group1DataCodewords: 15, group2Blocks: 28, group2DataCodewords: 16 },
  },
  // Version 32
  {
    L: { dataCodewords: 1955, ecCodewordsPerBlock: 30, group1Blocks: 17, group1DataCodewords: 115, group2Blocks: 0, group2DataCodewords: 0 },
    M: { dataCodewords: 1541, ecCodewordsPerBlock: 28, group1Blocks: 10, group1DataCodewords: 46, group2Blocks: 23, group2DataCodewords: 47 },
    Q: { dataCodewords: 1115, ecCodewordsPerBlock: 30, group1Blocks: 10, group1DataCodewords: 24, group2Blocks: 35, group2DataCodewords: 25 },
    H: { dataCodewords: 845, ecCodewordsPerBlock: 30, group1Blocks: 19, group1DataCodewords: 15, group2Blocks: 35, group2DataCodewords: 16 },
  },
  // Version 33
  {
    L: { dataCodewords: 2071, ecCodewordsPerBlock: 30, group1Blocks: 17, group1DataCodewords: 115, group2Blocks: 1, group2DataCodewords: 116 },
    M: { dataCodewords: 1631, ecCodewordsPerBlock: 28, group1Blocks: 14, group1DataCodewords: 46, group2Blocks: 21, group2DataCodewords: 47 },
    Q: { dataCodewords: 1171, ecCodewordsPerBlock: 30, group1Blocks: 29, group1DataCodewords: 24, group2Blocks: 19, group2DataCodewords: 25 },
    H: { dataCodewords: 901, ecCodewordsPerBlock: 30, group1Blocks: 11, group1DataCodewords: 15, group2Blocks: 46, group2DataCodewords: 16 },
  },
  // Version 34
  {
    L: { dataCodewords: 2191, ecCodewordsPerBlock: 30, group1Blocks: 13, group1DataCodewords: 115, group2Blocks: 6, group2DataCodewords: 116 },
    M: { dataCodewords: 1725, ecCodewordsPerBlock: 28, group1Blocks: 14, group1DataCodewords: 46, group2Blocks: 23, group2DataCodewords: 47 },
    Q: { dataCodewords: 1231, ecCodewordsPerBlock: 30, group1Blocks: 44, group1DataCodewords: 24, group2Blocks: 7, group2DataCodewords: 25 },
    H: { dataCodewords: 961, ecCodewordsPerBlock: 30, group1Blocks: 59, group1DataCodewords: 16, group2Blocks: 1, group2DataCodewords: 17 },
  },
  // Version 35
  {
    L: { dataCodewords: 2306, ecCodewordsPerBlock: 30, group1Blocks: 12, group1DataCodewords: 121, group2Blocks: 7, group2DataCodewords: 122 },
    M: { dataCodewords: 1812, ecCodewordsPerBlock: 28, group1Blocks: 12, group1DataCodewords: 47, group2Blocks: 26, group2DataCodewords: 48 },
    Q: { dataCodewords: 1286, ecCodewordsPerBlock: 30, group1Blocks: 39, group1DataCodewords: 24, group2Blocks: 14, group2DataCodewords: 25 },
    H: { dataCodewords: 986, ecCodewordsPerBlock: 30, group1Blocks: 22, group1DataCodewords: 15, group2Blocks: 41, group2DataCodewords: 16 },
  },
  // Version 36
  {
    L: { dataCodewords: 2434, ecCodewordsPerBlock: 30, group1Blocks: 6, group1DataCodewords: 121, group2Blocks: 14, group2DataCodewords: 122 },
    M: { dataCodewords: 1914, ecCodewordsPerBlock: 28, group1Blocks: 6, group1DataCodewords: 47, group2Blocks: 34, group2DataCodewords: 48 },
    Q: { dataCodewords: 1354, ecCodewordsPerBlock: 30, group1Blocks: 46, group1DataCodewords: 24, group2Blocks: 10, group2DataCodewords: 25 },
    H: { dataCodewords: 1054, ecCodewordsPerBlock: 30, group1Blocks: 2, group1DataCodewords: 15, group2Blocks: 64, group2DataCodewords: 16 },
  },
  // Version 37
  {
    L: { dataCodewords: 2566, ecCodewordsPerBlock: 30, group1Blocks: 17, group1DataCodewords: 122, group2Blocks: 4, group2DataCodewords: 123 },
    M: { dataCodewords: 1992, ecCodewordsPerBlock: 28, group1Blocks: 29, group1DataCodewords: 46, group2Blocks: 14, group2DataCodewords: 47 },
    Q: { dataCodewords: 1426, ecCodewordsPerBlock: 30, group1Blocks: 49, group1DataCodewords: 24, group2Blocks: 10, group2DataCodewords: 25 },
    H: { dataCodewords: 1096, ecCodewordsPerBlock: 30, group1Blocks: 24, group1DataCodewords: 15, group2Blocks: 46, group2DataCodewords: 16 },
  },
  // Version 38
  {
    L: { dataCodewords: 2702, ecCodewordsPerBlock: 30, group1Blocks: 4, group1DataCodewords: 122, group2Blocks: 18, group2DataCodewords: 123 },
    M: { dataCodewords: 2102, ecCodewordsPerBlock: 28, group1Blocks: 13, group1DataCodewords: 46, group2Blocks: 32, group2DataCodewords: 47 },
    Q: { dataCodewords: 1502, ecCodewordsPerBlock: 30, group1Blocks: 48, group1DataCodewords: 24, group2Blocks: 14, group2DataCodewords: 25 },
    H: { dataCodewords: 1142, ecCodewordsPerBlock: 30, group1Blocks: 42, group1DataCodewords: 15, group2Blocks: 32, group2DataCodewords: 16 },
  },
  // Version 39
  {
    L: { dataCodewords: 2812, ecCodewordsPerBlock: 30, group1Blocks: 20, group1DataCodewords: 117, group2Blocks: 4, group2DataCodewords: 118 },
    M: { dataCodewords: 2216, ecCodewordsPerBlock: 28, group1Blocks: 40, group1DataCodewords: 47, group2Blocks: 7, group2DataCodewords: 48 },
    Q: { dataCodewords: 1582, ecCodewordsPerBlock: 30, group1Blocks: 43, group1DataCodewords: 24, group2Blocks: 22, group2DataCodewords: 25 },
    H: { dataCodewords: 1222, ecCodewordsPerBlock: 30, group1Blocks: 10, group1DataCodewords: 15, group2Blocks: 67, group2DataCodewords: 16 },
  },
  // Version 40
  {
    L: { dataCodewords: 2956, ecCodewordsPerBlock: 30, group1Blocks: 19, group1DataCodewords: 118, group2Blocks: 6, group2DataCodewords: 119 },
    M: { dataCodewords: 2334, ecCodewordsPerBlock: 28, group1Blocks: 18, group1DataCodewords: 47, group2Blocks: 31, group2DataCodewords: 48 },
    Q: { dataCodewords: 1666, ecCodewordsPerBlock: 30, group1Blocks: 34, group1DataCodewords: 24, group2Blocks: 34, group2DataCodewords: 25 },
    H: { dataCodewords: 1276, ecCodewordsPerBlock: 30, group1Blocks: 20, group1DataCodewords: 15, group2Blocks: 61, group2DataCodewords: 16 },
  },
];

/**
 * Alignment pattern center coordinates for each version (version 2+).
 * Version 1 has no alignment patterns.
 */
export const ALIGNMENT_PATTERNS: number[][] = [
  [],                           // V1 (none)
  [6, 18],                      // V2
  [6, 22],                      // V3
  [6, 26],                      // V4
  [6, 30],                      // V5
  [6, 34],                      // V6
  [6, 22, 38],                  // V7
  [6, 24, 42],                  // V8
  [6, 26, 46],                  // V9
  [6, 28, 50],                  // V10
  [6, 30, 54],                  // V11
  [6, 32, 58],                  // V12
  [6, 34, 62],                  // V13
  [6, 26, 46, 66],              // V14
  [6, 26, 48, 70],              // V15
  [6, 26, 50, 74],              // V16
  [6, 30, 54, 78],              // V17
  [6, 30, 56, 82],              // V18
  [6, 30, 58, 86],              // V19
  [6, 34, 62, 90],              // V20
  [6, 28, 50, 72, 94],          // V21
  [6, 26, 50, 74, 98],          // V22
  [6, 30, 54, 78, 102],         // V23
  [6, 28, 54, 80, 106],         // V24
  [6, 32, 58, 84, 110],         // V25
  [6, 30, 58, 86, 114],         // V26
  [6, 34, 62, 90, 118],         // V27
  [6, 26, 50, 74, 98, 122],     // V28
  [6, 30, 54, 78, 102, 126],    // V29
  [6, 26, 52, 78, 104, 130],    // V30
  [6, 30, 56, 82, 108, 134],    // V31
  [6, 34, 60, 86, 112, 138],    // V32
  [6, 30, 58, 86, 114, 142],    // V33
  [6, 34, 62, 90, 118, 146],    // V34
  [6, 30, 54, 78, 102, 126, 150], // V35
  [6, 24, 50, 76, 102, 128, 154], // V36
  [6, 28, 54, 80, 106, 132, 158], // V37
  [6, 32, 58, 84, 110, 136, 162], // V38
  [6, 26, 54, 82, 110, 138, 166], // V39
  [6, 30, 58, 86, 114, 142, 170], // V40
];

/**
 * Format information strings for each EC level and mask pattern.
 * 15 bits: 5 data bits + 10 error correction bits, XOR masked with 0x5412.
 */
const FORMAT_INFO_STRINGS: Record<ErrorCorrectionLevel, number[]> = {
  L: [
    0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976,
  ],
  M: [
    0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0,
  ],
  Q: [
    0x355f, 0x3068, 0x3f31, 0x3a06, 0x24b4, 0x2183, 0x2eda, 0x2bed,
  ],
  H: [
    0x1689, 0x13be, 0x1ce7, 0x19d0, 0x0762, 0x0255, 0x0d0c, 0x083b,
  ],
};

export function getFormatInfo(ecLevel: ErrorCorrectionLevel, maskPattern: number): number {
  return FORMAT_INFO_STRINGS[ecLevel]![maskPattern]!;
}

/**
 * Version information for versions 7-40.
 * 18 bits: 6 data bits + 12 error correction bits.
 */
const VERSION_INFO: number[] = [
  // Versions 7-40
  0x07c94, 0x085bc, 0x09a99, 0x0a4d3, 0x0bbf6, 0x0c762, 0x0d847, 0x0e60d,
  0x0f928, 0x10b78, 0x1145d, 0x12a17, 0x13532, 0x149a6, 0x15683, 0x168c9,
  0x177ec, 0x18ec4, 0x191e1, 0x1afab, 0x1b08e, 0x1cc1a, 0x1d33f, 0x1ed75,
  0x1f250, 0x209d5, 0x216f0, 0x228ba, 0x2379f, 0x24b0b, 0x2542e, 0x26a64,
  0x27541, 0x28c69,
];

export function getVersionInfo(version: number): number | null {
  if (version < 7) return null;
  return VERSION_INFO[version - 7] ?? null;
}
