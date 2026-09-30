package com.coderiserdigital.contactsphere;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Our own plugins must be registered before the bridge starts.
        registerPlugin(PhoneContactsPlugin.class);
        registerPlugin(AppSignInPlugin.class);
        registerPlugin(PhoneCopyPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
