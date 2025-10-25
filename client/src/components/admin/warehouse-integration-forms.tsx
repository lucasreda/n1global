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
  requiredFields?: Array<{ fieldName: string; label: string; fieldType?: string; required?: boolean; options?: string[] }>;
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
        <div key={field.fieldName}>
          <Label htmlFor={`field-${field.fieldName}`}>
            {field.label} {field.required && <span className="text-destructive">*</span>}
          </Label>
          
          {field.options ? (
            <Select
              value={formData.credentials[field.fieldName] || ''}
              onValueChange={(value) => onChange({
                ...formData,
                credentials: { ...formData.credentials, [field.fieldName]: value }
              })}
            >
              <SelectTrigger data-testid={`select-${field.fieldName}`}>
                <SelectValue placeholder={`Selecione ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.fieldName === 'country' ? (
                  <>
                    <SelectItem value="spain" data-testid="select-option-country-spain">🇪🇸 Espanha</SelectItem>
                    <SelectItem value="portugal" data-testid="select-option-country-portugal">🇵🇹 Portugal</SelectItem>
                    <SelectItem value="italy" data-testid="select-option-country-italy">🇮🇹 Itália</SelectItem>
                    <SelectItem value="poland" data-testid="select-option-country-poland">🇵🇱 Polônia</SelectItem>
                    <SelectItem value="slovakia" data-testid="select-option-country-slovakia">🇸🇰 Eslováquia</SelectItem>
                    <SelectItem value="czechrepublic" data-testid="select-option-country-czechrepublic">🇨🇿 República Tcheca</SelectItem>
                    <SelectItem value="romania" data-testid="select-option-country-romania">🇷🇴 Romênia</SelectItem>
                    <SelectItem value="bulgaria" data-testid="select-option-country-bulgaria">🇧🇬 Bulgária</SelectItem>
                    <SelectItem value="greece" data-testid="select-option-country-greece">🇬🇷 Grécia</SelectItem>
                    <SelectItem value="hungary" data-testid="select-option-country-hungary">🇭🇺 Hungria</SelectItem>
                    <SelectItem value="slovenia" data-testid="select-option-country-slovenia">🇸🇮 Eslovênia</SelectItem>
                    <SelectItem value="croatia" data-testid="select-option-country-croatia">🇭🇷 Croácia</SelectItem>
                    <SelectItem value="austria" data-testid="select-option-country-austria">🇦🇹 Áustria</SelectItem>
                    <SelectItem value="germany" data-testid="select-option-country-germany">🇩🇪 Alemanha</SelectItem>
                    <SelectItem value="france" data-testid="select-option-country-france">🇫🇷 França</SelectItem>
                    <SelectItem value="belgium" data-testid="select-option-country-belgium">🇧🇪 Bélgica</SelectItem>
                    <SelectItem value="netherlands" data-testid="select-option-country-netherlands">🇳🇱 Holanda</SelectItem>
                  </>
                ) : (
                  field.options.map((option) => (
                    <SelectItem key={option} value={option} data-testid={`select-option-${field.fieldName}-${option}`}>
                      {option}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={`field-${field.fieldName}`}
              type={field.fieldType ?? 'text'}
              placeholder={`Digite ${field.label.toLowerCase()}`}
              value={formData.credentials[field.fieldName] || ''}
              onChange={(e) => onChange({
                ...formData,
                credentials: { ...formData.credentials, [field.fieldName]: e.target.value }
              })}
              data-testid={`input-${field.fieldName}`}
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
    { fieldName: 'email', label: 'Email FHB', fieldType: 'email', required: true },
    { fieldName: 'password', label: 'Senha FHB', fieldType: 'password', required: true }
  ];

  return <WarehouseIntegrationForm {...props} requiredFields={fhbFields} />;
}

export function EuropeanFulfillmentIntegrationForm(props: Omit<WarehouseFormProps, 'requiredFields'>) {
  const europeanFields = [
    { fieldName: 'email', label: 'Email European Fulfillment', fieldType: 'email', required: true },
    { fieldName: 'password', label: 'Senha European Fulfillment', fieldType: 'password', required: true },
    { 
      fieldName: 'country', 
      label: 'País', 
      fieldType: 'select', 
      required: true,
      options: ['spain', 'portugal', 'italy', 'poland', 'slovakia', 'czechrepublic', 'romania', 'bulgaria', 'greece', 'hungary', 'slovenia', 'croatia', 'austria', 'germany', 'france', 'belgium', 'netherlands']
    }
  ];

  return <WarehouseIntegrationForm {...props} requiredFields={europeanFields} />;
}

export function ElogyIntegrationForm(props: Omit<WarehouseFormProps, 'requiredFields'>) {
  const elogyFields = [
    { fieldName: 'email', label: 'Email eLogy', fieldType: 'email', required: true },
    { fieldName: 'password', label: 'Senha eLogy', fieldType: 'password', required: true },
    { fieldName: 'authHeader', label: 'Auth Header', fieldType: 'text', required: false },
    { fieldName: 'warehouseId', label: 'Warehouse ID', fieldType: 'text', required: false }
  ];

  return <WarehouseIntegrationForm {...props} requiredFields={elogyFields} />;
}
