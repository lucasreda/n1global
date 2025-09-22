import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Sparkles, ArrowRight } from "lucide-react";

interface PageCreationOptionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectBlankPage: () => void;
  onSelectAIPage: () => void;
}

export function PageCreationOptionsModal({ 
  open, 
  onOpenChange, 
  onSelectBlankPage, 
  onSelectAIPage 
}: PageCreationOptionsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Como você quer criar sua página?</DialogTitle>
          <DialogDescription>
            Escolha uma das opções abaixo para começar a criar sua nova página
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
          {/* Página em Branco */}
          <Card 
            className="cursor-pointer transition-all hover:border-blue-500 hover:bg-blue-950/10 group"
            onClick={onSelectBlankPage}
            data-testid="card-blank-page"
          >
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                <FileText className="w-8 h-8 text-gray-300 group-hover:text-white" />
              </div>
              <CardTitle className="text-lg">Página em Branco</CardTitle>
              <CardDescription>
                Comece do zero e crie sua página usando nosso editor visual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-400 mb-4">
                <li>• Editor visual intuitivo</li>
                <li>• Controle total sobre o design</li>
                <li>• Templates pré-definidos disponíveis</li>
                <li>• Ideal para designers experientes</li>
              </ul>
              <Button 
                className="w-full group-hover:bg-blue-600 group-hover:text-white transition-colors"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectBlankPage();
                }}
              >
                Escolher
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Criar com IA */}
          <Card 
            className="cursor-pointer transition-all hover:border-purple-500 hover:bg-purple-950/10 group"
            onClick={onSelectAIPage}
            data-testid="card-ai-page"
          >
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                <Sparkles className="w-8 h-8 text-gray-300 group-hover:text-white" />
              </div>
              <CardTitle className="text-lg">Criar com IA</CardTitle>
              <CardDescription>
                Deixe nossa IA criar uma página otimizada para você
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-400 mb-4">
                <li>• Geração automática de conteúdo</li>
                <li>• Design otimizado para conversão</li>
                <li>• Baseado em boas práticas de marketing</li>
                <li>• Ideal para resultados rápidos</li>
              </ul>
              <Button 
                className="w-full group-hover:bg-purple-600 group-hover:text-white transition-colors"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAIPage();
                }}
              >
                Escolher
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="text-gray-400"
            data-testid="button-cancel-options"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}