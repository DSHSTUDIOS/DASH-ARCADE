package com.pratikdash.arcade;

import android.app.NotificationManager;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Intent;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.service.notification.NotificationListenerService;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "TvMusic")
public class TvMusicPlugin extends Plugin {
    private static final String SPOTIFY = "com.spotify.tv.android";

    // Android requires an approved listener to expose other apps' media sessions.
    // This service does not read, record, or forward notifications.
    public static class MediaAccess extends NotificationListenerService {}

    private ComponentName listener() {
        return new ComponentName(getContext(), MediaAccess.class);
    }

    private boolean hasAccess() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            return getContext().getSystemService(NotificationManager.class)
                .isNotificationListenerAccessGranted(listener());
        }
        String enabled = Settings.Secure.getString(
            getContext().getContentResolver(), "enabled_notification_listeners");
        if (enabled == null) return false;
        for (String component : enabled.split(":")) {
            if (listener().equals(ComponentName.unflattenFromString(component))) return true;
        }
        return false;
    }

    private MediaController spotifySession() {
        MediaSessionManager manager = getContext().getSystemService(MediaSessionManager.class);
        if (manager == null) return null;
        try {
            for (MediaController controller : manager.getActiveSessions(listener())) {
                if (SPOTIFY.equals(controller.getPackageName())) return controller;
            }
        } catch (SecurityException ignored) {
            // Access may be revoked between reading settings and querying a session.
        }
        return null;
    }

    @PluginMethod
    public void nowPlaying(PluginCall call) {
        JSObject result = new JSObject();
        boolean granted = hasAccess();
        result.put("granted", granted);
        MediaController controller = granted ? spotifySession() : null;
        if (controller != null) {
            MediaMetadata track = controller.getMetadata();
            PlaybackState playback = controller.getPlaybackState();
            if (track != null) {
                result.put("title", track.getString(MediaMetadata.METADATA_KEY_TITLE));
                result.put("artist", track.getString(MediaMetadata.METADATA_KEY_ARTIST));
            }
            if (playback != null) {
                int state = playback.getState();
                result.put("playing", state == PlaybackState.STATE_PLAYING
                    || state == PlaybackState.STATE_BUFFERING
                    || state == PlaybackState.STATE_CONNECTING);
                result.put("canSkip", (playback.getActions() & PlaybackState.ACTION_SKIP_TO_NEXT) != 0);
            }
        }
        call.resolve(result);
    }

    @PluginMethod
    public void skip(PluginCall call) {
        MediaController controller = hasAccess() ? spotifySession() : null;
        PlaybackState state = controller == null ? null : controller.getPlaybackState();
        if (state == null || (state.getActions() & PlaybackState.ACTION_SKIP_TO_NEXT) == 0) {
            call.reject("Spotify can’t skip this track right now.");
            return;
        }
        controller.getTransportControls().skipToNext();
        call.resolve();
    }

    @PluginMethod
    public void openAccessSettings(PluginCall call) {
        launch(call, new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS),
            "This TV does not expose notification access settings.");
    }

    @PluginMethod
    public void openSpotify(PluginCall call) {
        Intent spotify = getContext().getPackageManager().getLeanbackLaunchIntentForPackage(SPOTIFY);
        Intent store = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + SPOTIFY));
        launch(call, spotify == null ? store : spotify, "Open Spotify from your TV’s apps.");
    }

    private void launch(PluginCall call, Intent intent, String error) {
        getActivity().runOnUiThread(() -> {
            try {
                getActivity().startActivity(intent);
                call.resolve();
            } catch (ActivityNotFoundException | SecurityException unavailable) {
                call.reject(error);
            }
        });
    }
}
