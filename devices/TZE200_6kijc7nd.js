const exposes = require('zigbee-herdsman-converters/lib/exposes');
const tuya = require('zigbee-herdsman-converters/lib/tuya');
const e = exposes.presets;
const ea = exposes.access;

// https://semolex.online/post/writing-zha-quirks/
// https://gist.github.com/semolex/a490ffd892d8c440ce357d208afdde4e
// https://github.com/Koenkk/zigbee-herdsman-converters/issues/10149
// https://github.com/slacky1965/tuya_thermostat_zrd/issues/117
// https://github.com/JohanBendz/com.tuya.zigbee/issues/1124

const exposesLocal = {
  hour: (name) => e.numeric(name, ea.STATE_SET).withUnit('h').withValueMin(0).withValueMax(23),
  minute: (name) => e.numeric(name, ea.STATE_SET).withUnit('m').withValueMin(0).withValueMax(59),
  program_temperature: (name) => e.numeric(name, ea.STATE_SET).withUnit('°C').withValueMin(5).withValueMax(35).withValueStep(0.5),
};

// Tervix Pro Line weekly program (DP 48): 5 + 1 + 1 layout (weekdays / Saturday / Sunday),
// 4 periods per day, each period encoded as [hour:1][minute:1][temperature*10:2 BE].
// Total payload is 48 bytes (3 days x 4 periods x 4 bytes).
const tuyaTervixProgramConverter = {
  to: (v) => {
    const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
    const buildDay = (prefix) => {
      const buf = Buffer.alloc(16);
      for (let p = 1; p <= 4; p++) {
        const off = (p - 1) * 4;
        const hour = clamp(Number(v?.[`${prefix}_p${p}_hour`] ?? 0), 0, 23);
        const minute = clamp(Number(v?.[`${prefix}_p${p}_minute`] ?? 0), 0, 59);
        const temp = clamp(Math.round(Number(v?.[`${prefix}_p${p}_temperature`] ?? 0) * 10), 0, 0xffff);
        buf.writeUInt8(hour, off);
        buf.writeUInt8(minute, off + 1);
        buf.writeUInt16BE(temp, off + 2);
      }
      return buf;
    };
    return Buffer.concat([buildDay('weekdays'), buildDay('saturday'), buildDay('sunday')]);
  },
  from: (v) => {
    const parseDay = (prefix, buf16) => {
      const out = {};
      for (let p = 1; p <= 4; p++) {
        const off = (p - 1) * 4;
        out[`${prefix}_p${p}_hour`] = buf16.readUInt8(off);
        out[`${prefix}_p${p}_minute`] = buf16.readUInt8(off + 1);
        out[`${prefix}_p${p}_temperature`] = buf16.readUInt16BE(off + 2) / 10;
      }
      return out;
    };
    return {
      ...parseDay('weekdays', v.subarray(0, 16)),
      ...parseDay('saturday', v.subarray(16, 32)),
      ...parseDay('sunday', v.subarray(32, 48)),
    };
  },
};

