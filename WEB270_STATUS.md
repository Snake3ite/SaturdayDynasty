# Browser Build 270 / V27.4.69

The browser edition now uses the shared Build 270 game runtime and interface assets, including the recruiting filters that open by default and can be collapsed. Browser-only save sync, feedback, purchase, privacy, and ad integrations remain in the web build.

The browser shell, service-worker cache, and cloud-save version metadata are tagged Build 270 so existing browser installs refresh their assets and cloud saves report the current game version.

Validation completed locally: Web 270 assembled with 188 verified assets; generated page references resolve; native Build 270 verification passes. The browser-save regression test could not run because `fake-indexeddb` is not present in the available package cache.
