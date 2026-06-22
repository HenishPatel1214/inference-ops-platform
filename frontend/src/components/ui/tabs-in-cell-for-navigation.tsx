import type { LucideIcon } from "lucide-react";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type NavigationTab<TValue extends string> = {
  value: TValue;
  label: string;
  icon: LucideIcon;
};

type TabsInCellForNavigationProps<TValue extends string> = {
  value: TValue;
  tabs: NavigationTab<TValue>[];
  onValueChange: (value: TValue) => void;
  className?: string;
  ariaLabel?: string;
};

function TabsInCellForNavigation<TValue extends string>({
  value,
  tabs,
  onValueChange,
  className,
  ariaLabel = "Primary navigation"
}: TabsInCellForNavigationProps<TValue>) {
  return (
    <Tabs value={value} onValueChange={(nextValue) => onValueChange(nextValue as TValue)} className={className}>
      <ScrollArea aria-label={ariaLabel}>
        <TabsList className="mb-0 h-auto -space-x-px bg-background p-0 shadow-sm shadow-black/5 rtl:space-x-reverse">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "relative h-9 overflow-hidden rounded-none border border-border px-3 py-2",
                  "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5",
                  "first:rounded-s-md last:rounded-e-md",
                  "data-[state=active]:bg-muted data-[state=active]:after:bg-primary"
                )}
              >
                <Icon
                  className="-ms-0.5 me-1.5 opacity-60"
                  size={16}
                  strokeWidth={2}
                  aria-hidden
                />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </Tabs>
  );
}

export { TabsInCellForNavigation };
