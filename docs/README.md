# Devices

Custom / overridden external converters for zigbee2mqtt.

| Device | File | Description |
| --- | --- | --- |
| [SDM01](SDM01.md) | [`devices/TZE204_ugekduaj.js`](../devices/TZE204_ugekduaj.js) | 3-phase Tuya/Nous energy meter (upstream override — silences DP 6/7/8 spam) |
| [Tervix Pro Line Thermostat](Tervix-Pro-Line-Thermostat.md) | [`devices/TZE200_6kijc7nd.js`](../devices/TZE200_6kijc7nd.js) | Tervix Zigbee thermostat for underfloor heating / radiator (Tuya TS0601) |

## How to install

In `configuration.yaml` of zigbee2mqtt:

```yaml
external_converters:
  - devices/TZE204_ugekduaj.js
  - devices/TZE200_6kijc7nd.js
```

After modifying a converter file — `Restart Zigbee2MQTT` (full restart, not reload). If the device was already paired before the converter was added, you usually don't need to re-pair — `Reconfigure` is enough.
