# DNS-migratieplan vandissolutions.com

Vastgelegd op 22 juli 2026 — huidige situatie vóór de omzetting.
**Doel:** website naar nieuwe hosting (Telit-webroot via GitHub Actions, of Vercel), mail ongemoeid laten.

## Huidige DNS-records (exact overnemen, behalve A-records)

| Type | Naam | Waarde | Actie bij migratie |
|------|------|--------|--------------------|
| A | vandissolutions.com | 62.84.245.148 | **Wijzigen** naar nieuwe host |
| A | www.vandissolutions.com | 62.84.245.148 | **Wijzigen** naar nieuwe host |
| MX | @ (prio 10) | vandissolutions-com.mail.protection.outlook.com | **Behouden** (Microsoft 365) |
| MX | @ (prio 20) | mx2.cloudorb.com | **Behouden** (backup-mail) |
| TXT | @ | v=spf1 include:spf.protection.outlook.com -all | **Behouden** (SPF) |
| TXT | @ | MS=ms86976686 | **Behouden** (M365-verificatie) |
| CNAME | autodiscover | autodiscover.outlook.com | **Behouden** (Outlook-configuratie) |

Nameservers nu: ns1.anony.nl, ns2.anony.nl, ns3.anony.eu (beheer via vorige DNS-partij).

## Stappenplan omzetting

1. Nieuwe hosting klaarzetten en testen (site staat al op GitHub; deploy-workflow ligt klaar in `.github/workflows/deploy-telit.yml`).
2. Nieuwe DNS-omgeving inrichten (Cloudflare of DNS van Brams registrar) met **alle** records uit de tabel hierboven; alleen de twee A-records wijzen naar de nieuwe host.
3. TTL-waarden desgewenst vooraf verlagen voor snellere omschakeling.
4. Nameservers omzetten bij de registrar (actie Bram).
5. Direct na omzetting testen: site (incl. www), mail versturen én ontvangen, formulieren, 301-redirects van oude URL's.
6. Google Search Console: property aanmaken, sitemap indienen.

## Aandachtspunten / kansen

- **DKIM staat niet aan** voor Microsoft 365 (geen selector1/selector2-records). Aanrader: na migratie DKIM activeren in de M365-beheeromgeving — betere mailbezorging.
- **DMARC ontbreekt** (geen _dmarc-record). Aanrader: `v=DMARC1; p=none; rua=mailto:info@vandissolutions.com` als startbeleid.
- Geen AAAA (IPv6), geen bijzondere SRV/subdomeinen aangetroffen.
