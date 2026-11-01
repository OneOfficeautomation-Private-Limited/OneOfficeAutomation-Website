# Toolkit catalogue export format

The website's action reference (`/resources/toolkits`) is built from **one JSON file** exported from the product.
An admin imports it in **/admin → Resources → Toolkit catalogue**. Each import replaces the whole catalogue, so
export the complete list every time (for example after each release).

A sample file is next to this one: `docs/sample-action-catalog.json`.

## Shape

```json
{
  "version": "4.6",
  "toolkits": [
    {
      "id": "excel",
      "name": "Excel",
      "category": "Office",
      "description": "Read, write and format workbooks.",
      "connector": false,
      "icon": "table",
      "actions": [
        {
          "id": "open-workbook",
          "name": "Open workbook",
          "description": "Opens an Excel file so later actions can use it.",
          "inputs":  [ { "name": "File path", "type": "Text", "required": true, "description": "Full path to the .xlsx file." } ],
          "outputs": [ { "name": "Workbook", "type": "Workbook", "description": "The open workbook." } ],
          "example": "Open workbook  File path: C:\\Invoices\\October.xlsx"
        }
      ]
    }
  ]
}
```

## Fields

| Field | Required | Rules |
|---|---|---|
| `version` | no | Product version, shown on the catalogue page. Up to 40 characters. |
| `toolkits[].id` | yes | Lower-case letters, numbers and dashes (`sap-s4hana`). Unique. Used in the page address, so keep it stable between releases. |
| `toolkits[].name` | yes | Up to 120 characters. |
| `toolkits[].category` | no | Groups toolkits in the filters (for example Office, ERP, Email, Documents). Defaults to “Other”. |
| `toolkits[].description` | no | One or two sentences. Up to 2,000 characters. |
| `toolkits[].connector` | no | `true` for connectors to other systems. Shown in the “Connectors only” filter. |
| `toolkits[].icon` | no | One of the icon names in `src/cms/icons.ts` (for example `table`, `mail`, `doc`, `plug`, `bank`). Unknown names show a grid icon. |
| `actions[].id` | yes | Lower-case letters, numbers and dashes. Unique within its toolkit. |
| `actions[].name` | yes | Up to 160 characters. Each action can be linked to directly: `/resources/toolkits/<toolkit>#<action name in lower case with dashes>`. |
| `actions[].description` | no | Up to 2,000 characters. |
| `actions[].inputs`, `outputs` | no | Lists of `{ name, type, required, description }`. Up to 100 each. |
| `actions[].example` | no | Shown as a code block. Up to 4,000 characters. |

Limits: up to 1,000 toolkits, up to 1,000 actions per toolkit, file up to 10 MB.

If anything is wrong (a missing name, a repeated id), nothing is changed and the admin screen lists each problem with where it is,
for example *“Toolkit 3 (“SAP”), action 12 (“Post invoice”): "id" must be lower-case letters, numbers and dashes.”*
