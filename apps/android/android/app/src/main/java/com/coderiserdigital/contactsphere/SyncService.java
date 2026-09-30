package com.coderiserdigital.contactsphere;

import android.accounts.Account;
import android.app.Service;
import android.content.AbstractThreadedSyncAdapter;
import android.content.ContentProviderClient;
import android.content.Context;
import android.content.Intent;
import android.content.SyncResult;
import android.os.Bundle;
import android.os.IBinder;

/**
 * Declares that the "Contact Sphere" account holds contacts, which is what
 * makes the phone's Contacts app show them (P5c, ADR 0025). It does nothing
 * on its own yet: the app writes the contacts when the owner asks. Automatic
 * two-way sync is P5d.
 */
public class SyncService extends Service {

    private static final Object LOCK = new Object();
    private static Adapter adapter;

    @Override
    public void onCreate() {
        synchronized (LOCK) {
            if (adapter == null) adapter = new Adapter(getApplicationContext());
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return adapter.getSyncAdapterBinder();
    }

    static class Adapter extends AbstractThreadedSyncAdapter {

        Adapter(Context context) {
            super(context, true);
        }

        @Override
        public void onPerformSync(Account account, Bundle extras, String authority, ContentProviderClient provider, SyncResult result) {
            // Nothing yet: see the class comment.
        }
    }
}
