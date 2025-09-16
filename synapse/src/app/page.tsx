'use client';

import * as React from 'react';
import {Accordion} from '@base-ui-components/react/accordion';
import Globe from './components/globe';

export default function Page() {
  // Accordion expects an array for value
  const [openValues, setOpenValues] = React.useState<string[]>(['earth']);

  // Use the first open item as the selected planet
  const planet = (openValues[0] ?? 'earth') as 'earth' | 'saturn';

  return (
    <div className="w-full h-screen flex">
      {/* Left menu */}
      <div className="w-56 border-r border-zinc-800 p-2">
        <Accordion.Root
          value={openValues}
          onValueChange={(vals) => setOpenValues((vals as string[]) ?? [])}
          openMultiple={false}                    // single selection behavior
          orientation="vertical"
          className="space-y-1"
        >
          <Accordion.Item value="earth" className="border-b border-zinc-800">
            <Accordion.Header>
              <Accordion.Trigger className="w-full px-3 py-2 text-left hover:bg-zinc-800 rounded">
                Earth
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel className="px-3 py-2 text-sm text-zinc-400">
              Our home planet 
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="saturn" className="border-b border-zinc-800">
            <Accordion.Header>
              <Accordion.Trigger className="w-full px-3 py-2 text-left hover:bg-zinc-800 rounded">
                Saturn
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel className="px-3 py-2 text-sm text-zinc-400">
              The ringed giant 
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion.Root>
      </div>

      {/* Viewer */}
      <div className="flex-1 min-h-0">
        <Globe mode={planet} />
      </div>
    </div>
  );
}