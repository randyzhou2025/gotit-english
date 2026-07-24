function isPrivateIp(ip: string): boolean {
  if (!ip || ip === "unknown") return true;
  if (ip.includes(":")) {
    return ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd");
  }

  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [a, b] = parts;
  if (a === 127 || a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
  return false;
}

export async function resolveIpLocation(ip: string): Promise<string> {
  if (!ip || ip === "unknown") return "未知";
  if (isPrivateIp(ip)) return "内网";

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) return "未知";

    const data = (await response.json()) as {
      success?: boolean;
      country?: string;
      region?: string;
      city?: string;
    };

    if (!data.success) return "未知";

    const parts = [data.country, data.region, data.city]
      .map((part) => part?.trim())
      .filter(Boolean);

    return parts.length > 0 ? parts.join(" ") : "未知";
  } catch {
    return "未知";
  }
}
