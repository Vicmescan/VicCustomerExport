import template from './vic-customer-export.html.twig';
import './vic-customer-export.scss';

const { Component } = Shopware;

Component.register('vic-customer-export-page', {
    template,

    inject: ['repositoryFactory'],

    data() {
        return {
            isLoading: false,
            isLoadingMeta: false,
            exportSuccess: false,
            customerGroups: [],
            customFieldSets: [],
            dragIndex: null,

            fieldGroups: [
                { key: 'basic',    labelKey: 'vic-customer-export.groups.basic' },
                { key: 'personal', labelKey: 'vic-customer-export.groups.personal' },
                { key: 'contact',  labelKey: 'vic-customer-export.groups.contact' },
                { key: 'account',  labelKey: 'vic-customer-export.groups.account' },
            ],

            availableFields: [
                { id: 'customerNumber',   labelKey: 'vic-customer-export.fields.customerNumber',   group: 'basic' },
                { id: 'firstName',        labelKey: 'vic-customer-export.fields.firstName',        group: 'basic' },
                { id: 'lastName',         labelKey: 'vic-customer-export.fields.lastName',         group: 'basic' },
                { id: 'email',            labelKey: 'vic-customer-export.fields.email',            group: 'basic' },
                { id: 'active',           labelKey: 'vic-customer-export.fields.active',           group: 'basic' },
                { id: 'guest',            labelKey: 'vic-customer-export.fields.guest',            group: 'basic' },
                { id: 'salutation',       labelKey: 'vic-customer-export.fields.salutation',       group: 'personal' },
                { id: 'birthday',         labelKey: 'vic-customer-export.fields.birthday',         group: 'personal' },
                { id: 'company',          labelKey: 'vic-customer-export.fields.company',          group: 'personal' },
                { id: 'vatIds',           labelKey: 'vic-customer-export.fields.vatIds',           group: 'personal' },
                { id: 'phone',            labelKey: 'vic-customer-export.fields.phone',            group: 'contact' },
                { id: 'street',           labelKey: 'vic-customer-export.fields.street',           group: 'contact' },
                { id: 'zipcode',          labelKey: 'vic-customer-export.fields.zipcode',          group: 'contact' },
                { id: 'city',             labelKey: 'vic-customer-export.fields.city',             group: 'contact' },
                { id: 'country',          labelKey: 'vic-customer-export.fields.country',          group: 'contact' },
                { id: 'group',            labelKey: 'vic-customer-export.fields.group',            group: 'account' },
                { id: 'language',         labelKey: 'vic-customer-export.fields.language',         group: 'account' },
                { id: 'createdAt',        labelKey: 'vic-customer-export.fields.createdAt',        group: 'account' },
                { id: 'lastOrderDate',    labelKey: 'vic-customer-export.fields.lastOrderDate',    group: 'account' },
                { id: 'orderCount',       labelKey: 'vic-customer-export.fields.orderCount',       group: 'account' },
                { id: 'orderTotalAmount', labelKey: 'vic-customer-export.fields.orderTotalAmount', group: 'account' },
            ],

            selectedFields: ['customerNumber', 'firstName', 'lastName', 'email', 'active'],

            filters: {
                onlyActive: false,
                onlyRegistered: false,
                hasOrders: false,
                customerGroupId: null,
                registeredFrom: null,
                registeredTo: null,
            },
        };
    },

    computed: {
        canExport() {
            return this.selectedFields.length > 0 && !this.isLoading;
        },

        fieldsInGroup() {
            return (groupKey) => this.availableFields.filter(f => f.group === groupKey);
        },

        customerGroupOptions() {
            return [
                { value: null, label: this.$tc('vic-customer-export.page.filterGroupAll') },
                ...this.customerGroups.map(g => ({ value: g.id, label: g.name })),
            ];
        },

        allFieldLabels() {
            const map = {};
            for (const f of this.availableFields) {
                map[f.id] = this.$tc(f.labelKey);
            }
            for (const set of this.customFieldSets) {
                for (const f of set.fields) {
                    map[`custom:${f.key}`] = f.label;
                }
            }
            return map;
        },
    },

    created() {
        this.loadMeta();
    },

    methods: {
        async loadMeta() {
            this.isLoadingMeta = true;
            try {
                await Promise.all([
                    this.loadCustomerGroups(),
                    this.loadCustomFields(),
                ]);
            } finally {
                this.isLoadingMeta = false;
            }
        },

        async loadCustomerGroups() {
            const repo = this.repositoryFactory.create('customer_group');
            const criteria = new Shopware.Data.Criteria();
            criteria.setLimit(100);
            const result = await repo.search(criteria, Shopware.Context.api);
            this.customerGroups = result.map(g => ({ id: g.id, name: g.name || g.id }));
        },

        async loadCustomFields() {
            try {
                const repo = this.repositoryFactory.create('custom_field_set');
                const criteria = new Shopware.Data.Criteria();
                criteria.addFilter(Shopware.Data.Criteria.equals('relations.entityName', 'customer'));
                criteria.addAssociation('customFields');
                criteria.setLimit(100);

                const result = await repo.search(criteria, Shopware.Context.api);

                this.customFieldSets = result
                    .map(set => ({
                        id: set.id,
                        label: set.config?.label?.[Shopware.Context.app?.fallbackLocale]
                            || set.config?.label?.['en-GB']
                            || set.name,
                        fields: Object.values(set.customFields?.getElements() ?? {}).map(f => ({
                            key: f.name,
                            label: f.config?.label?.[Shopware.Context.app?.fallbackLocale]
                                || f.config?.label?.['en-GB']
                                || f.name,
                        })),
                    }))
                    .filter(set => set.fields.length > 0);
            } catch (e) {
                // Non-critical — custom fields section simply won't appear
            }
        },

        isFieldSelected(fieldId) {
            return this.selectedFields.includes(fieldId);
        },

        onFieldChange(fieldId, checked) {
            if (checked && !this.selectedFields.includes(fieldId)) {
                this.selectedFields.push(fieldId);
            } else if (!checked) {
                this.selectedFields = this.selectedFields.filter(f => f !== fieldId);
            }
        },

        selectAll() {
            const allIds = [
                ...this.availableFields.map(f => f.id),
                ...this.customFieldSets.flatMap(s => s.fields.map(f => `custom:${f.key}`)),
            ];
            this.selectedFields = allIds;
        },

        selectNone() {
            this.selectedFields = [];
        },

        getFieldLabel(fieldId) {
            return this.allFieldLabels[fieldId] || fieldId;
        },

        onDragStart(index) {
            this.dragIndex = index;
        },

        onDragOver(event, index) {
            event.preventDefault();
            if (this.dragIndex === null || this.dragIndex === index) return;
            const updated = [...this.selectedFields];
            const [moved] = updated.splice(this.dragIndex, 1);
            updated.splice(index, 0, moved);
            this.selectedFields = updated;
            this.dragIndex = index;
        },

        onDragEnd() {
            this.dragIndex = null;
        },

        async onExport() {
            if (!this.canExport) return;
            this.isLoading = true;
            this.exportSuccess = false;

            try {
                const token = Shopware.Context.api.authToken?.access;

                const fieldLabels = {};
                for (const fieldId of this.selectedFields) {
                    if (fieldId.startsWith('custom:')) {
                        fieldLabels[fieldId] = this.allFieldLabels[fieldId] || fieldId;
                    }
                }

                const response = await fetch('/api/_action/vic-customer-export/export', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        fields: this.selectedFields,
                        fieldLabels,
                        filters: this.filters,
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const date = new Date().toISOString().slice(0, 10);
                const link = document.createElement('a');
                link.href = url;
                link.download = `customers_${date}.xlsx`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                this.exportSuccess = true;
            } catch (error) {
                console.error('[VicCustomerExport] Export failed:', error);
            } finally {
                this.isLoading = false;
            }
        },
    },
});
