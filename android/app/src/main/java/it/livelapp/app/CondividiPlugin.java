package it.livelapp.app;

import android.content.Intent;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Pannello di condivisione di Android. La WebView non ha navigator.share,
 * e le pagine ripiegavano sul copia-link: src/lib/native-share.ts lo
 * sostituisce con questo.
 */
@CapacitorPlugin(name = "Condividi")
public class CondividiPlugin extends Plugin {

    @PluginMethod
    public void condividi(PluginCall call) {
        String titolo = call.getString("titolo", "");
        Intent invio = new Intent(Intent.ACTION_SEND)
            .setType("text/plain")
            .putExtra(Intent.EXTRA_TEXT, call.getString("testo", ""));
        if (!titolo.isEmpty()) invio.putExtra(Intent.EXTRA_SUBJECT, titolo);
        getActivity().startActivity(Intent.createChooser(invio, titolo.isEmpty() ? null : titolo));
        call.resolve();
    }
}
