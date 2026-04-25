// const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
// const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
// const reporting = require('zigbee-herdsman-converters/lib/reporting');
// const ota = require('zigbee-herdsman-converters/lib/ota');
// const utils = require('zigbee-herdsman-converters/lib/utils');
// const globalStore = require('zigbee-herdsman-converters/lib/store');
const tuya = require('zigbee-herdsman-converters/lib/tuya');
const e = exposes.presets;
const ea = exposes.access;

const exposesLocal = {
  hour: (name: string) => e.numeric(name, ea.STATE_SET).withUnit('h').withValueMin(0).withValueMax(23),
  minute: (name: string) => e.numeric(name, ea.STATE_SET).withUnit('m').withValueMin(0).withValueMax(59),
  program_temperature: (name: string) => e.numeric(name, ea.STATE_SET).withUnit('°C').withValueMin(5).withValueMax(35).withValueStep(0.5),
};

const definition = {
  fingerprint: tuya.fingerprint('TS0601', [ '_TZE200_6kijc7nd' ]),
  model: 'Pro Line ZigBee Thermostat',
  vendor: 'Tervix',
  description: 'Zigbee thermostat for heating floor or radiator (Tuya TS0601-based)',
  fromZigbee: [ tuya.fz.datapoints ],
  toZigbee: [ tuya.tz.datapoints ],
  onEvent: tuya.onEventSetTime,
  configure: tuya.configureMagicPacket,
  exposes: [
    e
      .climate()
      .withLocalTemperature(ea.STATE)
      // .withSystemMode(system_modes, ea.STATE_SET)
      // .withFanMode(['low', 'medium', 'high', 'auto'], ea.STATE_SET)
      // .withSetpoint('current_heating_setpoint', 5, 35, 1, ea.STATE_SET)
      // .withPreset(['auto', 'manual'])
      .withLocalTemperatureCalibration(-9, 9, 1, ea.STATE_SET),
    e.child_lock(),
    e.max_temperature().withValueMin(35).withValueMax(99).withPreset('default', 35, 'Default value'),
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
  ],
  meta: {
    publishDuplicateTransaction: true,
    tuyaDatapoints: [
      // 1 - true, false
      // 2 - 0, 1
      // 3 - 1, 0
      // 8 - false
      // 10 - false
      [ 16, 'current_heating_setpoint', tuya.valueConverter.divideBy10 ], // 16 - 235
      [ 19, 'max_temperature', tuya.valueConverter.divideBy10 ], // 19 - 450
      [ 24, 'local_temperature', tuya.valueConverter.divideBy10 ],
      [ 27, 'local_temperature_calibration', tuya.valueConverter.raw ], // 27 - -2
      [ 34, 'humidity_value', tuya.valueConverter.raw ],
      [ 39, 'factory_reset', tuya.valueConverter.onOff ],
      [ 40, 'child_lock', tuya.valueConverter.lockUnlock ],
      // 43 - 0
      // ---
      // 48 - [6,30,0,210,8,0,0,180,18,0,0,210,22,30,0,160,6,30,0,210,8,0,0,180,18,0,0,210,23,30,0,160,6,30,0,210,8,0,0,180,18,0,0,210,23,0,0,160],"type":"Buffer"
      // С понедельника по пятницу
      // 6,30,0,210 - Период 1: 6:30, Температура 21.0
      // 8,0,0,180 - Период 2: 8:00, Температура 18.0
      // 18,0,0,210 - Период 3: 18:00, Температура 21.0
      // 22,30,0,160 - Период 4: 22:30, Температура 16.0
      // Суббота
      // 6,30,0,210 - Период 1: 6:30, Температура 21.0
      // 8,0,0,180 - Период 2: 8:00, Температура 18.0
      // 18,0,0,210 - Период 3: 18:00, Температура 21.0
      // 23,30,0,160 - Период 4: 23:30, Температура 16.0
      // Воскресенье
      // 6,30,0,210 - Период 1: 6:30, Температура 21.0
      // 8,0,0,180, - Период 2: 8:00, Температура 18.0
      // 18,0,0,210 - Период 3: 18:00, Температура 21.0
      // 23,0,0,160 - Период 4: 23:00, Температура 16.0
      // ---
      // 58 - 0
      // 101 - 10
      // 102 - 500
      // 103 - 150
      // 104 - 15
      // 105 - 2
      // 106 - 30
      // 107 - true
      // 108 - 80
    ],
  },
  extend: [],
};

