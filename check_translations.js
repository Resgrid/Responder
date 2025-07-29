const en = require('./src/translations/en.json');
const es = require('./src/translations/es.json');
const ar = require('./src/translations/ar.json');

const keys = ['calendar.title', 'calendar.tabs.today', 'calendar.selectedDate.title', 'calendar.eventsCount', 'calendar.noEvents'];

function checkKey(obj, key) {
  const parts = key.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && current[part] !== undefined) {
      current = current[part];
    } else {
      return false;
    }
  }
  return true;
}

console.log('Final validation of all translation keys:');
console.log('=========================================');

keys.forEach((key) => {
  const enExists = checkKey(en, key);
  const esExists = checkKey(es, key);
  const arExists = checkKey(ar, key);

  const status = enExists && esExists && arExists ? 'All OK' : 'Missing';
  console.log(key + ': ' + status);

  if (!enExists || !esExists || !arExists) {
    console.log('  EN: ' + (enExists ? 'OK' : 'Missing') + ', ES: ' + (esExists ? 'OK' : 'Missing') + ', AR: ' + (arExists ? 'OK' : 'Missing'));
  }
});
