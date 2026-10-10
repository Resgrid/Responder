/* eslint-env node */

/**
 * Registers a manually linked ReactPackage in MainApplication.kt.
 *
 * The import uses the BASE package name (where our plugins write the native module files), not the
 * variant-specific package of MainApplication.kt (e.g. `.development`).
 *
 * Handles both MainApplication shapes:
 * - Current Expo templates: `PackageList(this).packages.apply { ... }` gets `add(Package())` inside the block
 * - Older templates: `val packages = PackageList(this).packages` gets `packages.add(Package())`
 *
 * Throws when neither shape is found, so a template change fails the prebuild instead of shipping a
 * build where the native module is silently missing.
 *
 * @param {string} contents - MainApplication.kt source
 * @param {string} basePackageName - Package the native module files are written to
 * @param {string} packageClass - ReactPackage class name, e.g. `MediaButtonPackage`
 * @returns {string} Updated MainApplication.kt source
 */
function registerAndroidPackage(contents, basePackageName, packageClass) {
  let result = contents;

  const importStatement = `import ${basePackageName}.${packageClass}`;
  if (!result.includes(importStatement)) {
    result = result.replace(/^(package\s+[^\n]+\n)/, `$1${importStatement}\n`);
  }

  // Checked separately from the import: a MainApplication.kt that already imports the package
  // without registering it must still get the registration
  if (result.includes(`add(${packageClass}())`)) {
    return result;
  }

  const applyPattern = /^([ \t]*)(.*PackageList\(this\)\.packages\.apply\s*\{)/m;
  if (applyPattern.test(result)) {
    return result.replace(applyPattern, (_match, indent, line) => `${indent}${line}\n${indent}  add(${packageClass}())`);
  }

  const packagesPattern = /^([ \t]*)val packages = PackageList\(this\)\.packages(\.toMutableList\(\))?/m;
  if (packagesPattern.test(result)) {
    return result.replace(packagesPattern, (_match, indent) => `${indent}val packages = PackageList(this).packages.toMutableList()\n${indent}packages.add(${packageClass}())`);
  }

  throw new Error(`Could not find where to register ${packageClass} in MainApplication.kt`);
}

module.exports = { registerAndroidPackage };
