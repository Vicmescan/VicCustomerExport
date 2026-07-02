// Declara los privilegios disponibles para este módulo en la pantalla
// Configuración > Usuarios y permisos > Roles. Al marcar "Viewer" para
// "Customer Export" se conceden los privilegios de lectura que el
// exportador necesita sobre cliente y sus relaciones.
Shopware.Service('privileges').addPrivilegeMappingEntry({
    category: 'permissions',
    parent: 'customers',
    key: 'vic_customer_export',
    roles: {
        viewer: {
            privileges: [
                'customer:read',
                'customer_address:read',
                'customer_group:read',
                'salutation:read',
                'country:read',
                'language:read',
                'custom_field_set:read',
                'custom_field:read',
            ],
            dependencies: [],
        },
    },
});
