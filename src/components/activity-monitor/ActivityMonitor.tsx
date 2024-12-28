import { FC } from 'react';
import { Card } from "@nextui-org/react";

export const ActivityMonitor: FC = () => {
  return (
    <Card className="fixed bottom-4 right-4 p-4 w-96">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold">Activity Monitor</h3>
        {/* Add activity monitoring content here */}
      </div>
    </Card>
  );
}; 