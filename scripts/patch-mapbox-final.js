const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../node_modules/@rnmapbox/maps/android/src/main/java/com/rnmapbox/rnmbx/components/styles/RNMBXStyleFactory.kt');

// Restore from backup if exists
const origPath = filePath + '.original';
if (fs.existsSync(origPath)) {
  fs.copyFileSync(origPath, filePath);
}

let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Properties/functions to remove
const deprecatedProps = [
  'fillPatternCrossFade',
  'lineElevationReference',
  'lineCrossSlope',
  'linePatternCrossFade',
  'circleElevationReference',
  'fillExtrusionPatternCrossFade',
  'fillExtrusionHeightAlignment',
  'fillExtrusionBaseAlignment',
  'backgroundPitchAlignment',
];

const result = [];
let i = 0;

while (i < lines.length) {
  const line = lines[i];

  // Check if this is a case statement for a deprecated property
  let isDeprecatedCase = false;
  for (const prop of deprecatedProps) {
    if (line.match(new RegExp(`"${prop}"\\s*->\\s*$`))) {
      isDeprecatedCase = true;
      // Comment out this line
      result.push(line.replace(/^(\s*)(.*)$/, '$1// $2 // Deprecated in Mapbox SDK 11.8+'));

      // Find and comment out the next statement (could be a function call or block)
      let j = i + 1;
      let braceDepth = 0;
      let inBlock = false;

      while (j < lines.length) {
        const nextLine = lines[j];

        // Check if we've hit another case or end of when block
        if (nextLine.match(/^\s*"/)) {
          break;
        }
        if (nextLine.match(/^\s*else\s*->/)) {
          break;
        }

        // Count braces to handle blocks
        const openBraces = (nextLine.match(/{/g) || []).length;
        const closeBraces = (nextLine.match(/}/g) || []).length;
        braceDepth += openBraces - closeBraces;

        if (openBraces > 0) inBlock = true;

        // Comment out non-empty lines
        if (nextLine.trim()) {
          result.push(nextLine.replace(/^(\s*)(.*)$/, '$1// $2'));
        } else {
          result.push(nextLine);
        }

        // If we were in a block and braces are balanced, we're done
        if (inBlock && braceDepth === 0) {
          j++;
          break;
        }

        // If not in a block and we have a statement, move on
        if (!inBlock && nextLine.trim() && !nextLine.trim().startsWith('//')) {
          j++;
          break;
        }

        j++;
      }

      i = j;
      continue;
    }
  }

  if (!isDeprecatedCase) {
    // Check if this is a function definition for deprecated function
    let isDeprecatedFunc = false;
    for (const prop of deprecatedProps) {
      const funcName = 'set' + prop.charAt(0).toUpperCase() + prop.slice(1);
      if (line.match(new RegExp(`fun\\s+${funcName}\\s*\\(`))) {
        isDeprecatedFunc = true;

        // Comment out entire function
        let braceDepth = 0;
        let j = i;

        while (j < lines.length) {
          const funcLine = lines[j];
          const openBraces = (funcLine.match(/{/g) || []).length;
          const closeBraces = (funcLine.match(/}/g) || []).length;
          braceDepth += openBraces - closeBraces;

          // Comment the line
          if (funcLine.trim()) {
            result.push(funcLine.replace(/^(\s*)(.*)$/, '$1// $2'));
          } else {
            result.push(funcLine);
          }

          j++;

          // Function complete when braces balance
          if (braceDepth === 0 && closeBraces > 0) {
            break;
          }
        }

        i = j;
        break;
      }
    }

    if (!isDeprecatedFunc) {
      result.push(line);
      i++;
    }
  }
}

// Write the modified content
fs.writeFileSync(filePath, result.join('\n'));

console.log('Successfully patched RNMBXStyleFactory.kt');
console.log('Deprecated properties and functions have been commented out');
