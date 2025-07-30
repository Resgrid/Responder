#!/usr/bin/env node

// Simple test to verify filtering logic works correctly
const mockShifts = [
  { ShiftId: '1', Name: 'Day Shift', Code: 'DAY' },
  { ShiftId: '2', Name: 'Night Shift', Code: 'NIGHT' },
  { ShiftId: '3', Name: 'Emergency Shift', Code: 'EMRG' },
];

const mockTodaysShifts = [
  { ShiftDayId: 'day1', ShiftName: 'Day Shift' },
  { ShiftDayId: 'night1', ShiftName: 'Night Shift' },
  { ShiftDayId: 'emrg1', ShiftName: 'Emergency Shift' },
];

// Test filtering functions (copied from our implementation)
function getFilteredShifts(shifts, searchQuery) {
  if (!searchQuery.trim()) return shifts;
  const query = searchQuery.trim().toLowerCase();
  return shifts.filter((shift) => shift.Name.toLowerCase().includes(query) || shift.Code.toLowerCase().includes(query));
}

function getFilteredTodaysShifts(todaysShiftDays, searchQuery) {
  if (!searchQuery.trim()) return todaysShiftDays;
  const query = searchQuery.trim().toLowerCase();
  return todaysShiftDays.filter((shiftDay) => shiftDay.ShiftName.toLowerCase().includes(query));
}

console.log('=== Testing Shift Filtering ===');

// Test 1: Empty search should return all shifts
const result1 = getFilteredShifts(mockShifts, '');
console.log('Test 1 - Empty search:', result1.length === 3 ? 'PASS' : 'FAIL');

// Test 2: Search for "day" should return Day Shift
const result2 = getFilteredShifts(mockShifts, 'day');
console.log('Test 2 - Search "day":', result2.length === 1 && result2[0].Name === 'Day Shift' ? 'PASS' : 'FAIL');

// Test 3: Search for "NIGHT" (case insensitive) should return Night Shift
const result3 = getFilteredShifts(mockShifts, 'NIGHT');
console.log('Test 3 - Search "NIGHT":', result3.length === 1 && result3[0].Name === 'Night Shift' ? 'PASS' : 'FAIL');

// Test 4: Search by code "DAY" should return Day Shift
const result4 = getFilteredShifts(mockShifts, 'DAY');
console.log('Test 4 - Search code "DAY":', result4.length === 1 && result4[0].Code === 'DAY' ? 'PASS' : 'FAIL');

// Test 5: Search for non-existent term should return empty
const result5 = getFilteredShifts(mockShifts, 'xyz');
console.log('Test 5 - Search "xyz":', result5.length === 0 ? 'PASS' : 'FAIL');

console.log('\n=== Testing Today Shifts Filtering ===');

// Test 6: Empty search should return all today shifts
const result6 = getFilteredTodaysShifts(mockTodaysShifts, '');
console.log('Test 6 - Empty search:', result6.length === 3 ? 'PASS' : 'FAIL');

// Test 7: Search for "emergency" should return Emergency Shift
const result7 = getFilteredTodaysShifts(mockTodaysShifts, 'emergency');
console.log('Test 7 - Search "emergency":', result7.length === 1 && result7[0].ShiftName === 'Emergency Shift' ? 'PASS' : 'FAIL');

// Test 8: Search with whitespace should be trimmed
const result8 = getFilteredShifts(mockShifts, '  day  ');
console.log('Test 8 - Search with whitespace:', result8.length === 1 && result8[0].Name === 'Day Shift' ? 'PASS' : 'FAIL');

console.log('\n=== All Tests Complete ===');
