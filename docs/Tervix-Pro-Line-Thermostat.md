# Tervix Pro Line ZigBee Thermostat

- **Source:** [`devices/TZE200_6kijc7nd.js`](../devices/TZE200_6kijc7nd.js)
- **Model ID:** `TS0601_tervix_pro_line`
- **Vendor:** Tervix
- **Zigbee model:** `TS0601`
- **Use case:** thermostat for underfloor heating / radiator (Tuya TS0601-based)

## Fingerprint

| modelID | manufacturerName |
| --- | --- |
| `TS0601` | `_TZE200_6kijc7nd` |

## Configuration

Uses `tuya.modernExtend.tuyaBase` with these flags:

- `dp: true` — standard Tuya-DP wiring (`fz/tz.datapoints`, `configureMagicPacket`).
- `timeStart: '2000'` — reply to `commandMcuSyncTime` with the correct time. Without this flag `tuyaBase` only sends a ZCL `defaultResponse`, and the thermostat MCU keeps retrying its time request — loading NPI/UART.
- `forceTimeUpdates: true` — proactively re-sync the clock once an hour. Tervix Pro Line clocks drift noticeably.

## Exposes

### Climate

| Expose | Range / Values | Description |
| --- | --- | --- |
| `current_heating_setpoint` | 5…95 °C, step 0.5 | Setpoint |
| `local_temperature` | (read-only) | Current temperature |
| `system_mode` | `off`, `heat` | DP 1 |
| `preset` | `manual`, `program` | DP 2 |
| `running_state` | `idle`, `heat` | DP 3 (read-only) |
| `local_temperature_calibration` | -9…+9 °C, step 1 | Temperature correction |

### Window / protection

| Expose | Type | Description |
| --- | --- | --- |
| `window_detection` | binary | Enable open-window detection (DP 8) |
| `window_state` | binary (read-only) | Window state (DP 25) |
| `frost_protection` | binary | Frost protection (DP 10) |
| `open_window_time` | 0…60 min | Trigger duration (DP 104) |
| `open_window_temp` | 0…30 °C, step 0.5 | Temperature threshold (DP 105) |
| `open_window_delay_time` | 0…60 min | Delay (DP 106) |

### Control & limits

| Expose | Range | Description |
| --- | --- | --- |
| `child_lock` | binary | Button lock (DP 40) |
| `temperature_ceiling` | 35…95 °C, step 0.5 | Setpoint ceiling (DP 19) |
| `running_mode` | `heat` / `cool` | Operating mode (DP 58) |
| `factory_reset` | binary (SET) | Factory reset (DP 39, set true to trigger) |
| `switch_sensitivity` | 0…100 | Switching sensitivity (DP 101) |

### Humidity

| Expose | Range | Description |
| --- | --- | --- |
| `humidity` | % (read-only) | Current humidity (DP 34) |
| `humidity_control` | binary | Humidity control on/off (DP 107) |
| `upper_humidity_limit` | 0…100 % | Upper limit (DP 108) |

### Sensor & floor

| Expose | Range / Values | Description |
| --- | --- | --- |
| `sensor_selection` | `internal`, `external`, `both` | Sensor selection (DP 43) |
| `floor_max_temperature` | 5…60 °C, step 0.5 | Floor over-temperature protection (DP 102) |
| `floor_min_temperature` | 10…30 °C, step 0.5 | Floor lower limit (DP 103) |

### Schedule (`program`, DP 48)

A composite expose. Format: **5 + 1 + 1** (weekdays / Saturday / Sunday), 4 periods per day. Each period has three fields:

- `<day>_p<n>_hour` (0…23)
- `<day>_p<n>_minute` (0…59)
- `<day>_p<n>_temperature` (5…35 °C, step 0.5)

Where `<day>` ∈ `{weekdays, saturday, sunday}`, `<n>` ∈ `{1, 2, 3, 4}`.

**Binary format (48 bytes = 3 × 16):**

Each of the three 16-byte blocks (weekdays / Sat / Sun) holds 4 periods of 4 bytes each:

```
[hour:1][minute:1][temperature × 10:2 BE]
```

**Example** (the device's defaults):

| Day | Period 1 | Period 2 | Period 3 | Period 4 |
| --- | --- | --- | --- | --- |
| Weekdays | 06:30 / 21.0 °C | 08:00 / 18.0 °C | 18:00 / 21.0 °C | 22:30 / 16.0 °C |
| Saturday | 06:30 / 21.0 °C | 08:00 / 18.0 °C | 18:00 / 21.0 °C | 23:30 / 16.0 °C |
| Sunday | 06:30 / 21.0 °C | 08:00 / 18.0 °C | 18:00 / 21.0 °C | 23:00 / 16.0 °C |

Raw byte sequence for the example above:

```
6,30,0,210, 8,0,0,180, 18,0,0,210, 22,30,0,160,
6,30,0,210, 8,0,0,180, 18,0,0,210, 23,30,0,160,
6,30,0,210, 8,0,0,180, 18,0,0,210, 23,0,0,160
```

> Hours and minutes are clamped to `[0..23]` / `[0..59]`; temperature is clamped to `[0, 0xFFFF]` after multiplying by 10. Missing fields default to zero.

## Tuya datapoints

| DP | Name | Type | Converter |
| --- | --- | --- | --- |
| 1 | `system_mode` | bool | lookup `{off:false, heat:true}` |
| 2 | `preset` | enum | lookup `{manual:0, program:1}` |
| 3 | `running_state` | enum | lookup `{idle:0, heat:1}` |
| 8 | `window_detection` | bool | `onOff` |
| 10 | `frost_protection` | bool | `onOff` |
| 16 | `current_heating_setpoint` | int (0.1°C) | `divideBy10` |
| 19 | `temperature_ceiling` | int (0.1°C) | `divideBy10` |
| 24 | `local_temperature` | int (0.1°C) | `divideBy10` |
| 25 | `window_state` | bool | `onOff` |
| 27 | `local_temperature_calibration` | int (1°C) | `raw` |
| 34 | `humidity` | int (%) | `raw` |
| 39 | `factory_reset` | bool | `onOff` |
| 40 | `child_lock` | bool | `onOff` |
| 43 | `sensor_selection` | enum | lookup `{internal:0, external:1, both:2}` |
| 48 | `program` | raw (48 B) | custom (5+1+1, see above) |
| 58 | `running_mode` | enum | lookup `{heat:0, cool:1}` |
| 101 | `switch_sensitivity` | int | `raw` |
| 102 | `floor_max_temperature` | int (0.1°C) | `divideBy10` |
| 103 | `floor_min_temperature` | int (0.1°C) | `divideBy10` |
| 104 | `open_window_time` | int (min) | `raw` |
| 105 | `open_window_temp` | int (0.1°C) | `divideBy10` |
| 106 | `open_window_delay_time` | int (min) | `raw` |
| 107 | `humidity_control` | bool | `onOff` |
| 108 | `upper_humidity_limit` | int (%) | `raw` |
| 61 | (week program periods, unused) | — | — |

## Notes

- `local_temperature_calibration` (DP 27) on this MCU has step **1 °C**, not 0.1.
- `factory_reset` (DP 39) is a set-only trigger; the device resets automatically on receiving `true`.
- `system_mode` is mapped as a bool (`off:false / heat:true`), not as an enum — at the DP level it's a `bool`.
- `running_state` (DP 3) is read-only — it's a heating status, not a mode.
- DP 61 (`week program periods`) is present on the device but unused by the current converter.
