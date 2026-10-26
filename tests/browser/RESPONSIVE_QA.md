# Responsive QA — actual desktop browser, 2026-10-24 23:02–23:06 UTC

## Result
PASS for tested responsive layouts at actual desktop content widths768 and485 CSS pixels (100% zoom), plus323 CSS pixels at150% desktop zoom. Not a real mobile-device/touch test. Exact375×812 and768×1024 remain unverified. No source edits, wallet requests, transactions or DevTools.

## Measured sizes
Read-only browser DOM geometry returned document.documentElement.clientWidth/clientHeight/scrollWidth:
- Native window791×836: content768×745; scrollWidth768.
- Native window508×836: content485×745; scrollWidth485.
- Same508×836 native window at150% Chrome zoom: content323×497; scrollWidth323.
- Restored100%: content485×745; scrollWidth485.

These are content/client dimensions excluding the vertical scrollbar, not emulated device sizes. Browser viewport including scrollbar is wider. No document horizontal overflow in these observations. Narrow stop table deliberately uses a contained horizontal scroller; not all columns are simultaneously visible at323 CSS px.

## Exact resize route and constraints
Earlier bound-window corner dragging from(1186,846)→(418,846) and the Alt+F8 window-resize shortcut followed by38×Left,Return did not immediately change the1188×848 window. Bound-window input does not necessarily control the desktop window manager. A subsequent desktop click changed geometry unexpectedly, consistent with pending resize mode, but this cause is an inference.

Successful route: observe desktop screenshots, then drag the actual window border at these desktop coordinates:
1. Drag path(947,177)→(900,400)→(860,700)→(860,930): window774×836, content751×745.
2. Drag path(860,922)→(877,922): window791×836, content768×745.
3. Drag path(877,922)→(650,922)→(484,922): window508×836, content485×745.
4. Additional drag(594,921)→(484,921): remained508×836/content485×745. This directly establishes the observed native window minimum, blocking375 CSS px at100% zoom through this route.

No direct viewport-resize control was available in the browser tooling. No DevTools, separate browser automation, window-manager shell scripts or security workarounds used.

## Interaction checks
- At768 CSS px: Recheck, enter2900, Preview stop → unsigned Sell/reduce-only replay preview; signing unavailable.
- At485 CSS px: Whole-position SL scenario → verified; Evidence details expands with readable provenance; layout stacks into one column.
- At485 CSS px, Missing stop-loss validation:
  - empty / abc → invalid decimal.
  - 0 → trigger not on tick (rejected, although wording is less helpful than positive-price wording).
  - 3100 for long / mark3000 → trigger already met.
  - 2900.00001 → trigger not on tick.
  - 2900 → valid replay preview.
- Tab from Trigger price moves focus to Preview stop; focus screenshot retained. This is basic keyboard traversal, not exhaustive accessibility testing.
- At323 CSS px (150% desktop zoom): Recheck and preview work; scenario changes and Evidence details work; no document horizontal overflow. Top title, scenario, warning, owner and recheck controls fit. Contained stop table remains horizontally scrollable.
- Chrome zoom changed via three Ctrl+plus keyboard shortcuts; native UI visibly confirmed150%. Restored with Ctrl+0 and verified100%/485 CSS px.

A browser-input timeout occurred during the abc case; fresh DOM showed the action had executed and invalid-decimal error was visible. Outcome was reconciled before continuing, not blindly retried.

## Evidence and artifact caveat
Reliable:
- evidence/browser/responsive-tablet768.png: full-page768px content screenshot.
- evidence/browser/responsive-narrow485.png: full-page485px content screenshot.
- evidence/browser/responsive-focus485.png: keyboard focus screenshot.
- evidence/browser/responsive-validation.json: actual validation DOM observations.
- evidence/browser/responsive-zoom150-native-top.jpg: native window top at150%, reliable image.
- evidence/browser/responsive-zoom150-native-evidence.jpg: native narrow evidence/table scroll area at150%, reliable image.

Do not use responsive-zoom150-css323.png or responsive-zoom150-evidence323.png as full-page visual proof: full-page browser capture at150% produced215-pixel-wide cropped artifacts despite actual DOM width323 and native screenshot showing correct fit. This is a screenshot tooling limitation, not demonstrated page overflow. Native screenshots replaced them for visual QA.

The final-source SHA256 inventory remained unchanged during this follow-up. Physical375px device, touch input, mobile browser rendering and exact target heights remain untested. No claim of full mobile QA.
