import fs from 'node:fs';
export class SymlinkManager {
    // Orijinal dosya adına dönüştür (Aktif et)
    enableCapability(canonicalPath) {
        const disabledPath = `${canonicalPath}.asg-disabled`;
        // Dosya zaten temiz haliyle mevcutsa işlem tamam
        if (fs.existsSync(canonicalPath))
            return true;
        // Eğer .asg-disabled hali varsa orijinal ismine geri rename et
        if (fs.existsSync(disabledPath)) {
            try {
                fs.renameSync(disabledPath, canonicalPath);
                return true;
            }
            catch (err) {
                console.error(`[SymlinkManager] Aktifleştirilemedi (${canonicalPath}):`, err);
                return false;
            }
        }
        return false;
    }
    // Dosyaya .asg-disabled uzantısı ekle (Devre dışı bırak)
    disableCapability(canonicalPath) {
        const disabledPath = `${canonicalPath}.asg-disabled`;
        // Zaten devre dışıysa işlem tamam
        if (fs.existsSync(disabledPath))
            return true;
        // Temiz hali mevcutsa adını değiştir
        if (fs.existsSync(canonicalPath)) {
            try {
                fs.renameSync(canonicalPath, disabledPath);
                return true;
            }
            catch (err) {
                console.error(`[SymlinkManager] Devre dışı bırakılamadı (${canonicalPath}):`, err);
                return false;
            }
        }
        return false;
    }
    // Toplu durum eşitleme
    syncState(capabilities, activeIds) {
        for (const cap of capabilities) {
            const shouldBeActive = activeIds.includes(cap.id);
            if (shouldBeActive) {
                this.enableCapability(cap.canonicalFilePath);
            }
            else {
                this.disableCapability(cap.canonicalFilePath);
            }
        }
    }
    // Acil Durum / Panik Butonu: Sistemdeki tüm .asg-disabled dosyalarını temizleyip normale döndür
    restoreAll(capabilities) {
        for (const cap of capabilities) {
            this.enableCapability(cap.canonicalFilePath);
        }
    }
}
