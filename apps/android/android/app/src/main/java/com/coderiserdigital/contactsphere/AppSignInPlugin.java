package com.coderiserdigital.contactsphere;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.util.Base64;
import androidx.browser.customtabs.CustomTabsIntent;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.regex.Pattern;

/**
 * "Continue with Google" inside the app (P5b, ADR 0025). Google refuses to
 * sign in inside an app's web view, so sign-in happens in a Chrome tab.
 *
 * 1. A random secret (verifier) stays in the app; only its SHA-256
 *    (challenge) goes to the browser.
 * 2. After Google, the site gives the browser a single-use code and a
 *    button that opens contactsphere://signin?code=… in this app only.
 * 3. The app opens /auth/app#code=…&v=verifier in its own web view, where
 *    the site trades both for a session. The fragment never reaches a
 *    server log; a code caught by anyone else is useless without the
 *    verifier.
 */
@CapacitorPlugin(name = "AppSignIn")
public class AppSignInPlugin extends Plugin {

    private static final String PREFS = "app-sign-in";
    private static final long MAX_AGE_MS = 10 * 60 * 1000;
    private static final Pattern B64URL_43 = Pattern.compile("^[A-Za-z0-9_-]{43}$");

    @Override
    public void load() {
        // Opened from the browser while the app was closed.
        Intent launch = getActivity().getIntent();
        if (isSignIn(launch)) {
            // After the bridge has loaded its first page.
            getBridge().getWebView().post(() -> finish(launch));
        }
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        if (isSignIn(intent)) finish(intent);
    }

    @PluginMethod
    public void google(PluginCall call) {
        byte[] random = new byte[32];
        new SecureRandom().nextBytes(random);
        String verifier = b64url(random);
        String challenge;
        try {
            challenge = b64url(MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII)));
        } catch (NoSuchAlgorithmException e) {
            call.reject("Sign-in is not available on this phone.");
            return;
        }
        prefs().edit().putString("verifier", verifier).putLong("at", System.currentTimeMillis()).apply();
        Uri url = Uri.parse(origin() + "/auth/google?app=" + challenge);
        new CustomTabsIntent.Builder().build().launchUrl(getActivity(), url);
        call.resolve();
    }

    private static boolean isSignIn(Intent intent) {
        Uri data = intent == null ? null : intent.getData();
        return data != null && "contactsphere".equals(data.getScheme()) && "signin".equals(data.getHost());
    }

    private void finish(Intent intent) {
        String code = intent.getData().getQueryParameter("code");
        // Handled once: a later restart must not replay it.
        intent.setData(null);
        SharedPreferences p = prefs();
        String verifier = p.getString("verifier", null);
        long at = p.getLong("at", 0);
        p.edit().remove("verifier").remove("at").apply();
        boolean fresh = System.currentTimeMillis() - at < MAX_AGE_MS;
        if (code == null || verifier == null || !fresh || !B64URL_43.matcher(code).matches()) {
            getBridge().getWebView().loadUrl(origin() + "/login?google=expired");
            return;
        }
        getBridge().getWebView().loadUrl(origin() + "/auth/app#code=" + code + "&v=" + verifier);
    }

    /** https://host of the site the app shows (from capacitor.config.json). */
    private String origin() {
        Uri u = Uri.parse(getBridge().getConfig().getServerUrl());
        return u.getScheme() + "://" + u.getAuthority();
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static String b64url(byte[] bytes) {
        return Base64.encodeToString(bytes, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
    }
}
