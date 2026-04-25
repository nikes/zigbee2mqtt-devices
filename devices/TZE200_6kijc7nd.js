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

const definition = {
  fingerprint: [
    { modelID: 'TS0601', manufacturerName: '_TZE200_6kijc7nd' },
  ],
  model: 'TS0601_tervix_pro_line',
  vendor: 'Tervix',
  description: 'Tervix Pro Line Zigbee',
  extend: [tuya.modernExtend.tuyaBase({
    dp: true,
    timeStart: '2000',
    forceTimeUpdates: true,
  })],
  exposes: [
    // Climate
    e.climate()
      .withSetpoint('current_heating_setpoint', 5, 95, 0.5, ea.STATE_SET)
      .withLocalTemperature(ea.STATE)
      .withSystemMode(['off', 'heat'])
      // preset_mode: Manual/Program
      .withPreset(['manual', 'program'])
      .withLocalTemperatureCalibration(-9, 9, 1, ea.STATE_SET),

    // DP40 child_lock (switch)
    e.switch().withState('child_lock', true, false).withDescription('Child lock'),

    // DP8 window_detection (binary)
    e.binary('window_detection', ea.STATE, true, false).withDescription('Window detection enabled'),
    // DP25 window_state (binary)
    e.binary('window_state', ea.STATE, true, false).withDescription('Open window state'),

    // DP10 frost_protection (binary)
    e.binary('frost_protection', ea.STATE, true, false),

    // DP58 running_mode enum
    e.enum('running_mode', ea.STATE_SET, ['heat', 'cool']).withDescription('Running mode'),

    // DP19 temperature_ceiling number (°C, 0.1)
    e.numeric('temperature_ceiling', ea.STATE_SET)
      .withUnit('°C').withValueMin(35).withValueMax(95).withValueStep(0.5)
      .withDescription('Temperature ceiling'),

    // DP27 local_temperature_calibration (°C)
    e.numeric('local_temperature_calibration', ea.STATE_SET)
      .withUnit('°C').withValueMin(-9).withValueMax(9).withValueStep(1)
      .withDescription('Temperature correction'),

    // DP34 humidity (%)
    e.humidity(),

    // DP107 humidity_control (binary)
    e.binary('humidity_control', ea.STATE, true, false),

    // DP108 upper_humidity_limit (%)
    e.numeric('upper_humidity_limit', ea.STATE_SET)
      .withUnit('%').withValueMin(0).withValueMax(100).withValueStep(1),

    // DP43 sensor_selection enum
    e.enum('sensor_selection', ea.STATE_SET, ['internal', 'external', 'both'])
      .withDescription('Sensor selection'),

    // DP48 program
    e
      .composite('program', 'program', ea.STATE_SET)
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

    // DP101 switch_sensitivity (0..100)
    e.numeric('switch_sensitivity', ea.STATE_SET)
      .withValueMin(0).withValueMax(100).withValueStep(1),

    // DP102 floor_max_temperature (°C, 0.1)
    e.numeric('floor_max_temperature', ea.STATE_SET)
      .withUnit('°C').withValueMin(5).withValueMax(60).withValueStep(0.5)
      .withDescription('Floor maximum temperature protection'),

    // DP103 floor_min_temperature (°C, 0.1)
    e.numeric('floor_min_temperature', ea.STATE_SET)
      .withUnit('°C').withValueMin(10).withValueMax(30).withValueStep(0.5)
      .withDescription('Floor minimum temperature'),

    // DP104 open_window_time (min)
    e.numeric('open_window_time', ea.STATE_SET)
      .withUnit('min').withValueMin(0).withValueMax(60).withValueStep(1),

    // DP105 open_window_temp (°C, 0.1)
    e.numeric('open_window_temp', ea.STATE_SET)
      .withUnit('°C').withValueMin(0).withValueMax(30).withValueStep(0.5),

    // DP106 open_window_delay_time (min)
    e.numeric('open_window_delay_time', ea.STATE_SET)
      .withUnit('min').withValueMin(0).withValueMax(60).withValueStep(1),

    // DP39 factory_reset (binary "action-like")
    e.binary('factory_reset', ea.STATE_SET, true, false)
      .withDescription('Factory reset (set true to trigger)'),
  ],
  meta: {
    tuyaDatapoints: [
      // DP 1 System mode (on/off) -> system_mode off/heat
      [1, 'system_mode', tuya.valueConverterBasic.lookup({ off: false, heat: true })],

      // DP 2 ProgramMode enum: 0=Manual, 1=Program
      [2, 'preset', tuya.valueConverterBasic.lookup({ manual: 0, program: 1 })],

      // DP 3 Working status -> running_state (no separate expose; can be added if needed)
      // In Z2M "running_state" is typically exposed as a string.
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

      // DP 58 RunningMode: 0=Heat, 1=Cool
      [58, 'running_mode', tuya.valueConverterBasic.lookup({ heat: 0, cool: 1 })],

      // DP 25 Window state
      [25, 'window_state', tuya.valueConverter.onOff],

      // DP 27 Temperature correction (usually int, step 1°C)
      [27, 'local_temperature_calibration', tuya.valueConverter.raw],

      // DP 34 Humidity display
      [34, 'humidity', tuya.valueConverter.raw],

      // DP 39 Factory reset
      [39, 'factory_reset', tuya.valueConverter.onOff],

      // DP 40 Child lock
      [40, 'child_lock', tuya.valueConverter.onOff],

      // DP 43 Sensor selection: 0 internal, 1 external, 2 both
      [43, 'sensor_selection', tuya.valueConverterBasic.lookup({ internal: 0, external: 1, both: 2 })],

      // DP 48 Weekly program (5+1+1)
      [
        48,
        'program',
        {
          to: (v, meta) => {
            const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

            const build16 = (prefix) => {
              const b = Buffer.alloc(16);

              for (let p = 1; p <= 4; p++) {
                const off = (p - 1) * 4;

                const hour = v?.[`${prefix}_p${p}_hour`] ?? 0;
                const minute = v?.[`${prefix}_p${p}_minute`] ?? 0;
                const temp = v?.[`${prefix}_p${p}_temperature`] ?? 0;

                const h = clamp(Number(hour), 0, 23);
                const m = clamp(Number(minute), 0, 59);

                const t10 = clamp(Math.round(Number(temp) * 10), 0, 0xffff);

                b.writeUInt8(h, off);
                b.writeUInt8(m, off + 1);
                b.writeUInt16BE(t10, off + 2);
              }

              return b;
            };

            return Buffer.concat([
              build16('weekdays'),
              build16('saturday'),
              build16('sunday'),
            ]);
          },
          from:
            (v, meta) => {
              const format = (prefix, buf16) => {
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
                ...format('weekdays', v.slice(0, 16)),
                ...format('saturday', v.slice(16, 32)),
                ...format('sunday', v.slice(32, 48)),
              };
            },
        },
      ],

      // DP 101 Switch sensitivity
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
