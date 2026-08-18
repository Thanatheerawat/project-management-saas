import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {/* config options here */};

// Milestone 6.6: registers src/i18n/request.ts as the per-request locale
// resolver. No other Next.js config changes — in particular no `i18n`
// block and no rewrites, because locale is carried by a cookie rather
// than a URL segment (Decision D1), so routing itself is untouched.
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
