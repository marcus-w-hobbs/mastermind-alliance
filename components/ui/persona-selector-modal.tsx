"use client"

import { useState, useEffect } from "react"
import { Check, Search, X } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"

interface PersonaSelectorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedPersonas: string[]
  onSelect: (personaId: string) => void
  getDefaultPersonaId: () => string
  getPersonaCategories: () => string[]
  getPersonasByCategory: (category: string) => Array<{
    id: string
    name: string
    description?: string
  }>
  isMastermind?: boolean
}

export function PersonaSelectorModal({
  open,
  onOpenChange,
  selectedPersonas,
  onSelect,
  getDefaultPersonaId,
  getPersonaCategories,
  getPersonasByCategory,
  isMastermind = false
}: PersonaSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // Filter personas based on search query
  const filterPersonas = (personas: Array<{ id: string; name: string; description?: string }>) => {
    if (!searchQuery) return personas
    return personas.filter(persona => 
      persona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      persona.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false)
      }
    }

    if (open) {
      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, onOpenChange])

  const title = isMastermind ? "Selected Personas" : "Selected Persona"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-7xl !w-[95vw] h-full max-h-[90vh] bg-black/90 backdrop-blur-sm border-gray-800 p-0 [&_button.absolute]:!hidden sm:!max-w-7xl">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between p-6 pb-4 border-b border-gray-800">
          <DialogTitle className="text-xl font-semibold text-white">
            {title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isMastermind ? "Select multiple personas for your conversation" : "Select a persona for your conversation"}
          </DialogDescription>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Selected Avatars Swim Lane */}
          <div className="px-6 py-4 border-b border-gray-800">
            <div className="flex gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {selectedPersonas.map((personaId) => {
                const persona = personaId === getDefaultPersonaId() 
                  ? { id: getDefaultPersonaId(), name: "Default Assistant" }
                  : getPersonaCategories()
                      .flatMap(cat => getPersonasByCategory(cat))
                      .find(p => p.id === personaId) || { id: personaId, name: personaId };
                
                return (
                  <div key={personaId} className="flex flex-col items-center flex-shrink-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden mb-1">
                      <Image
                        src={`/avatars/${personaId}.png`}
                        alt={persona.name}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (selectedPersonas.length === 1) {
                          // Don't allow deselecting the last persona - switch to default
                          onSelect(getDefaultPersonaId());
                        } else {
                          // Deselect this persona
                          onSelect(personaId);
                        }
                      }}
                      className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors"
                    >
                      <Check className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Search Box */}
          <div className="p-6 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search personas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:border-gray-600"
              />
            </div>
          </div>

          {/* Scrolling Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {/* Show "No personas found" only when search query exists and no results */}
            {searchQuery && (
              (() => {
                const defaultMatches = searchQuery ? 
                  ("Default Assistant".toLowerCase().includes(searchQuery.toLowerCase()) || 
                   "A general-purpose AI assistant".toLowerCase().includes(searchQuery.toLowerCase())) : true;
                
                const categoryMatches = getPersonaCategories().some(category => 
                  filterPersonas(getPersonasByCategory(category)).length > 0
                );
                
                return !defaultMatches && !categoryMatches ? (
                  <div className="text-gray-400 text-center py-8">
                    No personas found.
                  </div>
                ) : null;
              })()
            )}

            {/* Default Assistant */}
            {(() => {
              const defaultMatches = !searchQuery || 
                "Default Assistant".toLowerCase().includes(searchQuery.toLowerCase()) || 
                "A general-purpose AI assistant".toLowerCase().includes(searchQuery.toLowerCase());
              
              return defaultMatches ? (
                <div className="mb-8">
                  <h3 className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm text-sm font-medium text-gray-400 mb-4 py-2 uppercase tracking-wider">
                    Default
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div
                      onClick={() => onSelect(getDefaultPersonaId())}
                      className="flex flex-col items-center p-4 border border-gray-700 rounded-lg cursor-pointer hover:border-gray-600 hover:bg-gray-900/50 transition-colors relative"
                    >
                      {selectedPersonas.includes(getDefaultPersonaId()) && (
                        <div className="absolute top-2 right-2">
                          <div className="bg-green-500 rounded-lg p-1">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        </div>
                      )}
                      <div className="h-16 w-16 mb-3 overflow-hidden rounded-lg">
                        <Image
                          src={`/avatars/${getDefaultPersonaId()}.png`}
                          alt="Default Assistant"
                          width={64}
                          height={64}
                          className="aspect-square size-full object-cover"
                        />
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-white mb-1">Default Assistant</div>
                        <div className="text-xs text-gray-400 text-left">
                          A general-purpose AI assistant
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            {/* Categories */}
                {getPersonaCategories().map((category) => {
                  const personas = filterPersonas(getPersonasByCategory(category))
                  if (personas.length === 0) return null

                  return (
                    <div key={category} className="mb-8">
                      <h3 className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm text-sm font-medium text-gray-400 mb-4 py-2 uppercase tracking-wider">
                        {category}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {personas.map((persona) => (
                          <div
                            key={persona.id}
                            onClick={() => onSelect(persona.id)}
                            className="flex flex-col items-center p-4 border border-gray-700 rounded-lg cursor-pointer hover:border-gray-600 hover:bg-gray-900/50 transition-colors relative"
                          >
                            {selectedPersonas.includes(persona.id) && (
                              <div className="absolute top-2 right-2">
                                <div className="bg-green-500 rounded-lg p-1">
                                  <Check className="h-3 w-3 text-white" />
                                </div>
                              </div>
                            )}
                            <div className="h-16 w-16 mb-3 overflow-hidden rounded-lg">
                              <Image
                                src={`/avatars/${persona.id}.png`}
                                alt={persona.name}
                                width={64}
                                height={64}
                                className="aspect-square size-full object-cover"
                              />
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-white mb-1">{persona.name}</div>
                              {persona.description && (
                                <div className="text-xs text-gray-400 text-left">
                                  {persona.description}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}