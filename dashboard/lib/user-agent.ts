const BOT_REGEX = /(bot|crawler|spider|scraper|crawl)|(Googlebot|Bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|Sogou|Exabot|facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|TelegramBot|ia_archiver|AhrefsBot|SemrushBot|MJ12bot|DotBot|APIs-Google|AdsBot|nuhk|Storebot|Google-Site-Verification|Mediapartners|Yammybot|Openbot|MSNBot|Ask Jeeves)/i;

export function isBotOrCrawler(userAgent: string | null): boolean {
    if (!userAgent) return false;
    return BOT_REGEX.test(userAgent);
}
