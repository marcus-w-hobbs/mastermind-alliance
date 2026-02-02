'use client';

import React from 'react';
import { useState } from 'react';
import { useColorPalette } from '@/lib/color-generation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * Simple test component to verify the color generation integration works
 */
export function TestColorIntegration() {
  const [testResult, setTestResult] = useState<string>('');
  
  const { colors, generateNewPalette, settings } = useColorPalette({
    generatorFunction: 'Legacy',
    amount: 5,
    colorMode: 'hsluv'
  });
  
  const runTest = () => {
    try {
      generateNewPalette();
      setTestResult(`✅ Success! Generated ${colors.length} colors: ${colors.join(', ')}`);
    } catch (error) {
      setTestResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  return (
    <Card className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">Color Generation Test</h3>
      
      <div className="flex gap-2">
        {colors.map((color, i) => (
          <div
            key={i}
            className="w-12 h-12 rounded border"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
      
      <Button onClick={runTest}>Test Color Generation</Button>
      
      {testResult && (
        <div className="text-sm font-mono bg-muted p-2 rounded">
          {testResult}
        </div>
      )}
      
      <div className="text-xs text-muted-foreground">
        Current settings: {settings.generatorFunction} | {settings.colorMode} | {settings.amount} colors
      </div>
    </Card>
  );
}