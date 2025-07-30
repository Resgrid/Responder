/**
 * B01 Inrico Button Code Debug Helper
 *
 * This script helps you determine the correct button codes for your B01 Inrico handheld device.
 * To use this:
 *
 * 1. Connect your B01 Inrico device to the app
 * 2. Press different buttons on the device
 * 3. Look at the logs to see what raw button codes are being received
 * 4. Use this information to update the button mapping
 *
 * Usage in your app:
 * ```typescript
 * import { debugB01InricoButtons } from '@/utils/b01-inrico-debug';
 *
 * // Call this to test specific hex codes
 * debugB01InricoButtons('01');        // Test PTT start
 * debugB01InricoButtons('00');        // Test PTT stop
 * debugB01InricoButtons('81');        // Test PTT with long press flag
 * ```
 */

import { bluetoothAudioService } from '@/services/bluetooth-audio.service';

export function debugB01InricoButtons(hexCode: string) {
  console.log(`\n=== DEBUGGING B01 INRICO BUTTON CODE: ${hexCode} ===`);

  const result = bluetoothAudioService.testB01InricoButtonMapping(hexCode);

  console.log('Parsed Result:', result);
  console.log('Expected Actions:');

  if (result?.button === 'ptt_start') {
    console.log('  → Should enable microphone (push-to-talk START)');
  } else if (result?.button === 'ptt_stop') {
    console.log('  → Should disable microphone (push-to-talk STOP)');
  } else if (result?.button === 'mute') {
    console.log('  → Should toggle microphone mute');
  } else if (result?.button === 'volume_up') {
    console.log('  → Should increase volume');
  } else if (result?.button === 'volume_down') {
    console.log('  → Should decrease volume');
  } else {
    console.log('  → Unknown button - no action will be taken');
  }

  if (result?.type === 'long_press') {
    console.log('  → LONG PRESS detected');
  } else if (result?.type === 'double_press') {
    console.log('  → DOUBLE PRESS detected');
  }

  console.log('=== END DEBUG ===\n');

  return result;
}

/**
 * Common B01 Inrico button codes to test
 * Use these as a starting point for your device testing
 */
export const COMMON_B01_BUTTON_CODES = {
  // Basic codes (0x00-0x05)
  PTT_STOP: '00',
  PTT_START: '01',
  MUTE: '02',
  VOLUME_UP: '03',
  VOLUME_DOWN: '04',
  EMERGENCY: '05',

  // Original mappings (0x10-0x40)
  PTT_START_ALT: '10',
  PTT_STOP_ALT: '11',
  MUTE_ALT: '20',
  VOLUME_UP_ALT: '30',
  VOLUME_DOWN_ALT: '40',

  // Long press variants (with 0x80 flag)
  PTT_START_LONG: '81', // 0x01 + 0x80
  PTT_STOP_LONG: '80', // 0x00 + 0x80
  MUTE_LONG: '82', // 0x02 + 0x80

  // Multi-byte examples
  PTT_START_WITH_FLAG: '0101', // PTT start + long press indicator
  PTT_START_WITH_DOUBLE: '0102', // PTT start + double press indicator
};

/**
 * Test all common button codes
 */
export function testAllCommonB01Codes() {
  console.log('\n🔍 TESTING ALL COMMON B01 INRICO BUTTON CODES\n');

  Object.entries(COMMON_B01_BUTTON_CODES).forEach(([name, code]) => {
    console.log(`\n--- Testing ${name} (${code}) ---`);
    debugB01InricoButtons(code);
  });

  console.log('\n✅ TESTING COMPLETE\n');
}

/**
 * Instructions for manual testing with your actual device
 */
export function showManualTestingInstructions() {
  console.log(`
🎯 MANUAL TESTING INSTRUCTIONS FOR B01 INRICO DEVICE

1. Ensure your B01 Inrico device is connected to the app
2. Open the app logs/console to watch for button events
3. Press each button on your device ONE AT A TIME
4. Note the raw hex codes that appear in the logs
5. Fill out this mapping:

   Button Name          | Raw Hex Code | Current Mapping
   -------------------- | ------------ | ---------------
   PTT Press           | ????         | ${COMMON_B01_BUTTON_CODES.PTT_START}
   PTT Release         | ????         | ${COMMON_B01_BUTTON_CODES.PTT_STOP}
   Volume Up           | ????         | ${COMMON_B01_BUTTON_CODES.VOLUME_UP}
   Volume Down         | ????         | ${COMMON_B01_BUTTON_CODES.VOLUME_DOWN}
   Mute/Unmute         | ????         | ${COMMON_B01_BUTTON_CODES.MUTE}
   Emergency (if any)  | ????         | ${COMMON_B01_BUTTON_CODES.EMERGENCY}
   PTT Long Press      | ????         | ${COMMON_B01_BUTTON_CODES.PTT_START_LONG}

6. Use the debugB01InricoButtons() function to test specific codes:
   
   debugB01InricoButtons('YOUR_HEX_CODE_HERE');

7. Update the button mapping in bluetooth-audio.service.ts based on your findings

💡 TIP: Look for these patterns in the logs:
   - "B01 Inrico raw button data analysis"
   - "rawHex" field shows the exact bytes received
   - "Unknown B01 Inrico button code received" for unmapped buttons
  `);
}

export default {
  debugB01InricoButtons,
  testAllCommonB01Codes,
  showManualTestingInstructions,
  COMMON_B01_BUTTON_CODES,
};
