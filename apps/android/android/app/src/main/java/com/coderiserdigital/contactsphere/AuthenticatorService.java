package com.coderiserdigital.contactsphere;

import android.accounts.AbstractAccountAuthenticator;
import android.accounts.Account;
import android.accounts.AccountAuthenticatorResponse;
import android.accounts.NetworkErrorException;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.IBinder;

/**
 * Registers the "Contact Sphere" account type with Android (P5c, ADR 0025).
 * It holds no password or token: signing in is the app's job. The account
 * only gives our contacts their own place in the phone's Contacts, so the
 * owner's other contacts are never touched and removing the account removes
 * exactly ours.
 */
public class AuthenticatorService extends Service {

    private Authenticator authenticator;

    @Override
    public void onCreate() {
        authenticator = new Authenticator(this);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return authenticator.getIBinder();
    }

    static class Authenticator extends AbstractAccountAuthenticator {

        Authenticator(Context context) {
            super(context);
        }

        @Override
        public Bundle editProperties(AccountAuthenticatorResponse r, String accountType) {
            throw new UnsupportedOperationException();
        }

        /** Added only by the app, never from Settings → Accounts → Add. */
        @Override
        public Bundle addAccount(AccountAuthenticatorResponse r, String accountType, String authTokenType, String[] features, Bundle options) {
            return null;
        }

        @Override
        public Bundle confirmCredentials(AccountAuthenticatorResponse r, Account account, Bundle options) {
            return null;
        }

        @Override
        public Bundle getAuthToken(AccountAuthenticatorResponse r, Account account, String authTokenType, Bundle options) throws NetworkErrorException {
            throw new UnsupportedOperationException();
        }

        @Override
        public String getAuthTokenLabel(String authTokenType) {
            return null;
        }

        @Override
        public Bundle updateCredentials(AccountAuthenticatorResponse r, Account account, String authTokenType, Bundle options) {
            return null;
        }

        @Override
        public Bundle hasFeatures(AccountAuthenticatorResponse r, Account account, String[] features) {
            Bundle result = new Bundle();
            result.putBoolean(android.accounts.AccountManager.KEY_BOOLEAN_RESULT, false);
            return result;
        }
    }
}
