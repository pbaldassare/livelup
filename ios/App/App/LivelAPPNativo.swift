import UIKit
import Capacitor

/// Il view controller dell'app (lo mette SceneDelegate): registra i plugin
/// locali, gli stessi dell'app Android. Il lato JavaScript sta in
/// src/lib/native-download.ts e native-share.ts.
class ViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(SalvaPlugin())
        bridge?.registerPluginInstance(CondividiPlugin())
    }
}

/// Salva un file, come il download del browser. La WebView ignora i link con
/// `download`, quindi gli export CSV e il PDF della scheda non partirebbero:
/// qui si apre "Salva in File" e l'utente sceglie la cartella.
@objc(SalvaPlugin)
public class SalvaPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SalvaPlugin"
    public let jsName = "Salva"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "salva", returnType: CAPPluginReturnPromise)
    ]

    @objc func salva(_ call: CAPPluginCall) {
        guard let dati = Data(base64Encoded: call.getString("dati") ?? "") else {
            return call.reject("Dati non validi")
        }
        // Il nome arriva dalla pagina: niente percorsi, solo il nome del file.
        let nome = (call.getString("nome") ?? "file").replacingOccurrences(of: "/", with: "-")
        let file = FileManager.default.temporaryDirectory.appendingPathComponent(nome)
        do {
            try dati.write(to: file, options: .atomic)
        } catch {
            return call.reject("Salvataggio non riuscito", nil, error)
        }
        DispatchQueue.main.async {
            let scelta = UIDocumentPickerViewController(forExporting: [file], asCopy: true)
            self.bridge?.viewController?.present(scelta, animated: true)
            call.resolve()
        }
    }
}

/// Pannello di condivisione di iOS, al posto del copia-link (vedi
/// src/lib/native-share.ts). Solo testo e link.
@objc(CondividiPlugin)
public class CondividiPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CondividiPlugin"
    public let jsName = "Condividi"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "condividi", returnType: CAPPluginReturnPromise)
    ]

    @objc func condividi(_ call: CAPPluginCall) {
        let testo = call.getString("testo") ?? ""
        DispatchQueue.main.async {
            let pannello = UIActivityViewController(activityItems: [testo], applicationActivities: nil)
            if let vista = self.bridge?.viewController?.view {
                pannello.popoverPresentationController?.sourceView = vista
                pannello.popoverPresentationController?.sourceRect = CGRect(x: vista.bounds.midX, y: vista.bounds.maxY, width: 0, height: 0)
            }
            self.bridge?.viewController?.present(pannello, animated: true)
            call.resolve()
        }
    }
}
