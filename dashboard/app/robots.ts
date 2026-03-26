import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/dashboard', '/dashboard/live', '/dashboard/upload'],
            },
        ],
        sitemap: 'https://nginx.apianalytics.dev/sitemap.xml',
    };
}
