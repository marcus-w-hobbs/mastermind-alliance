// PersonaSelector.tsx
'use client';
import React from 'react';
import { getPersonaCategories, getPersonasByCategory, PersonaMetadata } from '@/lib/personas/personas-registry';

export const PersonaSelector = ({ onSelect }: { onSelect: (personaId: string) => void }) => {
  const categories = getPersonaCategories();
  
  return (
    <div>
      <h3>Select a Persona</h3>
      <select onChange={(e) => onSelect(e.target.value)}>
        <option value="">-- Select Personas --</option>
        {categories.map(category => (
          <optgroup key={category} label={category}>
            {getPersonasByCategory(category).map((persona: PersonaMetadata) => (
              <option key={persona.id} value={persona.id}>
                {persona.name} - {persona.description}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
};
