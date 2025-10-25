import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface WarehouseFormData {
  accountName: string;
  credentials: Record<string, string>;
  operationIds: string[];
}

export interface WarehouseFormProps {
  formData: WarehouseFormData;
  onChange: (data: WarehouseFormData) => void;
  availableOperations: Array<{ id: string; name: string }>;
  requiredFields?: Array<{ key: string; label: string; type?: string; required?: boolean; options?: string[] }>;
}

export function WarehouseIntegrationForm({
  formData,
  onChange,
  availableOperations,
  requiredFields = []
}: WarehouseFormProps) {
  return (
    <div className="space-y-3">
      {/* Account Name */}
      <div>
        <Label htmlFor="account-name">Nome da Conta</Label>
        <Input
          id="account-name"
          placeholder="Ex: FHB Principal"
          value={formData.accountName}
          onChange={(e) => onChange({ ...formData, accountName: e.target.value })}
          data-testid="input-warehouse-account-name"
        />
      </div>

      {/* Dynamic Credential Fields */}
      {requiredFields.map((field) => (
        <div key={field.key}>
          <Label htmlFor={`field-${field.key}`}>
            {field.label} {field.required && <span className="text-destructive">*</span>}
          </Label>
          
          {field.options ? (
            <Select
              value={formData.credentials[field.key] || ''}
              onValueChange={(value) => onChange({
                ...formData,
                credentials: { ...formData.credentials, [field.key]: value }
              })}
            >
              <SelectTrigger data-testid={`select-${field.key}`}>
                <SelectValue placeholder={`Selecione ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((option) => (
                  <SelectItem key={option} value={option} data-testid={`select-option-${field.key}-${option}`}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={`field-${field.key}`}
              type={field.type ?? 'text'}
              placeholder={`Digite ${field.label.toLowerCase()}`}
              value={formData.credentials[field.key] || ''}
              onChange={(e) => onChange({
                ...formData,
                credentials: { ...formData.credentials, [field.key]: e.target.value }
              })}
              data-testid={`input-${field.key}`}
            />
          )}
        </div>
      ))}

      {/* Operations Checkboxes */}
      <div>
        <Label>Operações Vinculadas</Label>
        {availableOperations.length > 0 ? (
          <div className="space-y-2 mt-2 max-h-40 overflow-y-auto border rounded-lg p-3">
            {availableOperations.map(op => (
              <div key={op.id} className="flex items-center gap-2">
                <Checkbox
                  id={`op-${op.id}`}
                  checked={formData.operationIds.includes(op.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onChange({
                        ...formData,
                        operationIds: [...formData.operationIds, op.id]
                      });
                    } else {
                      onChange({
                        ...formData,
                        operationIds: formData.operationIds.filter(id => id !== op.id)
                      });
                    }
                  }}
                  data-testid={`checkbox-operation-${op.id}`}
                />
                <label 
                  htmlFor={`op-${op.id}`} 
                  className="text-sm cursor-pointer"
                  data-testid={`label-operation-${op.id}`}
                >
                  {op.name}
                </label>
              </div>
            ))}
          </div>
        ) : (
          <p 
            className="text-xs text-muted-foreground mt-2 p-3 border rounded-lg"
            data-testid="text-no-operations"
          >
            Nenhuma operação disponível
          </p>
        )}
        {formData.operationIds.length > 0 && (
          <p 
            className="text-xs text-blue-600 mt-1"
            data-testid="text-operations-count"
          >
            {formData.operationIds.length} operação(ões) selecionada(s)
          </p>
        )}
      </div>
    </div>
  );
}

// Specific forms for each provider (with pre-configured fields)

export function FHBIntegrationForm(props: Omit<WarehouseFormProps, 'requiredFields'>) {
  const fhbFields = [
    { key: 'email', label: 'Email FHB', type: 'email', required: true },
    { key: 'password', label: 'Senha FHB', type: 'password', required: true },
    { key: 'apiUrl', label: 'URL da API', type: 'text', required: false }
  ];

  return <WarehouseIntegrationForm {...props} requiredFields={fhbFields} />;
}

export function EuropeanFulfillmentIntegrationForm(props: Omit<WarehouseFormProps, 'requiredFields'>) {
  const europeanFields = [
    { key: 'email', label: 'Email European Fulfillment', type: 'email', required: true },
    { key: 'password', label: 'Senha European Fulfillment', type: 'password', required: true },
    { 
      key: 'country', 
      label: 'País', 
      type: 'select', 
      required: true,
      options: ['portugal', 'spain', 'italy', 'france', 'germany']
    },
    { key: 'apiUrl', label: 'URL da API', type: 'text', required: false }
  ];

  return <WarehouseIntegrationForm {...props} requiredFields={europeanFields} />;
}

export function ElogyIntegrationForm(props: Omit<WarehouseFormProps, 'requiredFields'>) {
  const elogyFields = [
    { key: 'email', label: 'Email eLogy', type: 'email', required: true },
    { key: 'password', label: 'Senha eLogy', type: 'password', required: true },
    { key: 'authHeader', label: 'Auth Header', type: 'text', required: false },
    { key: 'warehouseId', label: 'Warehouse ID', type: 'text', required: false },
    { key: 'apiUrl', label: 'URL da API', type: 'text', required: false }
  ];

  return <WarehouseIntegrationForm {...props} requiredFields={elogyFields} />;
}
