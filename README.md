# ACNL Turnip Calculator

A fan-made stalk-market calculator for **Animal Crossing: New Leaf**. Enter Joan's Sunday buy price and the Re-Tail prices you have seen. It shows how likely each pattern is, the possible and likely price in every empty slot, and a short note on whether to sell or wait.

The address bar holds the week: Joan's price, the twelve Re-Tail figures, last week's pattern, how many turnips you bought, and a friend's Re-Tail week if you added one. Open that URL on another device, bookmark it, or use **Copy share link**. If the URL has none of those keys, the last week saved in this browser is used.

**Start next week** stores this Sunday–Saturday, fills last week's pattern from the classification, and clears the current prices. Saved weeks stay on this device.

You can log a friend's Re-Tail (and their Joan price if they told you) to see whether to visit their town or sell at home. That friend form sits under pattern odds and the price chart. Turnip count uses Joan's price as cost and shows profit or loss in bells.

The price chart defaults to **Bands**. Switch to **Numbers** for an AM/PM table of remaining min–max and the likely band. Tap the band chart for a larger overlay; tap outside, Close, or Escape to dismiss.

This is not affiliated with Nintendo.

## New Leaf and New Horizons

This app runs [Ninji's datamine of the New Horizons code](https://gist.github.com/Treeki/85be14d297c80c8b3c0a76375743325b). No public New Leaf decompilation or numeric rate table turned up, so the generator was not swapped for a different one. [Turnip Prophet](https://turnipprophet.io/) and the [Reddit walkthrough of that code](https://www.reddit.com/r/ac_newhorizons/comments/g1xncb/analysis_of_the_turnip_prices_code/) describe the same New Horizons function. [Thonky's New Leaf stalk-market guide](https://www.thonky.com/animal-crossing-new-leaf/stalk-market) describes the same four shapes and the same spike timing, in rough bells, not these rates. Recorded New Leaf weeks fit the function. That fit is not proof the games share it.

What matches:

- Joan's buy price is an integer from 90 to 110.
- Twelve sell prices, Monday–Saturday, morning (before noon) and afternoon (noon onward). No Sunday sell. Turnips spoil at 6:00 AM the next Sunday.
- Four patterns: fluctuating, large spike, decreasing, small spike.
- Large spike: one to seven half-days easing from 85–90% by 3–5%, then five prices (90–140%, 140–200%, 200–600%, 140–200%, 90–140%). The peak is the third rise, Tuesday afternoon through Friday afternoon, then independent 40–90% lows.
- Small spike: up to seven half-days easing from 40–90%, then two 90–140% prices, a peak of 140–200% on the fourth rise (Tuesday afternoon through Saturday morning), one elevated price after that, then another 40–90% ease.
- Decreasing: 85–90%, then 3–5% down all week.
- Fluctuating: seven highs at 90–140%, split across up to three phases, with two decreasing phases (lengths 2 and 3) that start at 60–80% and fall 4–10%.
- Last week's pattern changes this week's chances, out of 100: after fluctuating 20/30/15/35, after a large spike 50/5/20/25, after decreasing 25/45/5/25, after a small spike 45/25/15/15 (fluctuating, large, decreasing, small).

What does not match a separate New Leaf table, because no such table turned up:

- Thonky gives rough bells ("about 50 to 200", a decreasing week "between 99 and 50") rather than these rates. Recorded 2012 New Leaf weeks fit the rate table, including a large-spike peak of 627 on a 110 buy and a tail that rises again after the spike.
- The first-purchase override that forces a small spike is commented out in the published gist. Turnip Prophet and the Reddit notes still treat a brand-new buyer's first week as a small spike. Thonky never mentions it. **I don't know** uses the long-run mix of the table above (about 34.6% / 24.7% / 14.8% / 25.9%). **First week buying** assumes that small-spike override. If your first week in a new town was not a small spike, use I don't know.

The original GameCube stalk market used a different three-pattern table. That is not New Leaf.

## Run the dev server

```bash
npm install
npm test
npm run dev
```

The dev server listens on `0.0.0.0:43123`.

## Build the desktop app

Linux (AppImage and an unpacked binary):

```bash
npm run dist
```

The unpacked program is `release/linux-unpacked/acnl-turnip-calculator`. The AppImage is `release/ACNL Turnip Calculator-1.0.0.AppImage`. The usual way to use the calculator is the web page in a phone browser.

Windows installer and portable executable (both end in `.exe`, written to `release/`):

```bash
npm run dist:win
```

`electron-builder --win` runs on Linux. The NSIS installer needs Wine. The portable target does not.