module.exports = definition;

/**
 * Data points:
 * [
 *         {
 *             "dpId": 1,
 *             "dpName": "Switch"
 *         },
 *         {
 *             "dpId": 2,
 *             "dpName": "Mode"
 *         },
 *         {
 *             "dpId": 3,
 *             "dpName": "Working status"
 *         },
 *         {
 *             "dpId": 8,
 *             "dpName": "Window check"
 *         },
 *         {
 *             "dpId": 10,
 *             "dpName": "Frost protection"
 *         },
 *         {
 *             "dpId": 16,
 *             "dpName": "Set temperature"
 *         },
 *         {
 *             "dpId": 19,
 *             "dpName": "Set temperature ceiling"
 *         },
 *         {
 *             "dpId": 24,
 *             "dpName": "Current temperature"
 *         },
 *         {
 *             "dpId": 25,
 *             "dpName": "State of the window"
 *         },
 *         {
 *             "dpId": 27,
 *             "dpName": "Temperature correction"
 *         },
 *         {
 *             "dpId": 34,
 *             "dpName": "Humidity display"
 *         },
 *         {
 *             "dpId": 101,
 *             "dpName": "switchsensitivity"
 *         },
 *         {
 *             "dpId": 102,
 *             "dpName": "Floor hight temp.  protect. (max)"
 *         },
 *         {
 *             "dpId": 39,
 *             "dpName": "Factory data reset"
 *         },
 *         {
 *             "dpId": 103,
 *             "dpName": "Floor low. temp. (min)"
 *         },
 *         {
 *             "dpId": 40,
 *             "dpName": "Child lock"
 *         },
 *         {
 *             "dpId": 104,
 *             "dpName": "owd_time"
 *         },
 *         {
 *             "dpId": 105,
 *             "dpName": "owd_temp"
 *         },
 *         {
 *             "dpId": 106,
 *             "dpName": "owd_delaytime"
 *         },
 *         {
 *             "dpId": 43,
 *             "dpName": "Sensor selection"
 *         },
 *         {
 *             "dpId": 107,
 *             "dpName": "Humidity control"
 *         },
 *         {
 *             "dpId": 108,
 *             "dpName": "Upper humidity limit"
 *         },
 *         {
 *             "dpId": 48,
 *             "dpName": "Weekly program (5+1+1)"
 *         },
 *         {
 *             "dpId": 58,
 *             "dpName": "Run mode"
 *         },
 *         {
 *             "dpId": 61,
 *             "dpName": "week program periods"
 *         }
 *     ]
 */

// ---

// [
//   {
//     "code": "switch",
//     "value": false -> "{true,false}"
//   },
//   {
//     "code": "mode" -> Enum -> "{manual,program}"
//   },
//   {
//     "code": "window_check",
//     "value": false -> "{true,false}"
//   },
//   {
//     "code": "frost",
//     "value": false -> "{true,false}"
//   },
//   {
//     "code": "temp_set",
//     "value": 50 -> {"unit": "*C","min": 50,"max": 950,"scale": 1,"step": 5}
//   },
//   {
//     "code": "upper_temp",
//     "value": 350 -> {"unit": "*C","min": 350,"max": 950,"scale": 1,"step": 5}
//   },
//   {
//     "code": "temp_correction",
//     "value": -9 -> {"unit": "*C","min": -9,"max": 9,"scale": 0,"step": 1}
//   },
//   {
//     "code": "factory_reset",
//     "value": false -> "{true,false}"
//   },
//   {
//     "code": "child_lock",
//     "value": false -> "{true,false}"
//   },
//   {
//     "code": "sensor_choose" -> Enum -> "{in,out}"
//   }
// ]
