package com.pratikdash.arcade;

import android.app.UiModeManager;
import android.content.Context;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String SAVED_PAGE = "dash_arcade_page";
    private boolean television;

    @Override
    public void onCreate(Bundle state) {
        UiModeManager mode = (UiModeManager) getSystemService(Context.UI_MODE_SERVICE);
        television = mode != null && mode.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION;
        if (television) setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat insets = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        insets.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        insets.hide(WindowInsetsCompat.Type.systemBars());

        if (getBridge() != null) {
            String origin = getBridge().getLocalUrl();
            String savedPage = state == null ? null : state.getString(SAVED_PAGE);
            String screen = television ? "host" : "play";
            String start = origin + "/" + screen + "/index.html";
            if (savedPage != null && savedPage.startsWith(origin + "/")) start = savedPage;
            if (television) getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
            getBridge().getWebView().loadUrl(start);
        }
    }

    @Override
    public void onSaveInstanceState(Bundle state) {
        if (getBridge() != null && getBridge().getWebView() != null) {
            state.putString(SAVED_PAGE, getBridge().getWebView().getUrl());
        }
        super.onSaveInstanceState(state);
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (television && event.getKeyCode() == KeyEvent.KEYCODE_BACK && event.getAction() == KeyEvent.ACTION_UP &&
                getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().evaluateJavascript(
                "(function(){ return window.dispatchEvent(new KeyboardEvent('keydown', {key:'Back',cancelable:true})); })()",
                value -> { if ("true".equals(value)) handleSystemBack(); }
            );
            return true;
        }
        return super.dispatchKeyEvent(event);
    }

    private void handleSystemBack() {
        if (getBridge().getWebView().canGoBack()) getBridge().getWebView().goBack();
        else finish();
    }
}
