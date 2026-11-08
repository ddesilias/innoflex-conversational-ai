'use client'

import * as React from 'react'
import Textarea from 'react-textarea-autosize'

import { useActions, useUIState } from '@ai-sdk/rsc'

import { UserMessage } from './stocks/message'
import { type AI } from '@/lib/chat/actions'
import { Button } from '@/components/ui/button'
import { IconArrowElbow, IconPlus } from '@/components/ui/icons'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useEnterSubmit } from '@/lib/hooks/use-enter-submit'
import { nanoid } from 'nanoid'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import useSpeechRecognition from '../lib/hooks/use-speech-reconition'
import useMicrophonePermissions from '../lib/hooks/use-microphone-permissions'

export function PromptForm({
  input,
  setInput
}: {
  input: string
  setInput: (value: string) => void
}) {
  const router = useRouter()
  const { formRef, onKeyDown } = useEnterSubmit()
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const { submitUserMessage } = useActions()
  const [_, setMessages] = useUIState<typeof AI>()
   const { transcript, isListening, startListening, stopListening, error } =
     useSpeechRecognition()
   const { permissionState, requestPermission } = useMicrophonePermissions()
  const [messages_voice, setMessages_voice] = useState<string[]>([])
  
    useEffect(() => {
      if (permissionState === 'granted' && !isListening) {
        startListening()
      }
    }, [permissionState, isListening, startListening])

    useEffect(() => {
      if (!isListening && transcript) {
        handleSendMessage(transcript)
      }
    }, [isListening, transcript])

    const handleSendMessage = (message: string) => {
      setMessages_voice([...messages_voice, message])
      // Envoyer le message au chatbot et récupérer la réponse
    }

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  if (permissionState === 'denied') {
    return (
      <div className="p-4">
        <p className="text-red-500">
          L&apos;accès au microphone a été refusé. Veuillez accorder
          l&apos;accès dans les paramètres de votre navigateur.
        </p>
      </div>
    )
  }
  return (
    <form
      ref={formRef}
      onSubmit={async (e: any) => {
        e.preventDefault()

        // Blur focus on mobile
        if (window.innerWidth < 600) {
          e.target['message']?.blur()
        }

        const value = input.trim()
        setInput('')
        if (!value) return

        // Optimistically add user message UI
        setMessages(currentMessages => [
          ...currentMessages,
          {
            id: nanoid(),
            display: <UserMessage>{value}</UserMessage>
          }
        ])

        // Submit and get response message
        const responseMessage = await submitUserMessage(value)
        setMessages(currentMessages => [...currentMessages, responseMessage])
      }}
    >
      <div className="relative flex max-h-60 w-full grow flex-col overflow-hidden bg-background px-8 sm:rounded-md sm:border sm:px-12">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="absolute left-0 top-[14px] size-8 rounded-full bg-background p-0 sm:left-4"
              onClick={() => {
                router.push('/new')
              }}
            >
              <IconPlus />
              <span className="sr-only">New Chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Chat</TooltipContent>
        </Tooltip>
        <Textarea
          ref={inputRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          placeholder="Send a message."
          className="min-h-[60px] w-full resize-none bg-transparent px-4 py-[1.3rem] focus-within:outline-none sm:text-sm"
          autoFocus
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          name="message"
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <div className="absolute right-0 top-[13px] sm:right-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="submit" size="icon" disabled={input === ''}>
                <IconArrowElbow />
                <span className="sr-only">Send message</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Send message</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="p-4">
        {permissionState === 'prompt' && (
          <div className="mb-4">
            <button
              onClick={requestPermission}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Autoriser l&apos;accès au microphone
            </button>
          </div>
        )}
        {permissionState === 'granted' && (
          <>
            <div className="mb-4">
              <button
                onClick={isListening ? stopListening : startListening}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                {isListening ? 'Arrêter' : 'Parler'}
              </button>
              {error && <p className="text-red-500">{error}</p>}
            </div>
            <div className="bg-gray-100 p-4 rounded-lg shadow-lg">
              {messages_voice.map((msg, index) => (
                <p key={index} className="mb-2">
                  {msg}
                </p>
              ))}
            </div>
            <div className="mt-4">
              <h3>Transcript en temps réel:</h3>
              <p>{transcript}</p>
            </div>
          </>
        )}
      </div>
    </form>
  )
}
