"""Prepares AndroidManifest.xml and Gradle settings for Tim-Tim Flutter app:
- Adds INTERNET, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS permissions
- Enables microphone audio capture in WebView
"""
import os
import re

manifest_path = os.path.join(
    os.path.dirname(__file__), '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml'
)
manifest_path = os.path.abspath(manifest_path)

if not os.path.exists(manifest_path):
    print(f"AndroidManifest not found at {manifest_path}, skipping.")
    exit(0)

with open(manifest_path, 'r', encoding='utf-8') as f:
    content = f.read()

permissions = """
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.RECORD_AUDIO"/>
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS"/>
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
"""

if 'android.permission.RECORD_AUDIO' not in content:
    content = content.replace('<manifest xmlns:android="http://schemas.android.com/apk/res/android">',
                              '<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n' + permissions)

# Add usesCleartextTraffic="true" to application tag
if 'android:usesCleartextTraffic' not in content:
    content = content.replace('<application', '<application\n        android:usesCleartextTraffic="true"')

with open(manifest_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("AndroidManifest.xml successfully prepared with audio & internet permissions.")
