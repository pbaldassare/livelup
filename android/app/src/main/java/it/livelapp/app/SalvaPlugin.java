package it.livelapp.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;

/**
 * Salva un file, come il download del browser. La WebView ignora i link con
 * `download`, quindi gli export CSV e i PDF non partirebbero: qui si apre il
 * "Salva come" di Android e l'utente sceglie la cartella. Nessun permesso.
 *
 * Il lato JavaScript sta in src/lib/native-download.ts.
 */
@CapacitorPlugin(name = "Salva")
public class SalvaPlugin extends Plugin {

    @PluginMethod
    public void salva(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
            .addCategory(Intent.CATEGORY_OPENABLE)
            .setType(call.getString("tipo", "application/octet-stream"))
            .putExtra(Intent.EXTRA_TITLE, call.getString("nome", "file"));
        startActivityForResult(call, intent, "scelto");
    }

    @ActivityCallback
    private void scelto(PluginCall call, ActivityResult risultato) {
        if (call == null) return;
        Intent dati = risultato.getData();
        Uri destinazione = dati == null ? null : dati.getData();
        if (risultato.getResultCode() != Activity.RESULT_OK || destinazione == null) {
            call.resolve(); // annullato dall'utente
            return;
        }
        try (OutputStream uscita = getContext().getContentResolver().openOutputStream(destinazione)) {
            uscita.write(Base64.decode(call.getString("dati", ""), Base64.DEFAULT));
            call.resolve();
        } catch (Exception e) {
            call.reject("Salvataggio non riuscito", e);
        }
    }
}
