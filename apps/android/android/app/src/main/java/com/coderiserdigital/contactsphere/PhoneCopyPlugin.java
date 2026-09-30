package com.coderiserdigital.contactsphere;

import android.Manifest;
import android.accounts.Account;
import android.accounts.AccountManager;
import android.content.ContentProviderOperation;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract;
import android.provider.ContactsContract.CommonDataKinds.Email;
import android.provider.ContactsContract.CommonDataKinds.Organization;
import android.provider.ContactsContract.CommonDataKinds.Phone;
import android.provider.ContactsContract.CommonDataKinds.StructuredName;
import android.provider.ContactsContract.Data;
import android.provider.ContactsContract.RawContacts;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * "Put my contacts on this phone" (P5c, ADR 0025). Writes the owner's
 * Contact Sphere contacts into Android's Contacts under the app's own
 * "Contact Sphere" account — never into Google, Samsung or SIM contacts.
 * Android links each one with the same person already on the phone, so the
 * Contacts app shows one entry, not two. Running it again updates in place
 * (by the contact's id), skips what did not change and removes only
 * contacts this app wrote that are gone from Contact Sphere. "Remove from
 * this phone" deletes the account, which removes exactly these contacts.
 */
@CapacitorPlugin(
    name = "PhoneCopy",
    permissions = {
        @Permission(alias = "contacts", strings = { Manifest.permission.READ_CONTACTS, Manifest.permission.WRITE_CONTACTS })
    }
)
public class PhoneCopyPlugin extends Plugin {

    static final String ACCOUNT_TYPE = "com.coderiserdigital.contactsphere";
    static final String ACCOUNT_NAME = "Contact Sphere";
    private static final int MAX_CONTACTS = 5000;
    /** One contact's operations never exceed this; batches are cut between contacts. */
    private static final int BATCH = 300;

    @PluginMethod
    public void writeAll(PluginCall call) {
        if (getPermissionState("contacts") != PermissionState.GRANTED) {
            requestPermissionForAlias("contacts", call, "afterPermissionWrite");
            return;
        }
        getBridge().execute(() -> write(call));
    }

    @PermissionCallback
    private void afterPermissionWrite(PluginCall call) {
        if (getPermissionState("contacts") == PermissionState.GRANTED) {
            getBridge().execute(() -> write(call));
        } else {
            call.reject("Permission to change contacts was not given.", "PERMISSION_DENIED");
        }
    }

    @PluginMethod
    public void removeAll(PluginCall call) {
        if (getPermissionState("contacts") != PermissionState.GRANTED) {
            requestPermissionForAlias("contacts", call, "afterPermissionRemove");
            return;
        }
        getBridge().execute(() -> remove(call));
    }

    @PermissionCallback
    private void afterPermissionRemove(PluginCall call) {
        if (getPermissionState("contacts") == PermissionState.GRANTED) {
            getBridge().execute(() -> remove(call));
        } else {
            call.reject("Permission to change contacts was not given.", "PERMISSION_DENIED");
        }
    }

    /** How many contacts this app has on the phone (0 without permission). */
    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("count", getPermissionState("contacts") == PermissionState.GRANTED ? existing().size() : 0);
        call.resolve(r);
    }

    private void write(PluginCall call) {
        try {
            JSONArray list = call.getArray("contacts", new JSArray());
            if (list.length() > MAX_CONTACTS) {
                call.reject("Too many contacts.", "TOO_MANY");
                return;
            }
            Account account = new Account(ACCOUNT_NAME, ACCOUNT_TYPE);
            AccountManager.get(getContext()).addAccountExplicitly(account, null, null);
            showUngrouped();

            Map<String, String[]> before = existing(); // source id → {raw id, hash}
            Set<String> seen = new HashSet<>();
            ArrayList<ContentProviderOperation> ops = new ArrayList<>();
            int added = 0, updated = 0, unchanged = 0, removed = 0;
            for (int i = 0; i < list.length(); i++) {
                JSONObject c = list.getJSONObject(i);
                String id = c.optString("id", "");
                if (id.isEmpty() || !seen.add(id)) continue;
                String hash = hash(c);
                String[] old = before.get(id);
                if (old != null && hash.equals(old[1])) {
                    unchanged++;
                    continue;
                }
                if (old != null) {
                    long raw = Long.parseLong(old[0]);
                    ops.add(ContentProviderOperation.newDelete(asSyncAdapter(Data.CONTENT_URI))
                        .withSelection(Data.RAW_CONTACT_ID + "=?", new String[] { old[0] })
                        .build());
                    ops.add(ContentProviderOperation.newUpdate(asSyncAdapter(RawContacts.CONTENT_URI))
                        .withSelection(RawContacts._ID + "=?", new String[] { old[0] })
                        .withValue(RawContacts.SYNC1, hash)
                        .build());
                    addData(ops, c, raw, -1);
                    updated++;
                } else {
                    int back = ops.size();
                    ops.add(ContentProviderOperation.newInsert(asSyncAdapter(RawContacts.CONTENT_URI))
                        .withValue(RawContacts.ACCOUNT_TYPE, ACCOUNT_TYPE)
                        .withValue(RawContacts.ACCOUNT_NAME, ACCOUNT_NAME)
                        .withValue(RawContacts.SOURCE_ID, id)
                        .withValue(RawContacts.SYNC1, hash)
                        .build());
                    addData(ops, c, -1, back);
                    added++;
                }
                if (ops.size() >= BATCH) flush(ops);
            }
            for (Map.Entry<String, String[]> e : before.entrySet()) {
                if (seen.contains(e.getKey())) continue;
                ops.add(ContentProviderOperation.newDelete(asSyncAdapter(RawContacts.CONTENT_URI))
                    .withSelection(RawContacts._ID + "=?", new String[] { e.getValue()[0] })
                    .build());
                removed++;
                if (ops.size() >= BATCH) flush(ops);
            }
            flush(ops);
            JSObject r = new JSObject();
            r.put("added", added);
            r.put("updated", updated);
            r.put("unchanged", unchanged);
            r.put("removed", removed);
            call.resolve(r);
        } catch (SecurityException e) {
            call.reject("Permission to change contacts was not given.", "PERMISSION_DENIED");
        } catch (Exception e) {
            call.reject("The phone's contacts could not be updated.", "FAILED");
        }
    }

    private void remove(PluginCall call) {
        try {
            int count = existing().size();
            getContext().getContentResolver().delete(asSyncAdapter(RawContacts.CONTENT_URI), accountWhere(), accountArgs());
            AccountManager.get(getContext()).removeAccountExplicitly(new Account(ACCOUNT_NAME, ACCOUNT_TYPE));
            JSObject r = new JSObject();
            r.put("removed", count);
            call.resolve(r);
        } catch (SecurityException e) {
            call.reject("Permission to change contacts was not given.", "PERMISSION_DENIED");
        } catch (Exception e) {
            call.reject("The phone's contacts could not be updated.", "FAILED");
        }
    }

    /** Name, work, numbers and emails for one contact. */
    private static void addData(ArrayList<ContentProviderOperation> ops, JSONObject c, long raw, int back) {
        ContentValues name = new ContentValues();
        name.put(Data.MIMETYPE, StructuredName.CONTENT_ITEM_TYPE);
        name.put(StructuredName.DISPLAY_NAME, text(c, "displayName"));
        put(name, StructuredName.GIVEN_NAME, text(c, "givenName"));
        put(name, StructuredName.FAMILY_NAME, text(c, "familyName"));
        ops.add(dataInsert(name, raw, back));

        String org = text(c, "organization");
        String title = text(c, "jobTitle");
        if (!org.isEmpty() || !title.isEmpty()) {
            ContentValues o = new ContentValues();
            o.put(Data.MIMETYPE, Organization.CONTENT_ITEM_TYPE);
            put(o, Organization.COMPANY, org);
            put(o, Organization.TITLE, title);
            ops.add(dataInsert(o, raw, back));
        }

        JSONArray phones = c.optJSONArray("phones");
        for (int i = 0; phones != null && i < phones.length(); i++) {
            JSONObject p = phones.optJSONObject(i);
            if (p == null || text(p, "number").isEmpty()) continue;
            ContentValues v = new ContentValues();
            v.put(Data.MIMETYPE, Phone.CONTENT_ITEM_TYPE);
            v.put(Phone.NUMBER, text(p, "number"));
            String label = text(p, "label").toLowerCase();
            int type = label.isEmpty() || label.equals("mobile") || label.equals("cell")
                ? Phone.TYPE_MOBILE
                : label.equals("home") ? Phone.TYPE_HOME : label.equals("work") ? Phone.TYPE_WORK : Phone.TYPE_CUSTOM;
            v.put(Phone.TYPE, type);
            if (type == Phone.TYPE_CUSTOM) v.put(Phone.LABEL, text(p, "label"));
            ops.add(dataInsert(v, raw, back));
        }

        JSONArray emails = c.optJSONArray("emails");
        for (int i = 0; emails != null && i < emails.length(); i++) {
            JSONObject e = emails.optJSONObject(i);
            if (e == null || text(e, "address").isEmpty()) continue;
            ContentValues v = new ContentValues();
            v.put(Data.MIMETYPE, Email.CONTENT_ITEM_TYPE);
            v.put(Email.ADDRESS, text(e, "address"));
            String label = text(e, "label").toLowerCase();
            v.put(Email.TYPE, label.equals("work") ? Email.TYPE_WORK : label.equals("home") ? Email.TYPE_HOME : Email.TYPE_OTHER);
            ops.add(dataInsert(v, raw, back));
        }
    }

    private static ContentProviderOperation dataInsert(ContentValues v, long raw, int back) {
        ContentProviderOperation.Builder b = ContentProviderOperation.newInsert(asSyncAdapter(Data.CONTENT_URI)).withValues(v);
        return raw >= 0 ? b.withValue(Data.RAW_CONTACT_ID, raw).build() : b.withValueBackReference(Data.RAW_CONTACT_ID, back).build();
    }

    private void flush(ArrayList<ContentProviderOperation> ops) throws Exception {
        if (ops.isEmpty()) return;
        getContext().getContentResolver().applyBatch(ContactsContract.AUTHORITY, ops);
        ops.clear();
    }

    /** Our contacts already on the phone: source id → {raw contact id, hash}. */
    private Map<String, String[]> existing() {
        Map<String, String[]> out = new HashMap<>();
        String[] cols = { RawContacts._ID, RawContacts.SOURCE_ID, RawContacts.SYNC1 };
        try (Cursor c = getContext().getContentResolver().query(RawContacts.CONTENT_URI, cols, accountWhere() + " AND " + RawContacts.DELETED + "=0", accountArgs(), null)) {
            while (c != null && c.moveToNext()) {
                String sid = c.getString(1);
                if (sid != null) out.put(sid, new String[] { c.getString(0), c.getString(2) });
            }
        }
        return out;
    }

    /** Contacts of this account show in "All contacts", not only in a group. */
    private void showUngrouped() {
        ContentResolver cr = getContext().getContentResolver();
        ContentValues v = new ContentValues();
        v.put(ContactsContract.Settings.ACCOUNT_NAME, ACCOUNT_NAME);
        v.put(ContactsContract.Settings.ACCOUNT_TYPE, ACCOUNT_TYPE);
        v.put(ContactsContract.Settings.UNGROUPED_VISIBLE, 1);
        try {
            cr.insert(asSyncAdapter(ContactsContract.Settings.CONTENT_URI), v);
        } catch (Exception ignored) {
            // Already there.
        }
    }

    private static String accountWhere() {
        return RawContacts.ACCOUNT_TYPE + "=? AND " + RawContacts.ACCOUNT_NAME + "=?";
    }

    private static String[] accountArgs() {
        return new String[] { ACCOUNT_TYPE, ACCOUNT_NAME };
    }

    private static Uri asSyncAdapter(Uri uri) {
        return uri.buildUpon()
            .appendQueryParameter(ContactsContract.CALLER_IS_SYNCADAPTER, "true")
            .appendQueryParameter(RawContacts.ACCOUNT_NAME, ACCOUNT_NAME)
            .appendQueryParameter(RawContacts.ACCOUNT_TYPE, ACCOUNT_TYPE)
            .build();
    }

    private static String text(JSONObject o, String key) {
        return o.isNull(key) ? "" : o.optString(key, "").trim();
    }

    private static void put(ContentValues v, String key, String value) {
        if (!value.isEmpty()) v.put(key, value);
    }

    /** Changes when anything the phone shows changes. */
    private static String hash(JSONObject c) throws Exception {
        StringBuilder s = new StringBuilder();
        for (String k : new String[] { "displayName", "givenName", "familyName", "organization", "jobTitle" }) {
            s.append(text(c, k)).append('\u0001');
        }
        for (String arr : new String[] { "phones", "emails" }) {
            JSONArray a = c.optJSONArray(arr);
            for (int i = 0; a != null && i < a.length(); i++) {
                JSONObject x = a.optJSONObject(i);
                if (x == null) continue;
                s.append(text(x, "number")).append(text(x, "address")).append('|').append(text(x, "label")).append('\u0002');
            }
            s.append('\u0001');
        }
        byte[] d = MessageDigest.getInstance("SHA-256").digest(s.toString().getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder();
        for (byte b : d) hex.append(String.format("%02x", b));
        return hex.toString();
    }
}
