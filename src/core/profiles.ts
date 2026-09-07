import { DiscoveredCapability } from '../harvester/scanner.js';

export type ProfileType = 'prototyping' | 'audit' | 'clean' | 'custom';

export interface ProfileDefinition {
  id: ProfileType;
  label: string;
  description: string;
  filter: (cap: DiscoveredCapability) => boolean;
}

export const PROFILES: ProfileDefinition[] = [
  {
    id: 'prototyping',
    label: '⚡ Hızlı Geliştirme (Fast Prototyping)',
    description: 'Guard ve denetim hook\'ları kapalı. Maksimum hız ve minimum token tüketimi.',
    filter: (cap) => {
      // Guard, injection-scanner ve check worker gibi ağır hook'ları dışarıda bırak
      const lower = cap.canonicalFilePath.toLowerCase();
      const isHeavyHook = lower.includes('guard') || 
                          lower.includes('scanner') || 
                          lower.includes('audit') || 
                          lower.includes('check');
      return !isHeavyHook;
    }
  },
  {
    id: 'audit',
    label: '🛡️ Güvenlik ve Denetim (Full Guard & Audit)',
    description: 'Tüm tarayıcılar, review kuralları ve commit kontrolleri devrede.',
    filter: () => true // Bütün 3rd-party yetenekleri aç
  },
  {
    id: 'clean',
    label: '🧹 Yalın Mod (Clean Slate)',
    description: 'Tüm 3rd-party hook ve eklentiler kapalı. Yalnızca CLI yerleşik araçları devrede.',
    filter: () => false // Hepsini kapat
  }
];