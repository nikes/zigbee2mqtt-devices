// Override of the upstream SDM01 definition (zigbee-herdsman-converters/src/devices/tuya.ts).
//
// Why: device `_TZE204_ugekduaj` (Tuya/Nous 3-phase energy meter) sends
// per-phase data TWICE:
//   1) Packed via DP 6 / 7 / 8 (8 bytes per phase: V[2B] + I[3B] + P[3B]).
//   2) Unpacked via DP 102…110 (one parameter per DP).
//
// Upstream only decodes (2) and floods the log with
// `Datapoint 6 not defined for '_TZE204_ugekduaj' …` — for all three phases
// every few seconds. That's noise plus redundant defaultRsp's.
//
// This override adds parsers for DP 6/7/8 as "silent stubs" — the data
// duplicates DP 102/105/108 (V), 103/106/109 (I), 104/107/110 (P), so we
// return an empty object to avoid publishing duplicates to MQTT.
//
// If you ever want to switch to DP 6/7/8 as the sole source (cheaper on
// the air: 3 frames instead of 9) — uncomment the "Alternative" block and
// remove DP 102…110 from tuyaDatapoints. Note: the MCU sends both sets
// either way, so the switch only affects parsing in z2m, not radio load.
//
// All other exposes / DPs are copied 1-to-1 from the upstream definition,
// version zigbee-herdsman-converters@25.113.x.

const exposes = require('zigbee-herdsman-converters/lib/exposes');
const tuya = require('zigbee-herdsman-converters/lib/tuya');
const e = exposes.presets;
const ea = exposes.access;

// DP 6 / 7 / 8 — packed per-phase frame, 8 bytes, all big-endian:
//   [V:2B BE] [I:3B BE] [P:3B BE]
//     V × 0.1 V    I × 0.001 A    P × 1 W
//
// DP 6 → phase A, DP 7 → phase B, DP 8 → phase C.
//
// Example (phase A): 08 E5  00 24 2E  00 07 AE
//                    └─V─┘  └──I───┘  └──P───┘
//   0x08E5   = 2277  → 227.7 V
//   0x00242E = 9262  → 9.262 A
//   0x0007AE = 1966  → 1966 W
//
// The high bytes of I and P are 0x00 in this example — the fields are
// 3 bytes wide, but the values here fit in 2 bytes.
//
// The same values arrive in parallel via DP 102/103/104 (A),
// 105/106/107 (B), 108/109/110 (C). To avoid publishing duplicates to
// MQTT and to suppress "Datapoint X not defined" warnings — we wire a
// silent stub: it publishes nothing but consumes the frame from upstream.
const silentStub = {
  from: () => ({}),
};

const definition = {
  fingerprint: tuya.fingerprint('TS0601', [
    '_TZE204_ugekduaj',
    '_TZE200_ugekduaj',
    '_TZE204_loejka0i',
    '_TZE284_loejka0i',
  ]),
  model: 'SDM01',
  vendor: 'Tuya',
  description: 'Smart energy monitor for 3P+N system (override: silenced DP 6/7/8)',
  extend: [tuya.modernExtend.tuyaBase({dp: true})],
  whiteLabel: [
    tuya.whitelabel('Nous', 'D4Z', 'Smart energy monitor for 3P+N system', [
      '_TZE204_loejka0i',
      '_TZE284_loejka0i',
    ]),
  ],
  exposes: [
    tuya.exposes.voltageWithPhase('a'),
    tuya.exposes.voltageWithPhase('b'),
    tuya.exposes.voltageWithPhase('c'),
    tuya.exposes.powerWithPhase('a'),
    tuya.exposes.powerWithPhase('b'),
    tuya.exposes.powerWithPhase('c'),
    tuya.exposes.currentWithPhase('a'),
    tuya.exposes.currentWithPhase('b'),
    tuya.exposes.currentWithPhase('c'),
    e.energy().withDescription('Total forward active energy'),
    e.produced_energy().withDescription('Total reverse active energy'),
    e.power_factor().withUnit('%').withDescription('Total power factor'),
    e.power().withDescription('Total active power'),
    e.ac_frequency(),
    e.numeric('data_report_duration', ea.SET).withValueMin(30).withValueMax(3600),
    tuya.exposes.energyWithPhase('a'),
    tuya.exposes.energyWithPhase('b'),
    tuya.exposes.energyWithPhase('c'),
    tuya.exposes.energyProducedWithPhase('a'),
    tuya.exposes.energyProducedWithPhase('b'),
    tuya.exposes.energyProducedWithPhase('c'),
    tuya.exposes.powerFactorWithPhase('a'),
    tuya.exposes.powerFactorWithPhase('b'),
    tuya.exposes.powerFactorWithPhase('c'),
  ],
  meta: {
    tuyaDatapoints: [
      [1, 'energy', tuya.valueConverter.divideBy100],
      [2, 'produced_energy', tuya.valueConverter.divideBy100],

      // ↓↓↓ stubs to suppress warnings — same data as in DP 102…110 ↓↓↓
      [6, null,  { from: () => ({}) }], // phase A: V[2B BE]/10 + I[3B BE]/1000 + P[3B BE]
      [7, null, silentStub], // phase B
      [8, null, silentStub], // phase C

      [15, 'power_factor', tuya.valueConverter.raw],
      [
        18,
        'data_report_duration',
        {
          to: (v) => {
            const value = Math.max(30, Math.min(3600, Math.round(v))) * 2;
            const byte1 = (value >> 8) & 0xff;
            const byte2 = value & 0xff;
            return [
              0x01, 0x01, 0x00, 0x3c,
              0x02, 0x00, 0x00, 0x0a,
              0x03, 0x01, 0x00, 0xfd,
              0x04, 0x00, 0x00, 0xb4,
              0x05, 0x01, 0x00, 0x00,
              0x07, 0x01, 0x00, 0x00,
              0x08, 0x01,
              byte1, byte2,
              0x09, 0x00, 0x00, 0x00,
            ];
          },
        },
      ],
      [101, 'ac_frequency', tuya.valueConverter.divideBy100],
      [102, 'voltage_a', tuya.valueConverter.divideBy10],
      [103, 'current_a', tuya.valueConverter.divideBy1000],
      [104, 'power_a', tuya.valueConverter.raw],
      [105, 'voltage_b', tuya.valueConverter.divideBy10],
      [106, 'current_b', tuya.valueConverter.divideBy1000],
      [107, 'power_b', tuya.valueConverter.raw],
      [108, 'voltage_c', tuya.valueConverter.divideBy10],
      [109, 'current_c', tuya.valueConverter.divideBy1000],
      [110, 'power_c', tuya.valueConverter.raw],
      [111, 'power', tuya.valueConverter.raw],
      [112, 'energy_a', tuya.valueConverter.divideBy100],
      [114, 'energy_b', tuya.valueConverter.divideBy100],
      [116, 'energy_c', tuya.valueConverter.divideBy100],
      [113, 'energy_produced_a', tuya.valueConverter.divideBy100],
      [115, 'energy_produced_b', tuya.valueConverter.divideBy100],
      [117, 'energy_produced_c', tuya.valueConverter.divideBy100],
      [118, 'power_factor_a', tuya.valueConverter.raw],
      [119, 'power_factor_b', tuya.valueConverter.raw],
      [120, 'power_factor_c', tuya.valueConverter.raw],
    ],
  },
};

module.exports = definition;
