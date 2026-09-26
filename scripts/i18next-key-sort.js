// Key order for the i18n-json/sorted-keys rule. JavaScript objects always enumerate integer-like
// keys first, in numeric order, so a plain `.sort()` asks for "10" before "2" in enum maps such as
// workOrders.activityType, an order JSON.parse can never return. The rule then fails forever,
// even right after --fix. Sorting integer-like keys numerically, ahead of the rest, keeps the rule
// satisfiable; all other keys keep the plugin's default case-sensitive ascending order.
const INTEGER_KEY = /^(?:0|[1-9]\d*)$/;

const sortKeys = (obj) => {
  const keys = Object.keys(obj);
  const integerKeys = keys.filter((key) => INTEGER_KEY.test(key)).sort((a, b) => Number(a) - Number(b));
  const otherKeys = keys.filter((key) => !INTEGER_KEY.test(key)).sort();
  return [...integerKeys, ...otherKeys];
};

module.exports = sortKeys;
