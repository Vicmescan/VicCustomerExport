import enGB from './snippet/en-GB.json';
import deDE from './snippet/de-DE.json';
import esES from './snippet/es-ES.json';

import './acl';
import './page/vic-customer-export';

Shopware.Locale.extend('en-GB', enGB);
Shopware.Locale.extend('de-DE', deDE);
Shopware.Locale.extend('es-ES', esES);

Shopware.Module.register('vic-customer-export', {
    type: 'plugin',
    name: 'vic-customer-export',
    title: 'vic-customer-export.general.title',
    description: 'vic-customer-export.general.description',
    color: '#1565C0',
    icon: 'regular-file-download',

    routes: {
        index: {
            component: 'vic-customer-export-page',
            path: 'index',
            meta: {
                privilege: 'vic_customer_export.viewer',
            },
        },
    },

    navigation: [
        {
            label: 'vic-customer-export.general.menuLabel',
            color: '#1565C0',
            icon: 'regular-file-download',
            path: 'vic.customer.export.index',
            parent: 'sw-customer',
            position: 100,
            privilege: 'vic_customer_export.viewer',
        },
    ],
});
