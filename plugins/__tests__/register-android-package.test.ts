import { registerAndroidPackage } from '../utils/register-android-package';

// Expo SDK 57 template (what `expo prebuild` generates today)
const applyTemplate = `package wtdt.resgrid.andriod.development

import android.app.Application

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        }
    )
  }
}
`;

// Older template that declares the package list as a local
const valTemplate = `package com.example

import com.facebook.react.PackageList

class MainApplication : Application(), ReactApplication {
  override fun getPackages(): List<ReactPackage> {
    val packages = PackageList(this).packages
    return packages
  }
}
`;

const countOf = (contents: string, text: string) => contents.split(text).length - 1;

describe('registerAndroidPackage', () => {
  it('adds the package inside the packages.apply block of the current Expo template', () => {
    const result = registerAndroidPackage(applyTemplate, 'com.resgridresponder', 'MediaButtonPackage');
    const lines = result.split('\n');

    expect(lines[1]).toBe('import com.resgridresponder.MediaButtonPackage');
    const applyLine = lines.findIndex((line) => line.includes('PackageList(this).packages.apply {'));
    expect(lines[applyLine + 1]).toBe('          add(MediaButtonPackage())');
  });

  it('adds the package to a val packages list, making it mutable', () => {
    const result = registerAndroidPackage(valTemplate, 'com.example', 'MediaButtonPackage');

    expect(result).toContain('import com.example.MediaButtonPackage');
    expect(result).toContain('    val packages = PackageList(this).packages.toMutableList()\n    packages.add(MediaButtonPackage())');
  });

  it('registers several packages once each', () => {
    for (const template of [applyTemplate, valTemplate]) {
      const result = registerAndroidPackage(registerAndroidPackage(template, 'com.resgridresponder', 'InCallAudioPackage'), 'com.resgridresponder', 'MediaButtonPackage');

      expect(countOf(result, 'add(InCallAudioPackage())')).toBe(1);
      expect(countOf(result, 'add(MediaButtonPackage())')).toBe(1);
      expect(countOf(result, 'toMutableList()')).toBeLessThanOrEqual(1);
    }
  });

  it('leaves an already registered package unchanged across repeated prebuilds', () => {
    const once = registerAndroidPackage(applyTemplate, 'com.resgridresponder', 'MediaButtonPackage');
    const twice = registerAndroidPackage(once, 'com.resgridresponder', 'MediaButtonPackage');

    expect(twice).toBe(once);
  });

  it('registers a package that is imported but not yet registered', () => {
    const importedOnly = applyTemplate.replace('package wtdt.resgrid.andriod.development\n', 'package wtdt.resgrid.andriod.development\nimport com.resgridresponder.InCallAudioPackage\n');

    const result = registerAndroidPackage(importedOnly, 'com.resgridresponder', 'InCallAudioPackage');

    expect(countOf(result, 'import com.resgridresponder.InCallAudioPackage')).toBe(1);
    expect(result).toContain('add(InCallAudioPackage())');
  });

  it('throws when MainApplication.kt has no recognised package list', () => {
    const unknown = 'package com.example\n\nclass MainApplication : Application()\n';

    expect(() => registerAndroidPackage(unknown, 'com.example', 'MediaButtonPackage')).toThrow('Could not find where to register MediaButtonPackage in MainApplication.kt');
  });
});
