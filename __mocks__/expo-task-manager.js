/* eslint-disable no-undef */
// Manual mock for expo-task-manager
const defineTask = jest.fn();
const isTaskRegisteredAsync = jest.fn(async () => false);
const unregisterTaskAsync = jest.fn(async () => {});
module.exports = {
  defineTask,
  isTaskRegisteredAsync,
  unregisterTaskAsync,
};
