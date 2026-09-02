export type LeadUtmPayload = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

export type SendLeadPayload = {
  name: string;
  phone: string;
  source: string;
  honeypot: string;
  openedAt: number;
  utm: LeadUtmPayload;
};

type LeadApiResponse = {
  ok: boolean;
  leadId?: string;
  filtered?: boolean;
  error?: { message?: string } | string;
};
const TRUSTED_LEADS_API_URL = "https://ams24.ru/api/leads";

function getLeadConfiguration() {
  const apiUrl = process.env.NEXT_PUBLIC_LEADS_API_URL;
  const projectId = process.env.NEXT_PUBLIC_LEADS_PROJECT_ID;
  const siteKey = process.env.NEXT_PUBLIC_LEADS_SITE_KEY;

  if (!apiUrl || !projectId || !siteKey) {
    throw new Error("Отправка заявок временно не настроена.");
  }

  let trustedApiUrl: string;
  try {
    const parsedApiUrl = new URL(apiUrl);
    if (
      parsedApiUrl.origin !== "https://ams24.ru" ||
      parsedApiUrl.pathname !== "/api/leads" ||
      parsedApiUrl.search.length > 0 ||
      parsedApiUrl.hash.length > 0
    ) {
      throw new Error("Untrusted Leads API URL");
    }
    trustedApiUrl = TRUSTED_LEADS_API_URL;
  } catch {
    throw new Error("Отправка заявок временно не настроена.");
  }

  return { apiUrl: trustedApiUrl, projectId, siteKey };
}

export async function sendLead(payload: SendLeadPayload): Promise<LeadApiResponse> {
  const { apiUrl, projectId, siteKey } = getLeadConfiguration();
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-AMS-Site-Key": siteKey,
    },
    body: JSON.stringify({
      project: projectId,
      form: "ams_impulse_contact_modal",
      name: payload.name,
      phone: payload.phone,
      contact: payload.phone,
      source: payload.source,
      honeypot: payload.honeypot,
      openedAt: payload.openedAt,
      utm: payload.utm,
      meta: {
        page_title: document.title,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        method: "call",
      },
    }),
  });

  const result = (await response.json().catch(() => null)) as LeadApiResponse | null;
  if (!response.ok || !result?.ok) {
    const message = typeof result?.error === "string" ? result.error : result?.error?.message;
    throw new Error(message || "Не удалось отправить заявку.");
  }

  return result;
}
