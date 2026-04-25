# SDM01 — 3-phase energy meter

- **Source:** [`devices/TZE204_ugekduaj.js`](../devices/TZE204_ugekduaj.js)
- **Model ID:** `SDM01`
- **Vendor:** Tuya (white-label: **Nous D4Z**)
- **Zigbee model:** `TS0601`
- **Zigbee-herdsman-converters baseline:** `25.113.x`

## Fingerprints

| manufacturerName | Notes |
| --- | --- |
| `_TZE204_ugekduaj` | Tuya |
| `_TZE200_ugekduaj` | Tuya |
| `_TZE204_loejka0i` | Nous D4Z |
| `_TZE284_loejka0i` | Nous D4Z |

## Why the override

The device sends per-phase data **twice**:

1. **Packed** via `DP 6 / 7 / 8` — 8 bytes per phase: `V[2B BE]/10` + `I[3B BE]/1000` + `P[3B BE]`.
2. **Unpacked** via `DP 102…110` — one parameter per DP.

Upstream only decodes (2). Every few seconds it logs:

```
Datapoint 6 not defined for '_TZE204_ugekduaj' …
```

…and sends a `defaultRsp`. That's noise and extra air load.

In this converter DP 6/7/8 are wired to "silent stubs" (`from: () => ({})`) — the data duplicates DP 102/105/108 (V), 103/106/109 (I), 104/107/110 (P), so we return an empty object to avoid publishing duplicates to MQTT.

> **Alternative:** switch to DP 6/7/8 as the sole source (3 frames instead of 9 — saves air time). The MCU sends both sets either way, so the switch only affects parsing in z2m, not radio load.

## Exposes

### Per-phase (a / b / c)

| Expose | Unit | Source |
| --- | --- | --- |
| `voltage_<phase>` | V | DP 102 / 105 / 108 |
| `current_<phase>` | A | DP 103 / 106 / 109 |
| `power_<phase>` | W | DP 104 / 107 / 110 |
| `energy_<phase>` | kWh | DP 112 / 114 / 116 |
| `energy_produced_<phase>` | kWh | DP 113 / 115 / 117 |
| `power_factor_<phase>` | — | DP 118 / 119 / 120 |

### Total

| Expose | Unit | Description |
| --- | --- | --- |
| `energy` | kWh | Total forward active energy (DP 1) |
| `produced_energy` | kWh | Total reverse active energy (DP 2) |
| `power_factor` | % | Total power factor (DP 15) |
| `power` | W | Total active power (DP 111) |
| `ac_frequency` | Hz | DP 101 |

### Settings

| Expose | Type | Range | Description |
| --- | --- | --- | --- |
| `data_report_duration` | numeric (SET) | 30…3600 | Reporting period in seconds (DP 18) |

## Tuya datapoints

| DP | Name | Converter |
| --- | --- | --- |
| 1 | `energy` | `divideBy100` |
| 2 | `produced_energy` | `divideBy100` |
| 6 | — (silent stub, phase A) | stub |
| 7 | — (silent stub, phase B) | stub |
| 8 | — (silent stub, phase C) | stub |
| 15 | `power_factor` | `raw` |
| 18 | `data_report_duration` | custom (see below) |
| 101 | `ac_frequency` | `divideBy100` |
| 102 | `voltage_a` | `divideBy10` |
| 103 | `current_a` | `divideBy1000` |
| 104 | `power_a` | `raw` |
| 105 | `voltage_b` | `divideBy10` |
| 106 | `current_b` | `divideBy1000` |
| 107 | `power_b` | `raw` |
| 108 | `voltage_c` | `divideBy10` |
| 109 | `current_c` | `divideBy1000` |
| 110 | `power_c` | `raw` |
| 111 | `power` | `raw` |
| 112 | `energy_a` | `divideBy100` |
| 113 | `energy_produced_a` | `divideBy100` |
| 114 | `energy_b` | `divideBy100` |
| 115 | `energy_produced_b` | `divideBy100` |
| 116 | `energy_c` | `divideBy100` |
| 117 | `energy_produced_c` | `divideBy100` |
| 118 | `power_factor_a` | `raw` |
| 119 | `power_factor_b` | `raw` |
| 120 | `power_factor_c` | `raw` |

### DP 6 / 7 / 8 — packed per-phase frame

Each DP carries **8 bytes**: `V[2B] + I[3B] + P[3B]`, all fields **big-endian**.

| Offset | Length | Field | Scale | Unit |
| --- | --- | --- | --- | --- |
| 0 | 2 | Voltage | ×0.1 | V |
| 2 | 3 | Current | ×0.001 | A |
| 5 | 3 | Power | ×1 | W |

| DP | Phase |
| --- | --- |
| 6 | A |
| 7 | B |
| 8 | C |

**Example** — a real frame from phase A (DP 6):

```
08 E5  00 24 2E  00 07 AE
└─V─┘  └──I───┘  └──P───┘
```

All three values are read big-endian within their own field (the high byte of `I` and `P` in this example is `0x00` because the values fit in 2 bytes):

| Hex | Decimal | Scaled |
| --- | --- | --- |
| `0x08E5` | 2277 | **227.7 V** |
| `0x00242E` | 9262 | **9.262 A** |
| `0x0007AE` | 1966 | **1966 W** |

In the same interval the unpacked set (DP 102 / 103 / 104) delivers the same `voltage_a` / `current_a` / `power_a` — so DP 6 is muted by `silentStub` in the current converter to avoid duplicating data in MQTT.

### DP 18 — `data_report_duration`

Written not as a "bare" number, but as a struct of 8 `id/type/data` triplets (Tuya-specific format). The period (`v`, in seconds) is multiplied by 2 and packed into the DP with id `0x08`:

```
01 01 00 3c
02 00 00 0a
03 01 00 fd
04 00 00 b4
05 01 00 00
07 01 00 00
08 01 <hi> <lo>   ← period * 2, big-endian
09 00 00 00
```

The value is clamped to `[30, 3600]` before writing.

## Notes

- Energy (DP 1, 2, 112…117) — scale `/100`.
- Current (DP 103, 106, 109) — scale `/1000` (milliamps).
- Power (DP 104, 107, 110, 111) — `raw`, integer watts.
- Voltage (DP 102, 105, 108) — scale `/10` (tenths of a volt).
- Frequency (DP 101) — scale `/100`.
