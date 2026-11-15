# Set up Dash Arcade on your TV and phones

Dash Arcade uses one **host** screen at `/host` and a **controller** at `/play` for each player. A TV can run the host directly or display the host from another device. Either way, phones join the same four-letter room code.

- [Run a local trial](#run-a-local-trial)
- [Put the arcade online for phones](#put-the-arcade-online-for-phones)
- [Choose your TV operating system](#tv-operating-systems)
- [Set up each phone](#phone-and-tablet-operating-systems)
- [Build and install the Android APK](#android-apk)
- [Start game night](#start-game-night)

## Run a local trial

From a computer with Node.js 22 or later:

```sh
git clone https://github.com/TwinSailsStudios/DASH-ARCADE.git
cd DASH-ARCADE
npm ci
npm run dev
```

Open `http://localhost:3000/host`. Open the room's invite link in two more tabs in the **same browser profile**, enter two different nicknames, and select **Ready up!** on both. The host shows **Local tabs** when it uses this mode. Separate phones need the HTTPS and Supabase setup below, even if they're on the same Wi-Fi.

## Put the arcade online for phones

You only need to do this once per deployment.

1. Create or open a Supabase project. In its **Connect** dialog, copy the Project URL and **publishable** key. In Realtime settings, keep **Allow public access** enabled because Dash Arcade uses a public Broadcast and Presence channel. [Supabase Broadcast setup](https://supabase.com/docs/guides/realtime/broadcast) · [Realtime settings](https://supabase.com/docs/guides/realtime/settings)
2. Copy `.env.example` to `.env.local`. Set the following variables on your deployment too. Use the publishable key in the browser build.
   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
   NEXT_PUBLIC_ARCADE_ORIGIN=https://YOUR-ARCADE-DOMAIN
   ```
   `NEXT_PUBLIC_ARCADE_ORIGIN` is the public HTTPS address used by the lobby QR and native TV app. Use the site's origin, without `/host` or `/play`.
3. Deploy to an HTTPS address. A Next.js host can run `npm run build` and `npm start`. For static hosting, run `npm run export`, publish `out/` at the root of the HTTPS domain, and enable directory indexes for `/host/` and `/play/`. Supply the same environment variables before building the web app and the APK. The stock static export uses root-relative assets, so use a site root or a custom domain for GitHub Pages.
4. Open `https://YOUR-ARCADE-DOMAIN/host` and look for **Live room**. Scan the QR on one phone to confirm that it opens the public controller. The host holds its save in browser storage, and Supabase relays the room using Broadcast and Presence. Setup requires a project and public Realtime access.

## TV operating systems

| TV platform | How to show the host |
| --- | --- |
| **Google TV, Android TV** (including compatible Sony, TCL, Hisense, Philips, Xiaomi, Chromecast with Google TV, and Google TV Streamer models) | Install the [APK](#android-apk), open **Dash Arcade** in the apps row, and use the remote's arrows and center button. A supported TV browser can open `/host` as a web alternative. [Android TV launcher behavior](https://developer.android.com/training/tv/get-started/create) |
| **Chromecast or Google Cast receiver** | Open `/host` in desktop Chrome. Use Chrome's **Cast, save, and share → Cast**, select the TV, then keep the host tab open. The desktop remains in control. [Google Cast instructions](https://support.google.com/chrome/answer/3228332) |
| **Apple TV / tvOS** | Use AirPlay. Put the Apple TV and host device on the same network. Open `/host` on a Mac or spare iPad, then use **Control Center → Screen Mirroring** and select the Apple TV. Control the game from the device doing the mirroring. [Apple TV AirPlay instructions](https://support.apple.com/guide/tv/atvbf2be9ef7/tvos) |
| **Roku OS** | Open `/host` on a Mac and use **Screen Mirroring** on an AirPlay-compatible Roku. Turn on AirPlay under **Settings → Apple AirPlay and HomeKit**. On Windows, use **Win + K** on a compatible Miracast setup and approve the request on the Roku. A Roku TV can also display a computer over HDMI. [Roku mirroring](https://support.roku.com/article/screen-mirror-your-phone-tablet-or-computer) · [Roku AirPlay](https://support.roku.com/article/screen-mirror-your-apple-device-with-airplay) |
| **Amazon Fire TV with Fire OS** | Open the TV's **Internet / Silk** app, enter the HTTPS `/host` address and select **Start Game Night** once phones are ready. The remote moves Silk's pointer. If the model's browser can't run the host, use a computer over HDMI. [Fire TV Silk](https://digprjsurvey.amazon.com/csad/help/node/TZ6CJ7nVQJW26yiItl) |
| **Amazon Fire TV with Vega OS** | Use the public `/host` URL if the device offers a compatible browser. Otherwise connect a computer directly to the TV by HDMI. Amazon lists Fire OS and Vega OS by model. [Fire TV OS and model list](https://developer.amazon.com/docs/fire-tv/fire-os-overview.html) |
| **Samsung Tizen** | If your model has the **Internet** app, open the HTTPS `/host` address there. On compatible models, mirror a Mac or spare iOS device via AirPlay. A laptop connected by HDMI also works. [Samsung mirroring and AirPlay](https://www.samsung.com/uk/support/tv-audio-video/what-is-screen-mirroring-and-how-do-i-use-it-with-my-samsung-tv-and-samsung-mobile-device/) |
| **LG webOS** | Open **Web Browser** from Home, then enter the HTTPS `/host` address. Compatible sets can also mirror an iPhone or iPad through AirPlay. Use HDMI if the onboard browser fails the room test. [LG webOS guide](https://www.lg.com/uk/lg-experience/lg-lab/webos-user-guide/) · [LG AirPlay model list](https://www.lg.com/us/support/help-library/how-to-use-airplay-what-lg-tvs-support-airplay-2-CT10000018-20151097893431) |
| **Hisense VIDAA, Philips Titan OS or Saphi, Panasonic My Home Screen, TiVo OS, Coolita, and other manufacturer platforms** | Open `/host` in the built-in browser if your model has one, then run the room test below. Use supported whole-screen mirroring or connect a laptop by HDMI if the browser is unavailable or fails. |
| **VIZIO Home / SmartCast, Xumo TV, and other cast-first TVs** | Use desktop Chrome tab casting on a Google Cast-compatible model, or mirror an Apple device on an AirPlay-compatible model. Use HDMI for any set with a suitable input. [Google Cast](https://support.google.com/chrome/answer/3228332) · [Xumo mirroring](https://es.support.xumo.com/hc/en-us/articles/22644030225684-Casting-and-screen-mirroring-on-Xumo-TV) |
| **Any TV or monitor with an HDMI input** | Connect a laptop or mini PC, select that HDMI input, open `/host` in its browser, and make it full screen. Select the TV as the computer's audio output if the sound stays on the laptop. This also works with older TVs and while a separate Roku, Apple TV, or Fire TV stick is attached to another input. |

**Test a TV browser before the party.** The host should show a room code and **Live room**. Join with a phone, ready up, and check that the player's Jelly appears. If the host opens but the room never becomes live, that browser may lack modern JavaScript, Web Crypto, storage, or WebSocket support. Run the host on a computer and display it with the TV's mirroring option or HDMI. Browser, casting, and mirroring compatibility depends on the model and firmware.

## Phone and tablet operating systems

| Phone or tablet OS | Controller setup |
| --- | --- |
| **iOS / iPadOS** | Scan the room QR or open the HTTPS `/play` URL in Safari. To install, choose **Share → Add to Home Screen**, turn on **Open as Web App** if offered, and tap **Add**. Open the new icon and enter the four-letter code when needed. The web app works directly in Safari too. [Apple's Home Screen setup](https://support.apple.com/guide/iphone/iphea86e5236/ios) |
| **Android** (Pixel, Samsung Galaxy / One UI, Motorola, Xiaomi / HyperOS on Android, OnePlus, and other Android variants) | Scan the QR or open `/play` in Chrome. Choose **⋮ → Install app** or **Add to Home screen**, as shown on your version. The controller also runs from the browser or the [Android APK](#android-apk). [Chrome web app help](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=en) |
| **Amazon Fire tablets / Fire OS** | Open the HTTPS `/play` address in Silk and enter the room code. Bookmark it if you want a shortcut. |
| **Huawei HarmonyOS / HarmonyOS NEXT / EMUI** | Open the HTTPS `/play` address in Huawei Browser. Use its website-to-home-screen shortcut if available. Join and ready up to check that your browser can connect to the host. [Huawei Browser shortcut instructions](https://consumer.huawei.com/cn/support/content/zh-cn00448896/) |
| **Mobile Linux** (Ubuntu Touch, Sailfish OS, postmarketOS, and similar systems) | Open `/play` in an up-to-date browser. Use the bookmark or web app menu if offered. Verify that the controller joins and that drawing works with touch before relying on the device. |
| **KaiOS or other older/limited mobile browsers** | Try the HTTPS controller link and check that **Ready up!** appears on the TV. If the browser can't connect or display the controls, use a supported phone, tablet, or the browser on a spare laptop. |

Phone home-screen installation is optional. Each controller needs its own nickname. If a player opens an installed controller instead of scanning the QR, enter the current room code manually.

## Android APK

The native wrapper targets Android phones and Android TV / Google TV using one APK. The repository's debug-signed APK connects to the [public Dash Arcade multiplayer site](https://dash-arcade.thrivingnacre16.chatgpt.site/) out of the box. To use your own site or Supabase project, set the values from [the online setup](#put-the-arcade-online-for-phones) and build your own APK.

### Extract the APK from source

Run `node scripts/extract-preview-apk.mjs` from the repository root. It combines the checked-in parts, checks the SHA-256, and creates `downloads/Dash-Arcade-v2-debug.apk`. Use that path with the install steps below. The assembled file matches the hosted multiplayer build.

### Build

1. Install Node.js 22 or later, JDK 21, and [Android Studio / Capacitor prerequisites](https://capacitorjs.com/docs/getting-started/environment-setup). In Android Studio's SDK Manager, install **Android SDK Platform 36**, **Build-Tools**, and **Platform-Tools**.
2. Set `JAVA_HOME` and `ANDROID_HOME` if your terminal does not already locate Java and the SDK.
3. From the repository root, with `.env.local` configured for cross-device play:
   ```sh
   npm ci
   npm run android:apk
   ```
4. Use `android/app/build/outputs/apk/debug/app-debug.apk`. Use `npm run android:prepare` to generate the Android Studio project first if you prefer to build in the IDE.

### Install on an Android phone

For ADB, enable **Developer options → USB debugging**, connect the phone by USB, then approve the debugging prompt on the phone.

```sh
adb devices
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Alternatively, transfer the APK to the phone, open it in the system file manager, and follow Android's install prompt. Close the installer and launch **Dash Arcade**. It opens the controller. [Android hardware deployment](https://developer.android.com/studio/run/device)

### Install on Google TV or Android TV

**Get the APK onto your computer first.** [Download the v2 APK from Releases](https://github.com/TwinSailsStudios/DASH-ARCADE/releases), [extract it from source](#extract-the-apk-from-source), or [build it for your own deployment](#build). The commands below use the locally built APK's path. For a release or extracted APK, substitute the path to the file on your computer.

#### Wi-Fi sideload with ADB

1. Put your computer and TV on the same local network. Install [Android SDK Platform-Tools](https://developer.android.com/tools/releases/platform-tools) on the computer. Run `adb version` to confirm it is on your PATH. If you opened a terminal in the Platform-Tools folder instead, use `./adb` on macOS or Linux and `.\adb.exe` in Windows PowerShell.
2. On the TV, open **Settings → System → About**. On some TVs it is under **Settings → Device Preferences → About**. Highlight **Android TV OS build** (sometimes **Build**) and press the remote's center button seven times, until the developer message appears.
3. Return to **Settings → System → Developer options** and turn on **Wireless debugging**, if shown. Open **Pair device with pairing code**. Replace the example IP and ports below with the values displayed on your TV:
   ```sh
   adb pair 192.168.1.50:37123
   adb connect 192.168.1.50:37345
   adb devices
   ```
   Enter the six-digit code when prompted. The first port comes from the **pairing dialog**. The second comes from the main **Wireless debugging** screen. If your TV provides a legacy **Network debugging** address instead, enable it and run `adb connect TV_IP:PORT` using the address it shows. Approve the TV's connection prompt. [Google's ADB wireless setup](https://developer.android.com/tools/adb#wireless)
4. Confirm `adb devices` lists the TV with status `device`. If a phone or emulator is also connected, copy the TV's first-column value and use it with `-s`. Run the following from the repository root:
   ```sh
   adb -s 192.168.1.50:37345 install -r "android/app/build/outputs/apk/debug/app-debug.apk"
   ```
   Replace `192.168.1.50:37345` with your TV's value. Wait for **Success**.
5. On the TV, go to **Home → Apps → Dash Arcade**. If the tile hasn't appeared yet, launch it once over ADB:
   ```sh
   adb -s 192.168.1.50:37345 shell am start -n com.pratikdash.arcade/.MainActivity
   ```
   Use your TV's value in this command as well. When the lobby opens, scan its QR from a phone or enter the room code manually.

#### USB drive sideload on compatible TVs

If your TV can read USB storage and allows APK installation from a file manager:

1. Copy the `.apk` file from your computer to a USB flash drive. Plug the drive into the TV.
2. On the TV, open a file manager that can browse the drive and select the APK. If Android asks, allow **Install unknown apps** for that file manager in the settings screen it opens, then return to the APK and select **Install**.
3. Select **Open** or find **Dash Arcade** under **Home → Apps**. If the TV's firmware or administrator restricts APK installs, use the [TV browser, mirroring, or HDMI option](#tv-operating-systems).

## Start game night

1. Open one host session and leave it visible on the TV.
2. On every phone, join the same room, choose a Jelly, and select **Ready up!**
3. With at least two players, the TV starts a three-second countdown when everyone in the lobby is ready. The host can also select **Start Game Night**. Choose the next game on the phones when voting opens.
4. If a phone can't find the host, check the four letters, verify the host says **Live room**, and make sure the APK and website were built with the same Supabase project. If the QR points to localhost, enter the public `/play` URL and code, then rebuild with `NEXT_PUBLIC_ARCADE_ORIGIN`.
5. Use **Right** to move to the next TV control and **Left** to go back. Focus wraps at either end. On the TV app, the six-track soundtrack starts and rotates automatically. In a browser, press a key or click the host once if autoplay is blocked. Use **Party music** to pause, skip, pick a track, or share a Spotify Jam (below). Keep the original host open when casting or mirroring.

## Spotify Now Playing on Android TV

1. Open **Party music → Open Spotify on TV** from the Dash Arcade APK. Install Spotify from the TV’s Play Store if prompted. Sign in to Spotify using its TV sign-in flow.
2. Back in Dash Arcade, use **Party music → Enable Spotify Now Playing**. In Android’s Notification access settings, allow **Dash Arcade Now Playing**.
3. Play a track in Spotify, or select the TV from Spotify Connect on your phone. Return to Dash Arcade. The title and artist appear in the header while Spotify exposes a media session. **Skip Spotify track** appears in **Party music** when Spotify allows skipping.

Spotify handles playback on the TV. Android notification access lets Dash Arcade query Spotify’s media session. The app reads track details and playback state locally and does not collect notifications or share the track with the room. You can revoke access from Android’s Notification access settings.

## Shared Spotify queue

1. On the TV, open **Party music → Spotify Jam** and scan the setup QR code with your phone camera.
2. On the phone, open **Top 100 all-time**, **Today’s Global Top 50**, or a playlist you like in Spotify. Start a Jam and choose a speaker connected to Spotify or Bluetooth.
3. In Spotify, tap **Invite → Share link**. Paste the link on the phone’s Dash Arcade page and tap **Send invite to the TV**.
4. On the TV, select **Share invite with this room**. The QR code changes to the Spotify invite and the built-in soundtrack pauses.
5. Guests scan the invite QR code or tap **Join Spotify Jam · Add songs** on their controller. They add tracks to the queue inside Spotify.
6. End the Jam in Spotify and select **Remove invite and resume arcade music** to restore the built-in soundtrack.

The person starting the Jam needs Spotify Premium. Free Spotify accounts can join and add songs in person. [Spotify’s Jam instructions](https://support.spotify.com/us/article/jam/).