const definition = {
  fingerprint: tuya.fingerprint('TS0601', ['_TZE200_6kijc7nd', '_TZE204_6kijc7nd', '_TZE284_6kijc7nd']),
  model: 'TS0601_thermostat_tervix_pro',
  vendor: 'Tervix',
  description: 'Pro Line Zigbee thermostat',
  extend: [tuya.modernExtend.tuyaBase({
    dp: true,
    timeStart: '1970',
    forceTimeUpdates: true,
  })],
  exposes: [
    e.climate()
      .withSetpoint('current_heating_setpoint', 5, 95, 0.5, ea.STATE_SET)
      .withLocalTemperature(ea.STATE)
      .withSystemMode(['off', 'heat'], ea.STATE_SET)
      .withRunningState(['idle', 'heat'], ea.STATE)
      .withPreset(['manual', 'program'])
      .withLocalTemperatureCalibration(-9, 9, 1, ea.STATE_SET),

    e.child_lock().withDescription('Enables or disables the child lock feature.'),

    e.temperature_sensor_select(['internal', 'external', 'both'])
      .withDescription('Selects between internal or external temperature sensors.'),

    // DP 8 window_detection
    e.binary('window_detection', ea.STATE_SET, 'ON', 'OFF')
      .withDescription('Checks whether the window is open or closed.'),
    // DP 25 window_state
    e.binary('window_state', ea.STATE, 'OPEN', 'CLOSE')
      .withDescription('Indicates whether the window is open or closed.'),

    // DP 10 frost_protection
    e.binary('frost_protection', ea.STATE_SET, 'ON', 'OFF')
      .withDescription('Enables frost protection mode.'),

    // DP 58 running_mode
    e.enum('running_mode', ea.STATE_SET, ['heat', 'cool'])
      .withDescription('Operation mode of the thermostat (heat or cool).'),

    // DP 19 temperature_ceiling
    e.numeric('temperature_ceiling', ea.STATE_SET)
      .withUnit('°C').withValueMin(35).withValueMax(95).withValueStep(0.5)
      .withDescription('Set the upper temperature limit'),

    // DP 34 humidity
    e.humidity().withDescription('Displays the current relative humidity level in percentage.'),

    // DP 107 humidity_control
    e.binary('humidity_control', ea.STATE_SET, 'ON', 'OFF')
      .withDescription('Controls the humidity protection feature.'),

    // DP 108 upper_humidity_limit
    e.numeric('upper_humidity_limit', ea.STATE_SET)
      .withUnit('%').withValueMin(0).withValueMax(100).withValueStep(1),

    // DP 48 program (5+1+1, 4 periods per day)
    e.composite('program', 'program', ea.STATE_SET)
      .withDescription('Time of day and setpoint to use when in program mode')
      .withFeature(exposesLocal.hour('weekdays_p1_hour'))
      .withFeature(exposesLocal.minute('weekdays_p1_minute'))
      .withFeature(exposesLocal.program_temperature('weekdays_p1_temperature'))
      .withFeature(exposesLocal.hour('weekdays_p2_hour'))
      .withFeature(exposesLocal.minute('weekdays_p2_minute'))
      .withFeature(exposesLocal.program_temperature('weekdays_p2_temperature'))
      .withFeature(exposesLocal.hour('weekdays_p3_hour'))
      .withFeature(exposesLocal.minute('weekdays_p3_minute'))
      .withFeature(exposesLocal.program_temperature('weekdays_p3_temperature'))
      .withFeature(exposesLocal.hour('weekdays_p4_hour'))
      .withFeature(exposesLocal.minute('weekdays_p4_minute'))
      .withFeature(exposesLocal.program_temperature('weekdays_p4_temperature'))
      .withFeature(exposesLocal.hour('saturday_p1_hour'))
      .withFeature(exposesLocal.minute('saturday_p1_minute'))
      .withFeature(exposesLocal.program_temperature('saturday_p1_temperature'))
      .withFeature(exposesLocal.hour('saturday_p2_hour'))
      .withFeature(exposesLocal.minute('saturday_p2_minute'))
      .withFeature(exposesLocal.program_temperature('saturday_p2_temperature'))
      .withFeature(exposesLocal.hour('saturday_p3_hour'))
      .withFeature(exposesLocal.minute('saturday_p3_minute'))
      .withFeature(exposesLocal.program_temperature('saturday_p3_temperature'))
      .withFeature(exposesLocal.hour('saturday_p4_hour'))
      .withFeature(exposesLocal.minute('saturday_p4_minute'))
      .withFeature(exposesLocal.program_temperature('saturday_p4_temperature'))
      .withFeature(exposesLocal.hour('sunday_p1_hour'))
      .withFeature(exposesLocal.minute('sunday_p1_minute'))
      .withFeature(exposesLocal.program_temperature('sunday_p1_temperature'))
      .withFeature(exposesLocal.hour('sunday_p2_hour'))
      .withFeature(exposesLocal.minute('sunday_p2_minute'))
      .withFeature(exposesLocal.program_temperature('sunday_p2_temperature'))
      .withFeature(exposesLocal.hour('sunday_p3_hour'))
      .withFeature(exposesLocal.minute('sunday_p3_minute'))
      .withFeature(exposesLocal.program_temperature('sunday_p3_temperature'))
      .withFeature(exposesLocal.hour('sunday_p4_hour'))
      .withFeature(exposesLocal.minute('sunday_p4_minute'))
      .withFeature(exposesLocal.program_temperature('sunday_p4_temperature')),

    // DP 101 switch_sensitivity (0..100)
    e.numeric('switch_sensitivity', ea.STATE_SET)
      .withValueMin(0).withValueMax(100).withValueStep(1)
      .withDescription('Temperature difference threshold to trigger switching.'),

    // DP 102 floor_max_temperature
    e.numeric('floor_max_temperature', ea.STATE_SET)
      .withUnit('°C').withValueMin(5).withValueMax(60).withValueStep(0.5)
      .withDescription('Maximum allowed floor temperature for protection.'),

    // DP 103 floor_min_temperature
    e.numeric('floor_min_temperature', ea.STATE_SET)
      .withUnit('°C').withValueMin(10).withValueMax(30).withValueStep(0.5)
      .withDescription('Minimum allowed floor temperature for protection.'),

    // DP 104 open_window_time
    e.numeric('open_window_time', ea.STATE_SET)
      .withUnit('min').withValueMin(0).withValueMax(60).withValueStep(1)
      .withDescription('Window open detection threshold in minutes.'),

    // DP 105 open_window_temp
    e.numeric('open_window_temp', ea.STATE_SET)
      .withUnit('°C').withValueMin(0).withValueMax(30).withValueStep(0.5)
      .withDescription('Temperature threshold for window open detection.'),

    // DP 106 open_window_delay_time
    e.numeric('open_window_delay_time', ea.STATE_SET)
      .withUnit('min').withValueMin(0).withValueMax(60).withValueStep(1)
      .withDescription('Delay time for triggering window open detection (minutes).'),

    // DP 39 factory_reset
    e.binary('factory_reset', ea.STATE_SET, 'ON', 'OFF')
      .withDescription('WARNING: Restores the device to factory settings. All configurations will be lost.'),
  ],
  meta: {
    tuyaDatapoints: [
      // DP 1 System mode (on/off) -> system_mode off/heat (Tuya bool DP)
      [1, 'system_mode', tuya.valueConverterBasic.lookup({ off: false, heat: true })],

      // DP 2 ProgramMode enum: 0=Manual, 1=Program -> climate preset
      [2, 'preset', tuya.valueConverterBasic.lookup({ manual: 0, program: 1 })],

      // DP 3 Working status -> climate running_state
      [3, 'running_state', tuya.valueConverterBasic.lookup({ idle: 0, heat: 1 })],

      // DP 8 Window check
      [8, 'window_detection', tuya.valueConverter.onOff],

      // DP 10 Frost protection
      [10, 'frost_protection', tuya.valueConverter.onOff],

      // DP 16 Set temperature: device 0.1°C -> Z2M °C
      [16, 'current_heating_setpoint', tuya.valueConverter.divideBy10],

      // DP 19 Temperature ceiling 0.1°C
      [19, 'temperature_ceiling', tuya.valueConverter.divideBy10],

      // DP 24 Current temperature 0.1°C
      [24, 'local_temperature', tuya.valueConverter.divideBy10],

      // DP 25 Window state
      [25, 'window_state', tuya.valueConverterBasic.lookup({ OPEN: 1, CLOSE: 0 })],

      // DP 27 Temperature correction (int, step 1°C) -> climate local_temperature_calibration
      [27, 'local_temperature_calibration', tuya.valueConverter.raw],

      // DP 34 Humidity display
      [34, 'humidity', tuya.valueConverter.raw],

      // DP 39 Factory reset
      [39, 'factory_reset', tuya.valueConverter.onOff],

      // DP 40 Child lock (LOCK/UNLOCK)
      [40, 'child_lock', tuya.valueConverter.lockUnlock],

      // DP 43 Sensor selection: 0 internal, 1 external, 2 both
      [43, 'sensor', tuya.valueConverterBasic.lookup({ internal: 0, external: 1, both: 2 })],

      // DP 48 Weekly program (5+1+1, 4 periods/day)
      [48, 'program', tuyaTervixProgramConverter],

      // DP 58 RunningMode: 0=Heat, 1=Cool
      [58, 'running_mode', tuya.valueConverterBasic.lookup({ heat: 0, cool: 1 })],

      // DP 101 Switch sensitivity (raw 0..100)
      [101, 'switch_sensitivity', tuya.valueConverter.raw],

      // DP 102 Floor max temp 0.1°C
      [102, 'floor_max_temperature', tuya.valueConverter.divideBy10],

      // DP 103 Floor min temp 0.1°C
      [103, 'floor_min_temperature', tuya.valueConverter.divideBy10],

      // DP 104 Open window time (min)
      [104, 'open_window_time', tuya.valueConverter.raw],

      // DP 105 Open window temp 0.1°C
      [105, 'open_window_temp', tuya.valueConverter.divideBy10],

      // DP 106 Open window delay time (min)
      [106, 'open_window_delay_time', tuya.valueConverter.raw],

      // DP 107 Humidity control
      [107, 'humidity_control', tuya.valueConverter.onOff],

      // DP 108 Upper humidity limit (%)
      [108, 'upper_humidity_limit', tuya.valueConverter.raw],
    ],
  },
};

module.exports = definition;
