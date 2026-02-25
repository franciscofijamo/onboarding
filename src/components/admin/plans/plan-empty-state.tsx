import { Package } from "lucide-react";

export function PlanEmptyState() {
  return (
    <div className="text-center py-16">
      <div className="max-w-md mx-auto">
        <div className="flex h-20 w-20 mx-auto mb-6 items-center justify-center rounded-full bg-primary/10">
          <Package className="h-10 w-10 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum plano configurado</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Use o botão acima para criar seu primeiro plano de assinatura.
        </p>
        <div className="space-y-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 justify-center">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">1</span>
            <span>Adicione um novo plano de assinatura</span>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">2</span>
            <span>Defina créditos, preços e recursos de cada plano</span>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">3</span>
            <span>Conecte o plano com Asaas ou M-Pesa para processar pagamentos</span>
          </div>
        </div>
      </div>
    </div>
  );
}
