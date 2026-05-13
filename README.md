# VicCustomerExport — Shopware 6 Customer Export to Excel

A Shopware 6 plugin that lets you export customers to `.xlsx` directly from the admin panel. Choose exactly which fields to include, reorder the columns by drag-and-drop, and filter by group, status, date range, and more.

> **GDPR notice:** The plugin displays a permanent warning in the UI reminding users that the exported file contains personal data and must be handled in compliance with GDPR. The export endpoint is protected by Shopware's ACL system and requires the `customer:read` permission.

---

## Features

- **21 exportable fields** organized in groups
- **Custom fields support** — auto-detects fields added by other plugins
- **Drag-and-drop column ordering** — define the exact column order in the Excel file
- **Rich filters** — active status, registered vs guest, customer group, order history, registration date range
- **ACL protected** — requires `customer:read` permission
- **GDPR warning** — permanent banner in the UI before any export
- **Styled output** — header row with color, auto-sized columns
- **Translations** — English, German, Spanish
- **Admin menu entry** under Customers

---

## Exportable fields

| Group | Fields |
|---|---|
| Basic | Customer No., First name, Last name, Email, Active, Guest |
| Personal | Salutation, Birthday, Company, VAT IDs |
| Contact (billing address) | Phone, Street, ZIP code, City, Country |
| Account | Customer group, Language, Registration date, Last order date, No. of orders, Total spent |
| Custom fields | Any custom fields registered for the `customer` entity by other plugins |

---

## Filters

| Filter | Description |
|---|---|
| Only active | Excludes inactive customers |
| Registered only | Excludes guest accounts |
| Has orders | Only customers with at least one order |
| Customer group | Filter by a specific customer group |
| Registration date | From / to date range |

---

## Requirements

- Shopware 6.7.x
- PHP 8.2+
- `phpoffice/phpspreadsheet` ^3.0 (installed via the root project's composer)

---

## Installation

**1. Copy the plugin**

```bash
cp -r VicCustomerExport /your-shopware-root/custom/plugins/
```

**2. Install PhpSpreadsheet** (skip if already installed for VicProductExport)

```bash
composer require phpoffice/phpspreadsheet:"^3.0"
```

**3. Install and activate the plugin**

```bash
bin/console plugin:refresh
bin/console plugin:install --activate VicCustomerExport
```

**4. Build the admin**

```bash
bin/build-administration.sh
bin/console cache:clear
```

---

## Usage

1. Go to **Customers → Export to Excel** in the Shopware admin
2. Check the fields you want to export
3. Drag rows in the **Column order** card to arrange the columns
4. Apply filters as needed
5. Click **Export .xlsx** — the file downloads immediately

---

## How it works

```
Admin UI (Vue 3)
    ↓  POST /api/_action/vic-customer-export/export  [requires customer:read ACL]
        { fields: [...], fieldLabels: {...}, filters: {...} }
ExportController (PHP)
    ↓  CustomerRepository::search() with dynamic associations
        (only loads salutation, group, language, address, country if selected)
PhpSpreadsheet
    ↓  Builds .xlsx in memory
StreamedResponse → browser download
```

Custom fields are read from `$customer->getCustomFields()` — no additional DAL associations needed.

---

## File structure

```
VicCustomerExport/
├── composer.json
└── src/
    ├── VicCustomerExport.php
    ├── Controller/
    │   └── ExportController.php
    └── Resources/
        ├── config/
        │   ├── routes.xml
        │   └── services.xml
        └── app/administration/src/
            ├── main.js
            └── module/vic-customer-export/
                ├── index.js
                ├── snippet/  (en-GB, de-DE, es-ES)
                └── page/vic-customer-export/
                    ├── index.js
                    ├── vic-customer-export.html.twig
                    └── vic-customer-export.scss
```

---

## License

MIT — [Vicmescan](https://github.com/Vicmescan)
