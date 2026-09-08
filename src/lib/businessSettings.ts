import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://nqlillrugkxxpjobzsja.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_V_wCDy_Oe1_4ZMahWfNmfg_X1gqNpsN';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface BusinessSettings {
  // 1. Identidad
  businessName: string;
  brandTagline: string;
  rfcTaxId: string;
  
  // 2. Ubicación y Taller
  tallerAddress: string;
  tallerNeighborhood: string;
  tallerCityState: string;
  tallerPostalCode: string;
  tallerReferences: string;
  googleMapsUrl: string;
  businessHoursWeekdays: string;
  businessHoursWeekend: string;

  // 3. Canales de Contacto
  contactEmail: string;
  contactPhone: string;
  contactWhatsApp: string;
  instagramHandle: string;
  facebookUrl: string;

  // 4. Datos Bancarios para Anticipos
  bankName: string;
  bankAccountHolder: string;
  bankClabe: string;
  bankAccountNumber: string;
  bankPaymentInstructions: string;

  // 4b. Configuración de Mercado Pago
  mercadopagoEnabled: boolean;
  mercadopagoAccessToken: string;
  mercadopagoPublicKey: string;
  mercadopagoPaymentLink: string;
  mercadopagoSandbox: boolean;

  // 5. Precios y Tarifas Base ($ MXN)
  priceTape: number;
  priceDvd: number;
  priceReel: number;
  priceAudioCassette: number;
  pricePhotoScan: number;
  priceExtraHour: number;
  priceUsb64gb?: number;
  priceLocalDeliveryCdmx: number;
  priceNationalShippingDhl: number;

  // 6. Banner de Anuncios / Cabecera
  announcementBannerEnabled: boolean;
  announcementBannerText: string;

  updatedAt: string;
}

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  businessName: 'DigiMemories México',
  brandTagline: 'Laboratorio Especializado en Preservación y Digitalización de Recuerdos en Alta Definición',
  rfcTaxId: '',

  tallerAddress: 'Recepción por Uber Flash (CDMX) y Paquetería Nacional (DHL / FedEx / Estafeta)',
  tallerNeighborhood: 'Laboratorio Privado Sin Atención Presencial',
  tallerCityState: 'Ciudad de México, CDMX',
  tallerPostalCode: '',
  tallerReferences: 'Dirección exacta coordinada por WhatsApp para el chofer de Uber Flash o guía de paquetería',
  googleMapsUrl: '',
  businessHoursWeekdays: 'Lunes a Viernes: 9:00 AM – 7:00 PM',
  businessHoursWeekend: 'Sábados: 10:00 AM – 3:00 PM',

  contactEmail: 'contactodigimemories@gmail.com',
  contactPhone: '55 4888 9876',
  contactWhatsApp: '+52 55 4888 9876',
  instagramHandle: '@digimemories_mx',
  facebookUrl: 'https://facebook.com/digimemories.mx',

  bankName: 'BBVA México',
  bankAccountHolder: 'DigiMemories México',
  bankClabe: '012180015492837190',
  bankAccountNumber: '1549283719',
  bankPaymentInstructions: 'Favor de ingresar tu Número de Orden o PIN en el concepto de la transferencia y enviar comprobante a contactodigimemories@gmail.com o por WhatsApp.',

  mercadopagoEnabled: true,
  mercadopagoAccessToken: 'APP_USR-1691694472433668-090816-2dba2cc0bf20589ac9b9d0d2846665f1-256102028',
  mercadopagoPublicKey: 'APP_USR-42dc43f2-be28-4b70-ad33-a77ee464a7bd',
  mercadopagoPaymentLink: 'https://link.mercadopago.com.mx/digimemories',
  mercadopagoSandbox: false,

  priceTape: 150,
  priceDvd: 120,
  priceReel: 250,
  priceAudioCassette: 100,
  pricePhotoScan: 10,
  priceExtraHour: 50,
  priceUsb64gb: 0,
  priceLocalDeliveryCdmx: 120,
  priceNationalShippingDhl: 220,

  announcementBannerEnabled: true,
  announcementBannerText: '🚚 Servicio de recolección y entrega a domicilio disponible en toda la CDMX y envíos a todo México.',
  
  updatedAt: new Date().toISOString()
};

const STORAGE_KEY = 'digimemories_business_settings_v1';

/**
 * Obtener configuración del negocio desde LocalStorage o Defaults
 */
export function getBusinessSettings(): BusinessSettings {
  if (typeof window === 'undefined') return DEFAULT_BUSINESS_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BUSINESS_SETTINGS));
      return DEFAULT_BUSINESS_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_BUSINESS_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_BUSINESS_SETTINGS;
  }
}

/**
 * Guardar y sincronizar configuración del negocio en LocalStorage y Supabase Cloud
 */
export async function saveBusinessSettings(settings: Partial<BusinessSettings>): Promise<BusinessSettings> {
  const current = getBusinessSettings();
  const updated: BusinessSettings = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString()
  };

  // 1. Local Cache
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('digimemories_business_settings_sync', { detail: updated }));
  }

  // 2. Supabase Cloud Sync
  try {
    await supabase.from('email_logs').upsert({
      id: 'settings_business_profile_v1',
      order_id: null,
      to_email: 'admin@digimemories.local',
      to_name: updated.businessName,
      subject: 'Configuración Global del Negocio',
      snippet: `${updated.tallerAddress} • WhatsApp: ${updated.contactWhatsApp}`,
      type: 'business_settings',
      sent_at: updated.updatedAt,
      body_html: JSON.stringify(updated)
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('[Business Settings Sync] Cloud notice:', err);
  }

  return updated;
}

/**
 * Cargar configuración desde Supabase si existe una versión más reciente
 */
export async function fetchCloudBusinessSettings(): Promise<BusinessSettings> {
  try {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .eq('id', 'settings_business_profile_v1')
      .single();

    if (error || !data || !data.body_html) return getBusinessSettings();

    const parsed: BusinessSettings = JSON.parse(data.body_html);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      window.dispatchEvent(new CustomEvent('digimemories_business_settings_sync', { detail: parsed }));
    }
    return parsed;
  } catch {
    return getBusinessSettings();
  }
}
