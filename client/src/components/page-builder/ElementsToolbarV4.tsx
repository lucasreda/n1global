import { PageNodeV4 } from '@shared/schema';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ElementsTab } from './ElementsTab';
import { LayoutsTab } from './LayoutsTab';
import { Layers, LayoutTemplate } from 'lucide-react';

interface ElementsToolbarV4Props {
  onInsertElement: (node: PageNodeV4) => void;
}

export function ElementsToolbarV4({ onInsertElement }: ElementsToolbarV4Props) {
  return (
    <div className="w-full h-full flex flex-col bg-background border-r" data-testid="elements-toolbar">
      <Tabs defaultValue="elements" className="w-full h-full flex flex-col">
        <div className="border-b px-3 pt-3 pb-0">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="elements" className="gap-2" data-testid="tab-elements">
              <Layers className="w-4 h-4" />
              <span>Elementos</span>
            </TabsTrigger>
            <TabsTrigger value="layouts" className="gap-2" data-testid="tab-layouts">
              <LayoutTemplate className="w-4 h-4" />
              <span>Layouts</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="elements" className="flex-1 m-0 overflow-hidden">
          <ElementsTab />
        </TabsContent>

        <TabsContent value="layouts" className="flex-1 m-0 overflow-hidden">
          <LayoutsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
