import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cepError,
  documentError,
  lookupCep,
  maskCep,
  maskDocument,
  onlyDigits,
} from "@/lib/br-validators";

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-xs font-medium text-destructive">{message}</p>;
}

/** Campo de CPF/CNPJ com máscara automática e validação dos dígitos verificadores. */
export function DocumentField({
  id = "document",
  name = "document",
  label = "CNPJ ou CPF",
  defaultValue = "",
}: {
  id?: string;
  name?: string;
  label?: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(maskDocument(defaultValue));
  const [touched, setTouched] = useState(false);
  const error = touched ? documentError(value) : null;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        value={value}
        required
        inputMode="numeric"
        autoComplete="off"
        placeholder="000.000.000-00 ou 00.000.000/0001-00"
        aria-invalid={error ? true : undefined}
        onChange={(e) => {
          setValue(maskDocument(e.target.value));
          if (onlyDigits(e.target.value).length >= 11) setTouched(true);
        }}
        onBlur={() => setTouched(true)}
      />
      <FieldError message={error} />
    </div>
  );
}

export type AddressDefaults = {
  zip?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
};

/**
 * Bloco de endereço com CEP obrigatório, máscara 00000-000 e busca automática
 * no ViaCEP preenchendo rua, bairro, cidade e UF.
 */
export function AddressFields({ defaults = {}, idPrefix = "a" }: { defaults?: AddressDefaults; idPrefix?: string }) {
  const [zip, setZip] = useState(maskCep(defaults.zip ?? ""));
  const [address, setAddress] = useState(defaults.address ?? "");
  const [neighborhood, setNeighborhood] = useState(defaults.neighborhood ?? "");
  const [city, setCity] = useState(defaults.city ?? "");
  const [state, setState] = useState(defaults.state ?? "");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);

  const error = touched ? cepError(zip) : null;

  async function handleZipChange(raw: string) {
    const masked = maskCep(raw);
    setZip(masked);
    setLookupMessage(null);
    const digits = onlyDigits(masked);
    if (digits.length !== 8) return;
    setTouched(true);
    setLoading(true);
    try {
      const found = await lookupCep(digits);
      if (!found) {
        setLookupMessage("CEP não encontrado. Confira o número ou preencha o endereço manualmente.");
        return;
      }
      if (found.street) setAddress(found.street);
      setNeighborhood(found.neighborhood);
      setCity(found.city);
      setState(found.state);
    } catch {
      setLookupMessage("Não conseguimos consultar o CEP agora. Preencha o endereço manualmente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-zip`}>CEP</Label>
        <div className="relative">
          <Input
            id={`${idPrefix}-zip`}
            name="zip"
            value={zip}
            required
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            aria-invalid={error ? true : undefined}
            onChange={(e) => void handleZipChange(e.target.value)}
            onBlur={() => setTouched(true)}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        <FieldError message={error} />
        {!error && lookupMessage && <p className="text-xs font-medium text-warning">{lookupMessage}</p>}
        {!error && !lookupMessage && (
          <p className="text-xs text-muted-foreground">Preenchemos o endereço automaticamente.</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-neighborhood`}>Bairro</Label>
        <Input
          id={`${idPrefix}-neighborhood`}
          name="neighborhood"
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-address`}>Rua e número</Label>
        <Input
          id={`${idPrefix}-address`}
          name="address"
          value={address}
          placeholder="Rua, número e complemento"
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-city`}>Cidade</Label>
        <Input id={`${idPrefix}-city`} name="city" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-state`}>UF</Label>
        <Input
          id={`${idPrefix}-state`}
          name="state"
          value={state}
          maxLength={2}
          onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
        />
      </div>
    </div>
  );
}
