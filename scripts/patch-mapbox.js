const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../node_modules/@rnmapbox/maps/android/src/main/java/com/rnmapbox/rnmbx/components/styles/RNMBXStyleFactory.kt');

console.log('Reading file:', filePath);
let content = fs.readFileSync(filePath, 'utf8');

// Backup original
fs.writeFileSync(filePath + '.original', content);

// Functions to remove
const functionsToRemove = [
  'setFillPatternCrossFade',
  'setLineElevationReference',
  'setLineCrossSlope',
  'setLinePatternCrossFade',
  'setCircleElevationReference',
  'setFillExtrusionPatternCrossFade',
  'setFillExtrusionHeightAlignment',
  'setFillExtrusionBaseAlignment',
  'setBackgroundPitchAlignment',
];

functionsToRemove.forEach((funcName) => {
  console.log(`Commenting out function: ${funcName}`);

  // Match the function and its body with proper brace matching
  const regex = new RegExp(`(\\s+)(fun\\s+${funcName}\\s*\\([^)]+\\)[^{]*\\{)([\\s\\S]*?)(\\n\\s+\\})`, 'gm');

  content = content.replace(regex, (match, indent, funcDecl, funcBody, closeBrace) => {
    // Comment each line
    const commentedDecl = indent + '// ' + funcDecl.trim();
    const commentedBody = funcBody
      .split('\n')
      .map((line) => {
        if (line.trim()) {
          // Preserve original indentation and add comment
          return line.replace(/^(\s*)/, '$1// ');
        }
        return line;
      })
      .join('\n');
    const commentedClose = closeBrace.replace(/^(\s*)/, '$1// ');

    return commentedDecl + commentedBody + commentedClose;
  });
});

// Write the modified content
fs.writeFileSync(filePath, content);

console.log('Successfully patched RNMBXStyleFactory.kt');
console.log('Original backed up to', filePath + '.original');
