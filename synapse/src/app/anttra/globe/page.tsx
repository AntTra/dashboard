'use client';

import * as React from 'react';
import Link from 'next/link';
import { Accordion } from '@base-ui-components/react/accordion';
import { Checkbox } from '@base-ui-components/react/checkbox';
import { CheckboxGroup } from '@base-ui-components/react/checkbox-group';
import CheckIcon from '@mui/icons-material/Check';
import Globe from './components/globe';

export default function GlobePage() {
  // Accordion state (single open)
  const [openValues, setOpenValues] = React.useState<string[]>(['earth']);
  const planet = (openValues[0] ?? 'earth') as 'earth' | 'saturn' | 'trondheim';

  // Earth options state via CheckboxGroup
  const [earthOpts, setEarthOpts] = React.useState<string[]>(['clouds']);
  const clouds = earthOpts.includes('clouds');
  const night = earthOpts.includes('night');
  const moon = earthOpts.includes('moon');

  return (
    <div className="w-full h-screen flex flex-col md:flex-row">
      <div className="flex-shrink-0 border-b md:border-b-0 md:border-r border-zinc-800 p-3 md:w-64 overflow-y-auto max-h-[40vh] md:max-h-none">
        <Link href="/anttra" className="block mb-3 font-mono text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ← anttra
        </Link>
        <Accordion.Root
          value={openValues}
          onValueChange={(vals) => setOpenValues(vals ?? [])}
          orientation="vertical"
          className="space-y-2"
        >
          <Accordion.Item value="earth" className="border-b border-zinc-800 pb-2">
            <Accordion.Header>
              <Accordion.Trigger className="w-full px-3 py-2 text-left hover:bg-zinc-800 rounded">
                Earth
              </Accordion.Trigger>
            </Accordion.Header>

            <Accordion.Panel className="px-2 py-2">
              <CheckboxGroup
                aria-labelledby="earth-options"
                value={earthOpts}
                onValueChange={(vals) => setEarthOpts(vals as string[])}
                className="grid grid-cols-1 gap-[0.25rem]"
              >
                {/* Clouds */}
                <div className="flex items-center gap-2">
                  <Checkbox.Root
                    id="opt-clouds"
                    value="clouds"
                    className="
                      inline-flex items-center justify-center
                      w-5 h-5 rounded border-2 border-zinc-500
                      bg-transparent data-[state=checked]:bg-zinc-800
                      data-[state=checked]:border-zinc-300
                      outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60
                    "
                  >
                    <Checkbox.Indicator className="text-zinc-200">
                      <CheckIcon className="w-3 h-3"/>
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  <label className="cursor-pointer select-none text-sm text-zinc-300">
                    Clouds
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox.Root
                    id="opt-night"
                    value="night"
                    className="
                      inline-flex items-center justify-center
                      w-5 h-5 rounded border-2 border-zinc-500
                      bg-transparent data-[state=checked]:bg-zinc-800
                      data-[state=checked]:border-zinc-300
                      outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60
                    "
                  >
                    <Checkbox.Indicator className="text-zinc-200">
                      <CheckIcon className="w-3 h-3" />
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  <label htmlFor="opt-night" className="cursor-pointer select-none text-sm text-zinc-300">
                    Night
                  </label>
                </div>

                {/* Moon */}
                <div className="flex items-center gap-2">
                  <Checkbox.Root
                    id="opt-moon"
                    value="moon"
                    className="
                      inline-flex items-center justify-center
                      w-5 h-5 rounded border-2 border-zinc-500
                      bg-transparent data-[state=checked]:bg-zinc-800
                      data-[state=checked]:border-zinc-300
                      outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60
                    "
                  >
                    <Checkbox.Indicator className="text-zinc-200">
                      <CheckIcon className="w-3 h-3" />
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  <label htmlFor="opt-moon" className="cursor-pointer select-none text-sm text-zinc-300">
                    Moon
                  </label>
                </div>
              </CheckboxGroup>
            </Accordion.Panel>
          </Accordion.Item>

          {/* SATURN */}
          <Accordion.Item value="saturn" className="border-b border-zinc-800 pb-2">
            <Accordion.Header>
              <Accordion.Trigger className="w-full px-3 py-2 text-left hover:bg-zinc-800 rounded">
                Saturn
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel className="px-3 py-2 text-sm text-zinc-400">
              
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion.Root>
      </div>

      {/* Viewer */}
      <div className="flex-1 min-h-0 min-w-0">
        <Globe      
          mode={planet}
          clouds={clouds}              
          night={night}
          moon={moon}
        />
      </div>
    </div>
  );
}