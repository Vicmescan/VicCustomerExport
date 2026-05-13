<?php declare(strict_types=1);

namespace Vic\CustomerExport\Controller;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsFilter;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\RangeFilter;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route(defaults: ['_routeScope' => ['api'], '_acl' => ['customer:read']])]
class ExportController
{
    public function __construct(
        private readonly EntityRepository $customerRepository,
    ) {}

    #[Route(
        path: '/api/_action/vic-customer-export/export',
        name: 'api.action.vic_customer_export.export',
        methods: ['POST']
    )]
    public function export(Request $request, Context $context): StreamedResponse
    {
        $body = json_decode($request->getContent(), true) ?? [];
        $fields = $body['fields'] ?? ['customerNumber', 'firstName', 'lastName', 'email'];
        $filters = $body['filters'] ?? [];
        $fieldLabels = $body['fieldLabels'] ?? [];

        $criteria = $this->buildCriteria($fields, $filters);
        $customers = $this->customerRepository->search($criteria, $context);

        $spreadsheet = $this->buildSpreadsheet($fields, $fieldLabels, $customers->getElements());

        return new StreamedResponse(
            function () use ($spreadsheet): void {
                $writer = new Xlsx($spreadsheet);
                $writer->save('php://output');
            },
            200,
            [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => 'attachment; filename="customers_export.xlsx"',
                'Cache-Control' => 'max-age=0',
                'Pragma' => 'public',
            ]
        );
    }

    private function buildCriteria(array $fields, array $filters): Criteria
    {
        $criteria = new Criteria();
        $criteria->setLimit(10000);

        $addressFields = ['phone', 'street', 'zipcode', 'city', 'country'];
        if (count(array_intersect($addressFields, $fields)) > 0) {
            $criteria->addAssociation('defaultBillingAddress');
        }
        if (in_array('country', $fields, true)) {
            $criteria->addAssociation('defaultBillingAddress.country');
        }
        if (in_array('salutation', $fields, true)) {
            $criteria->addAssociation('salutation');
        }
        if (in_array('group', $fields, true)) {
            $criteria->addAssociation('group');
        }
        if (in_array('language', $fields, true)) {
            $criteria->addAssociation('language');
        }

        if (!empty($filters['onlyActive'])) {
            $criteria->addFilter(new EqualsFilter('active', true));
        }
        if (!empty($filters['onlyRegistered'])) {
            $criteria->addFilter(new EqualsFilter('guest', false));
        }
        if (!empty($filters['hasOrders'])) {
            $criteria->addFilter(new RangeFilter('orderCount', [RangeFilter::GT => 0]));
        }
        if (!empty($filters['customerGroupId'])) {
            $criteria->addFilter(new EqualsFilter('groupId', $filters['customerGroupId']));
        }
        if (!empty($filters['registeredFrom'])) {
            $criteria->addFilter(new RangeFilter('createdAt', [RangeFilter::GTE => $filters['registeredFrom']]));
        }
        if (!empty($filters['registeredTo'])) {
            $criteria->addFilter(new RangeFilter('createdAt', [RangeFilter::LTE => $filters['registeredTo']]));
        }

        return $criteria;
    }

    private function buildSpreadsheet(array $fields, array $fieldLabels, array $customers): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Customers');

        $builtinLabels = $this->getFieldLabels();

        $col = 1;
        foreach ($fields as $field) {
            $label = $fieldLabels[$field] ?? $builtinLabels[$field] ?? $field;
            $sheet->getCell([$col, 1])->setValue($label);
            $col++;
        }

        $lastCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($fields));
        $sheet->getStyle("A1:{$lastCol}1")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'color' => ['rgb' => '1565C0']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        $row = 2;
        foreach ($customers as $customer) {
            $col = 1;
            foreach ($fields as $field) {
                $sheet->getCell([$col, $row])->setValue($this->getFieldValue($customer, $field));
                $col++;
            }
            $row++;
        }

        foreach (range(1, count($fields)) as $colIndex) {
            $sheet->getColumnDimensionByColumn($colIndex)->setAutoSize(true);
        }

        return $spreadsheet;
    }

    private function getFieldValue(mixed $customer, string $field): mixed
    {
        if (str_starts_with($field, 'custom:')) {
            $key = substr($field, 7);
            $customFields = $customer->getCustomFields() ?? [];
            $value = $customFields[$key] ?? '';
            return is_array($value) ? implode(', ', $value) : (string) $value;
        }

        $address = $customer->getDefaultBillingAddress();

        return match ($field) {
            // Basic
            'customerNumber' => (string) ($customer->getCustomerNumber() ?? ''),
            'firstName'      => (string) ($customer->getFirstName() ?? ''),
            'lastName'       => (string) ($customer->getLastName() ?? ''),
            'email'          => (string) ($customer->getEmail() ?? ''),
            'active'         => $customer->getActive() ? 'Yes' : 'No',
            'guest'          => $customer->getGuest() ? 'Yes' : 'No',
            // Personal
            'salutation'     => (string) ($customer->getSalutation()?->getDisplayName() ?? ''),
            'birthday'       => $customer->getBirthday()?->format('Y-m-d') ?? '',
            'company'        => (string) ($customer->getCompany() ?? ''),
            'vatIds'         => implode(', ', $customer->getVatIds() ?? []),
            // Contact (billing address)
            'phone'          => (string) ($address?->getPhoneNumber() ?? ''),
            'street'         => (string) ($address?->getStreet() ?? ''),
            'zipcode'        => (string) ($address?->getZipcode() ?? ''),
            'city'           => (string) ($address?->getCity() ?? ''),
            'country'        => (string) ($address?->getCountry()?->getName() ?? ''),
            // Account
            'group'               => (string) ($customer->getGroup()?->getName() ?? ''),
            'language'            => (string) ($customer->getLanguage()?->getName() ?? ''),
            'createdAt'           => $customer->getCreatedAt()?->format('Y-m-d') ?? '',
            'lastOrderDate'       => $customer->getLastOrderDate()?->format('Y-m-d') ?? '',
            'orderCount'          => (int) $customer->getOrderCount(),
            'orderTotalAmount'    => $customer->getOrderTotalAmount() > 0
                ? round($customer->getOrderTotalAmount(), 2)
                : '',
            default => '',
        };
    }

    private function getFieldLabels(): array
    {
        return [
            'customerNumber'   => 'Customer No.',
            'firstName'        => 'First name',
            'lastName'         => 'Last name',
            'email'            => 'Email',
            'active'           => 'Active',
            'guest'            => 'Guest',
            'salutation'       => 'Salutation',
            'birthday'         => 'Birthday',
            'company'          => 'Company',
            'vatIds'           => 'VAT IDs',
            'phone'            => 'Phone',
            'street'           => 'Street',
            'zipcode'          => 'ZIP code',
            'city'             => 'City',
            'country'          => 'Country',
            'group'            => 'Customer group',
            'language'         => 'Language',
            'createdAt'        => 'Registration date',
            'lastOrderDate'    => 'Last order date',
            'orderCount'       => 'No. of orders',
            'orderTotalAmount' => 'Total spent',
        ];
    }
}
