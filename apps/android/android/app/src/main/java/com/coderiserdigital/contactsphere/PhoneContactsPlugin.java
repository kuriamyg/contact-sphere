package com.coderiserdigital.contactsphere;

import android.Manifest;
import android.content.ContentResolver;
import android.database.Cursor;
import android.provider.ContactsContract.CommonDataKinds.Email;
import android.provider.ContactsContract.CommonDataKinds.Organization;
import android.provider.ContactsContract.CommonDataKinds.Phone;
import android.provider.ContactsContract.CommonDataKinds.StructuredName;
import android.provider.ContactsContract.Contacts;
import android.provider.ContactsContract.Data;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Reads the phone's own address book for "Import from this phone" (P5a,
 * ADR 0025). Read-only: this plugin never writes, edits or deletes a phone
 * contact. Only runs after the owner taps the button and Android's own
 * permission prompt is accepted. Nothing leaves the phone until the owner
 * confirms the import preview in the app.
 */
@CapacitorPlugin(
    name = "PhoneContacts",
    permissions = { @Permission(alias = "contacts", strings = { Manifest.permission.READ_CONTACTS }) }
)
public class PhoneContactsPlugin extends Plugin {

    /** The same ceiling as a .vcf import. */
    private static final int MAX_CONTACTS = 5000;

    @PluginMethod
    public void readAll(PluginCall call) {
        if (getPermissionState("contacts") != PermissionState.GRANTED) {
            requestPermissionForAlias("contacts", call, "afterPermission");
            return;
        }
        read(call);
    }

    @PermissionCallback
    private void afterPermission(PluginCall call) {
        if (getPermissionState("contacts") == PermissionState.GRANTED) {
            read(call);
        } else {
            call.reject("Permission to read contacts was not given.", "PERMISSION_DENIED");
        }
    }

    private void read(PluginCall call) {
        Map<Long, JSObject> people = new LinkedHashMap<>();
        Map<Long, JSArray> phones = new LinkedHashMap<>();
        Map<Long, JSArray> emails = new LinkedHashMap<>();
        ContentResolver cr = getContext().getContentResolver();
        String[] columns = {
            Data.CONTACT_ID,
            Data.MIMETYPE,
            Data.DATA1,
            Data.DATA2,
            Data.DATA3,
            Data.DATA4,
            Contacts.DISPLAY_NAME_PRIMARY
        };
        String where = Data.MIMETYPE + " IN (?, ?, ?, ?)";
        String[] args = {
            StructuredName.CONTENT_ITEM_TYPE,
            Phone.CONTENT_ITEM_TYPE,
            Email.CONTENT_ITEM_TYPE,
            Organization.CONTENT_ITEM_TYPE
        };
        try (Cursor c = cr.query(Data.CONTENT_URI, columns, where, args, Data.CONTACT_ID)) {
            if (c == null) {
                call.reject("The address book could not be read.", "UNREADABLE");
                return;
            }
            while (c.moveToNext()) {
                long id = c.getLong(0);
                JSObject p = people.get(id);
                if (p == null) {
                    if (people.size() >= MAX_CONTACTS) continue;
                    p = new JSObject();
                    p.put("displayName", nz(c.getString(6)));
                    people.put(id, p);
                    phones.put(id, new JSArray());
                    emails.put(id, new JSArray());
                }
                String mime = c.getString(1);
                if (StructuredName.CONTENT_ITEM_TYPE.equals(mime)) {
                    // DATA2 given name, DATA3 family name.
                    p.put("givenName", nz(c.getString(3)));
                    p.put("familyName", nz(c.getString(4)));
                } else if (Phone.CONTENT_ITEM_TYPE.equals(mime)) {
                    JSObject ph = new JSObject();
                    ph.put("number", nz(c.getString(2)));
                    ph.put("label", phoneLabel(c.isNull(3) ? 0 : c.getInt(3)));
                    phones.get(id).put(ph);
                } else if (Email.CONTENT_ITEM_TYPE.equals(mime)) {
                    JSObject em = new JSObject();
                    em.put("address", nz(c.getString(2)));
                    emails.get(id).put(em);
                } else if (Organization.CONTENT_ITEM_TYPE.equals(mime)) {
                    // DATA1 company, DATA4 title.
                    p.put("organization", nz(c.getString(2)));
                    p.put("jobTitle", nz(c.getString(5)));
                }
            }
        } catch (SecurityException e) {
            call.reject("Permission to read contacts was not given.", "PERMISSION_DENIED");
            return;
        }
        JSArray list = new JSArray();
        for (Map.Entry<Long, JSObject> e : people.entrySet()) {
            JSObject p = e.getValue();
            p.put("phones", phones.get(e.getKey()));
            p.put("emails", emails.get(e.getKey()));
            list.put(p);
        }
        JSObject result = new JSObject();
        result.put("contacts", list);
        call.resolve(result);
    }

    private static String nz(String s) {
        return s == null ? "" : s.trim();
    }

    private static String phoneLabel(int type) {
        switch (type) {
            case Phone.TYPE_MOBILE:
                return "mobile";
            case Phone.TYPE_HOME:
                return "home";
            case Phone.TYPE_WORK:
            case Phone.TYPE_WORK_MOBILE:
                return "work";
            default:
                return "";
        }
    }
}
