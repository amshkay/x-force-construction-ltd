import React, { useEffect } from 'react';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';

export interface PublicSeoHeadProps {
  pageTitle?: string;
  pageDescription?: string;
  canonicalPath?: string;
  currentRoute?: string;
}

/**
 * PublicSeoHead
 * Updates document head metadata and maintains Schema.org JSON-LD structured data
 * dynamically from centralized Business Settings.
 */
export const PublicSeoHead: React.FC<PublicSeoHeadProps> = ({
  pageTitle,
  pageDescription,
  canonicalPath = '/',
  currentRoute,
}) => {
  const { publicSettings } = useBusinessSettings();
  const effectiveCanonical = currentRoute || canonicalPath || '/';

  const brandName = publicSettings.publicBrandName || 'X-FORCE BRICKS';
  const fullTitle = pageTitle ? `${pageTitle} | ${brandName}` : `${brandName} | ${publicSettings.slogan}`;
  const metaDesc = pageDescription || publicSettings.description || publicSettings.websiteContent.metaDescription;

  useEffect(() => {
    // 1. Update Document Title
    document.title = fullTitle;

    // 2. Update Meta Description
    let descMeta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!descMeta) {
      descMeta = document.createElement('meta');
      descMeta.name = 'description';
      document.head.appendChild(descMeta);
    }
    descMeta.content = metaDesc;

    // 3. Update OpenGraph Tags
    const updateOrCreateMeta = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    updateOrCreateMeta('og:title', fullTitle);
    updateOrCreateMeta('og:description', metaDesc);
    updateOrCreateMeta('og:type', 'website');
    updateOrCreateMeta('og:site_name', brandName);
    if (publicSettings.websiteUrl) {
      updateOrCreateMeta('og:url', `${publicSettings.websiteUrl}${canonicalPath}`);
    }

    // 4. Inject Schema.org LocalBusiness JSON-LD
    const jsonLdId = 'schema-org-local-business';
    let scriptTag = document.getElementById(jsonLdId) as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = jsonLdId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }

    const jsonLdData = {
      '@context': 'https://schema.org',
      '@type': 'HomeAndConstructionBusiness',
      name: brandName,
      legalName: publicSettings.legalName,
      description: metaDesc,
      url: publicSettings.websiteUrl,
      telephone: publicSettings.contact.phone,
      email: publicSettings.contact.email,
      address: {
        '@type': 'PostalAddress',
        streetAddress: publicSettings.contact.address.street,
        addressLocality: publicSettings.contact.address.city,
        addressRegion: publicSettings.contact.address.state,
        addressCountry: publicSettings.contact.address.country,
      },
      geo: publicSettings.location.latitude && publicSettings.location.longitude
        ? {
            '@type': 'GeoCoordinates',
            latitude: publicSettings.location.latitude,
            longitude: publicSettings.location.longitude,
          }
        : undefined,
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '08:00',
          closes: '18:00',
        },
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Saturday'],
          opens: '09:00',
          closes: '16:00',
        },
      ],
      priceRange: '₦₦',
      currenciesAccepted: publicSettings.currency.code,
    };

    scriptTag.text = JSON.stringify(jsonLdData);
  }, [fullTitle, metaDesc, brandName, publicSettings, canonicalPath]);

  return null;
};
