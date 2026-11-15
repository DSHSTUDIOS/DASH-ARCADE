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

The native wrapper targets Android phones and Android TV / Google TV using one APK. The repository's debug download is a build preview. A live game across devices requires a build with your own Supabase values and the public HTTPS arcade origin from [the online setup](#put-the-arcade-online-for-phones).

### Extract the preview APK

Run `node scripts/extract-preview-apk.mjs` from the repository root. It combines the checked-in parts, checks the SHA-256, and creates `downloads/Dash-Arcade-v2-debug.apk`. Use that path with the install steps below to inspect the app on a device. Use the build steps to create an APK that connects to your deployed arcade.

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

1. Open **Settings → System → About** (on older sets, **Device Preferences → About**) and select the build entry repeatedly until Developer options becomes available. Menu names vary by model.
2. Open **Developer options** and enable **Wireless debugging** on a TV that offers it. Put the computer and TV on the same network. With a modern paired connection, use the IP and **pairing port** shown by the pairing dialog, then the **connection port** shown on the main Wireless debugging screen:
   ```sh
   adb pair TV_IP:PAIRING_PORT
   adb connect TV_IP:CONNECTION_PORT
   adb devices
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```
   For a TV that exposes a legacy network debugging address, use `adb connect TV_IP:PORT` with the address shown by the device instead. Use `adb -s TV_IP:CONNECTION_PORT install -r android/app/build/outputs/apk/debug/app-debug.apk` when multiple Android devices are connected.
3. Return to the home screen and launch **Dash Arcade** from **Apps**. The TV opens the host. Point the phones at the lobby QR or give them the four-letter code. [ADB wireless device setup](https://developer.android.com/tools/adb#wireless)

## Start game night

1. Open one host session and leave it visible on the TV.
2. On every phone, join the same room, choose a Jelly, and select **Ready up!**
3. Start with at least two ready players. Choose the next game on the phones when voting opens.
4. If a phone can't find the host, check the four letters, verify the host says **Live room**, and make sure the APK and website were built with the same Supabase project. If the QR points to localhost, enter the public `/play` URL and code, then rebuild with `NEXT_PUBLIC_ARCADE_ORIGIN`.
5. For sound, press a remote key or click the host once, then use the headphone control to start music. Keep the original host open when casting or mirroring.
